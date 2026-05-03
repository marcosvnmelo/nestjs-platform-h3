import type { Result } from 'autocannon';
import autocannon from 'autocannon';

export function runAutocannon(
  url: autocannon.Options['url'],
  options: Omit<autocannon.Options, 'url'>,
): Promise<Result> {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
  });
}
