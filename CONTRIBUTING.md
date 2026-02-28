# Contributing

Thanks for contributing to `@marcosvnmelo/nestjs-platform-h3`.

## Prerequisites

- Node.js 20+
- `pnpm` (workspace uses `pnpm-workspace.yaml`)

## Setup

```bash
pnpm install
```

## Development workflow

### Build

```bash
pnpm run build
```

### Watch mode

```bash
pnpm run dev
```

### Type check

```bash
pnpm run typecheck
pnpm run typecheck:workspace
```

### Tests

```bash
pnpm run test
pnpm run test:watch
```

### Lint and format

```bash
pnpm run lint
pnpm run lint:fix
pnpm run format
```

### Benchmark

```bash
pnpm run benchmark
```

## What to include in a pull request

- A clear description of the change and motivation
- Tests for behavior changes (new tests or updated tests under `tests/`)
- Passing checks locally:
  - `pnpm run build`
  - `pnpm run test`
  - `pnpm run lint`

## Code guidelines

- Keep changes focused and minimal
- Prefer fixing root causes over workarounds
- Follow existing style and naming conventions
- Avoid unrelated refactors in the same PR
- Preserve public API compatibility unless the PR explicitly targets a breaking change

## Commit guidance

Use clear commit messages in imperative form, for example:

- `fix: handle multipart limits in FileInterceptor`
- `test: add coverage for http2 cleartext startup`
- `docs: improve README upload examples`

## Reporting issues

When opening an issue, include:

- Node.js version
- Package version
- Minimal reproduction (repo or snippet)
- Expected behavior vs actual behavior
- Relevant logs or stack traces

## Security

If you discover a security issue, please do not publish it publicly first. Open a private report to the maintainer with reproduction details and impact assessment.
