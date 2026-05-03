export const GET_PATH = '/hello';
export const POST_PATH = '/all/hello?hello=world';

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
