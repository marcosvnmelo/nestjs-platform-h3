# H3 Response Pipeline Optimization

**Date:** April 9, 2026
**Version:** 11.1.18-1

## Background

The Nest H3 adapter had a **~28.7% throughput overhead** compared to pure H3 (measured via autocannon at 100 connections, 10 s duration). This was significantly worse than the Express (~3%) and Fastify (~12%) NestJS adapters.

Several micro-optimizations were attempted first (non-async `invokeHandler`, pre-wrapped `fromNodeHandler`, single-handler fast path, body parser method guards). None of them moved the needle because the dominant overhead was structural, not algorithmic.

## Root Cause

The original adapter called `res.end(body)` directly from `reply()`, `end()`, and `redirect()`. This caused **double work** on every request:

1. Our `res.end(body)` → flushes the response
2. The adapter returned `kHandled` to H3
3. H3's `prepareResponse(kHandled)` created `new FastResponse(null)`
4. srvx's `sendNodeResponse()` called `writeHead()` (no-op, headers already sent) then `endNodeResponse()` → `new Promise(resolve => nodeRes.end(resolve))` (no-op, already ended)

The second srvx pass was pure overhead on every single request: a redundant `Promise` allocation, a `writeHead` call, and a no-op `nodeRes.end`.

## Solution

Instead of calling `res.end()` directly, `reply()`, `end()`, and `redirect()` now **capture** the response body. After the NestJS handler completes, `invokeHandler()` builds an `HTTPResponse` from the captured body and returns it to H3. H3's pipeline (via srvx's `sendNodeResponse`) then performs a single `writeHead` + `write` + `end` pass — eliminating the redundant second pass entirely.

### Response capture mechanism

A sentinel value `kNoBody` is stored on the response object at the start of each `invokeHandler` call as `res.__h3Body = kNoBody`. The `reply()`, `end()`, and `redirect()` methods check for this sentinel:

- If active (capture mode): store the body as a `Buffer` in `res.__h3Body` and return without calling `res.end()`
- If not active (e.g. called from an error handler outside of `invokeHandler`): fall through to the original `res.end()` behaviour

After the handler promise resolves, `invokeHandler` checks `res.__h3Body`:

- `!== kNoBody` → body was captured → return `new HTTPResponse(capturedBody, statusCode)` through H3's pipeline
- `res.writableEnded` → response was sent directly (stream, `@Res()` decorator) → return `kHandled`
- otherwise → wait for the `finish` event (rare edge case)

### Custom lightweight HTTPResponse

A local `HTTPResponse` class is used rather than importing the one from `h3`:

```typescript
class HTTPResponse {
  body: Buffer | null;
  status: number;
  headers: undefined = undefined;

  constructor(body: Buffer | null, status: number) {
    this.body = body;
    this.status = status;
  }
}
```

Key design decisions:

- **Named `HTTPResponse`** — H3's `prepareResponseBody` recognises it via `val?.constructor?.name === "HTTPResponse"` and returns it as-is, skipping all type inference.
- **`headers = undefined`** — The real h3 `HTTPResponse` has a lazy `get headers()` that allocates a `new Headers()` object on first access. Since H3 reads `preparedResponse.headers`, a plain `undefined` avoids this allocation on every request.
- **Body as `Buffer`** — srvx's `FastResponse._toNodeResponse()` adds `content-type: text/plain` when the body is a string, which would override NestJS's `Content-Type` header. Using a `Buffer` (a `Uint8Array`) skips that inference — only `content-length` is appended, leaving NestJS's headers intact.

### Header deduplication

Middleware (e.g. CORS) sets headers on `event.res.headers`. The adapter copies these to `nodeRes.setHeader()` as before, but then **clears** them from `event.res.headers`. This prevents H3's `prepareResponse` from picking them up a second time and duplicating them in the srvx `writeHead` call.

### Fallback paths preserved

- **StreamableFile**: `reply()` detects `instanceof StreamableFile` before the capture check and pipes the stream directly to `res`. `invokeHandler` detects `res.writableEnded` and returns `kHandled`.
- **`@Res()` / direct response**: If a controller uses `@Res()` and calls `res.end()` directly, `invokeHandler` detects `res.writableEnded` and returns `kHandled`.
- **Error handlers / outside invoke context**: `reply()` falls through to `res.end()` when `res.__h3Body !== kNoBody` (capture sentinel not set).

## Results

Benchmarked with autocannon (100 connections, 10 s, 1 pipeline) on a `GET /hello` → `'ok'` workload:

| Framework           | req/s      | Delta vs pure |
| ------------------- | ---------- | ------------- |
| Pure Express        | 32,997     | —             |
| Nest Express        | 31,102     | -5.74%        |
| Pure Fastify        | 54,979     | —             |
| Nest Fastify        | 48,170     | -12.39%       |
| Pure H3             | 52,054     | —             |
| **Nest H3 Adapter** | **44,285** | **-14.93%**   |

**Before this change:** ~28.7% overhead
**After this change:** ~15% overhead

The Nest H3 adapter overhead is now in line with Nest Fastify (~12%), well within the expected range for a framework adapter layer.

## Files Changed

- `src/adapters/h3-adapter.ts`
  - Added `kNoBody` sentinel and local `HTTPResponse` class
  - `reply()` — captures body to `res.__h3Body` when in invoke context
  - `end()` — captures body/null to `res.__h3Body` when in invoke context
  - `redirect()` — captures null body to `res.__h3Body` when in invoke context
  - `render()` — captures body to `res.__h3Body` when in invoke context
  - `executeHandler()` — updated return type; clears `event.res.headers` after copying to `nodeRes`
  - `invokeHandler()` — sets capture sentinel, returns `HTTPResponse` for captured bodies
  - `registerRoute()` — returns the full result (HTTPResponse or kHandled) from `executeHandler` instead of always returning `kHandled`
  - `setNotFoundHandler()` — returns result from `invokeHandler` rather than always returning `kHandled`
