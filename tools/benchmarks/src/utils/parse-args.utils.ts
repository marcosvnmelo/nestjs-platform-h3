type ArgType = string | number | boolean | undefined;

export interface Arg<T extends ArgType> {
  raw: string;
  value: T;
}

export interface OptionalArg<T extends ArgType> {
  raw?: string;
  value: T | undefined;
}

abstract class OptionalArgParser<T extends ArgType> {
  protected _defaultValue: (() => T) | undefined;

  constructor(
    protected options: {
      prefix: string;
      raw?: string;
      value: T | undefined;
    },
  ) {}

  format(value: T): string {
    return this.options.prefix + value;
  }

  parse(): OptionalArg<T> {
    return {
      raw: this.options.raw,
      value: this.options.value ?? this._defaultValue?.(),
    };
  }

  defaultValue(value: T | (() => T)): this {
    this._defaultValue = typeof value === 'function' ? value : () => value;
    return this;
  }
}

abstract class ArgParser<T extends ArgType> extends OptionalArgParser<T> {
  constructor(
    protected options: {
      prefix: string;
      raw: string;
      value: T;
    },
  ) {
    super(options);
  }

  override parse(): Arg<T> {
    return super.parse() as Arg<T>;
  }
}

type Args = Record<string, ArgParser<any> | OptionalArgParser<any>>;

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

class BooleanArgParser extends ArgParser<boolean> {
  override format(value: boolean): string {
    return this.options.prefix + (value ? 'true' : 'false');
  }
}

export function booleanArg(
  name: string,
  defaultValue: boolean,
): ArgParser<boolean> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    return new BooleanArgParser({
      prefix,
      raw: prefix + defaultValue,
      value: defaultValue,
    });
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

class IntegerArgParser extends ArgParser<number> {}

export function integerArg(
  name: string,
  defaultValue: number,
): ArgParser<number> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    return new IntegerArgParser({
      prefix,
      raw: prefix + defaultValue,
      value: defaultValue,
    });
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

class StringArgParser extends OptionalArgParser<string> {}
class OptionalStringArgParser extends OptionalArgParser<string> {}

export function stringArg(name: string): OptionalArgParser<string>;
export function stringArg(
  name: string,
  defaultValue: string,
): ArgParser<string>;
export function stringArg(
  name: string,
  defaultValue?: string,
): OptionalArgParser<string> | ArgParser<string> {
  const prefix = `--${name}=`;
  const rawArg = process.argv.find((arg) => arg.startsWith(prefix));
  if (!rawArg) {
    if (defaultValue === undefined) {
      return new OptionalStringArgParser({
        prefix,
        raw: rawArg,
        value: defaultValue,
      });
    }

    return new OptionalStringArgParser({
      prefix,
      raw: prefix + defaultValue,
      value: defaultValue,
    });
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
