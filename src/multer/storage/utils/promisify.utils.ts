type Callback<E, T> = (error: E, result?: T) => void;

export function promisify<
  E = Error | null,
  T = void,
  TArgs extends any[] = any[],
>(
  fn: (...args: [...TArgs, Callback<E, T>]) => void,
  ...args: TArgs
): Promise<[NonNullable<E>, null] | [null, T]> {
  return new Promise((resolve) => {
    fn(...args, (err: any, result: any) => {
      if (err) resolve([err, null]);

      resolve([null, result]);
    });
  });
}
