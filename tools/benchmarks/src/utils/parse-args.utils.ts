type ArgType = string | number | boolean;

export interface Arg<T extends ArgType> {
  raw: string;
  value: T;
}

export type OptionalArg<T extends ArgType | undefined> = T extends ArgType
  ? Arg<T>
  : {
      value: undefined;
    };

interface ArgParserOptions<T extends ArgType> {
  prefix: string;
  raw: string;
  value: T;
}

type OptionalArgParserOptions<T extends ArgType | undefined> = T extends ArgType
  ? ArgParserOptions<T>
  : {
      prefix: string;
      value: undefined;
    };

abstract class ArgParser<
  T extends ArgType | (ArgType | undefined),
  TOptions = T extends ArgType
    ? ArgParserOptions<T>
    : OptionalArgParserOptions<T>,
  TParseReturn = T extends ArgType
    ? Arg<T>
    : OptionalArg<Exclude<T, undefined>>,
> {
  protected _defaultValue: (() => T) | undefined;

  constructor(protected options: TOptions) {}

  protected get _options() {
    return this.options as
      | ArgParserOptions<Exclude<T, undefined>>
      | OptionalArgParserOptions<Exclude<T, undefined>>;
  }

  format(value: T): string {
    return this._options.prefix + value;
  }

  parse(): TParseReturn {
    const value = this._options.value ?? this._defaultValue?.();
    return {
      raw:
        this._options.raw ??
        (value !== undefined ? this.format(value as T) : undefined),
      value,
    } as TParseReturn;
  }

  defaultValue(value: T | (() => T)): this {
    this._defaultValue = typeof value === 'function' ? value : () => value;
    return this;
  }
}

type Args = Record<string, ArgParser<any>>;

type ParsedArgs<T extends Args> = {
  [K in keyof T]: ReturnType<T[K]['parse']>;
};

export function parseArgs<TArgs extends Args>(
  argParsers: TArgs,
): ParsedArgs<TArgs> {
  const parsedArgs: Record<string, Arg<any> | OptionalArg<any>> = {};

  for (const [key, parser] of Object.entries(argParsers)) {
    parsedArgs[key] = parser.parse();
  }

  return parsedArgs as ParsedArgs<TArgs>;
}

class BooleanArgParser<T extends boolean | undefined> extends ArgParser<T> {
  override format(value: T): string {
    return this.options.prefix + (value ? 'true' : 'false');
  }
}

export function booleanArg(name: string): ArgParser<boolean>;
export function booleanArg(
  name: string,
  defaultValue: boolean,
): ArgParser<boolean>;
export function booleanArg(
  name: string,
  defaultValue?: boolean,
): ArgParser<boolean> | ArgParser<boolean | undefined> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    if (defaultValue === undefined) {
      return new BooleanArgParser({
        prefix,
        value: defaultValue,
      });
    }

    return new BooleanArgParser<boolean | undefined>({
      prefix,
      value: undefined,
    }).defaultValue(defaultValue);
  }

  const rawValue = rawArg.slice(prefix.length).toLowerCase();
  if (
    rawValue === '1' ||
    rawValue === 'true' ||
    rawValue === 'on' ||
    rawValue === 'yes'
  ) {
    return new BooleanArgParser({
      prefix,
      raw: rawArg,
      value: true,
    });
  }
  if (
    rawValue === '0' ||
    rawValue === 'false' ||
    rawValue === 'off' ||
    rawValue === 'no'
  ) {
    return new BooleanArgParser({
      prefix,
      raw: rawArg,
      value: false,
    });
  }

  throw new Error(`Invalid value for --${name}: ${rawValue}`);
}

class IntegerArgParser<T extends number | undefined> extends ArgParser<T> {}

export function integerArg(name: string): ArgParser<number>;
export function integerArg(
  name: string,
  defaultValue: number,
): ArgParser<number>;
export function integerArg(
  name: string,
  defaultValue?: number,
): ArgParser<number> | ArgParser<number | undefined> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    if (defaultValue === undefined) {
      return new IntegerArgParser({
        prefix,
        value: defaultValue,
      });
    }

    return new IntegerArgParser<number | undefined>({
      prefix,
      value: undefined,
    }).defaultValue(defaultValue);
  }

  const parsedValue = Number.parseInt(rawArg.slice(prefix.length), 10);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `Invalid value for --${name}: ${rawArg.slice(prefix.length)}`,
    );
  }

  return new IntegerArgParser({
    prefix,
    raw: rawArg,
    value: parsedValue,
  });
}

class StringArgParser<T extends string | undefined> extends ArgParser<T> {}

export function stringArg(name: string): ArgParser<string | undefined>;
export function stringArg(
  name: string,
  defaultValue: string,
): ArgParser<string>;
export function stringArg(
  name: string,
  defaultValue?: string,
): ArgParser<string> | ArgParser<string | undefined> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    if (defaultValue === undefined) {
      return new StringArgParser({
        prefix,
        value: defaultValue,
      });
    }

    return new StringArgParser<string | undefined>({
      prefix,
      value: undefined,
    }).defaultValue(defaultValue);
  }
  const rawValue = rawArg.slice(prefix.length);
  if (!rawValue) {
    throw new Error(`Empty value for --${name}`);
  }

  return new StringArgParser({
    prefix,
    raw: rawArg,
    value: rawValue,
  });
}
