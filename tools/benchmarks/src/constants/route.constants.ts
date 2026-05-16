export const GET_PATH = '/hello';
export const POST_PATH = '/all/hello?hello=world';
export const REST_METHODS = ['GET', 'POST'] as const;
export type RestMethod = (typeof REST_METHODS)[number];

export const GET_REQUEST_OPTIONS = {
  method: 'GET',
} as const satisfies RequestInit;

export const POST_REQUEST_OPTIONS = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    hello: 'world',
  }),
} as const satisfies RequestInit;

export function parseRestMethod(value: string): RestMethod {
  const normalized = value.toUpperCase();
  if (normalized === 'GET' || normalized === 'POST') {
    return normalized;
  }

  throw new Error(
    `Invalid --rest-method=${value}. Expected one of: ${REST_METHODS.join(', ')}`,
  );
}

export function requestOptionsFor(method: RestMethod) {
  return method === 'GET' ? GET_REQUEST_OPTIONS : POST_REQUEST_OPTIONS;
}
