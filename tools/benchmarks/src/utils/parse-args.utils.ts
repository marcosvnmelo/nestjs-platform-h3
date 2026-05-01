export function parseBooleanArg(name: string, defaultValue: boolean): boolean {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }

  const raw = value.slice(prefix.length).toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') {
    return true;
  }
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') {
    return false;
  }

  throw new Error(`Invalid value for --${name}: ${value.slice(prefix.length)}`);
}

export function parseIntegerArg(name: string, defaultValue: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value.slice(prefix.length), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid value for --${name}: ${value.slice(prefix.length)}`,
    );
  }

  return parsed;
}

export function parseOptionalStringArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return undefined;
  }
  const raw = value.slice(prefix.length);
  if (!raw) {
    throw new Error(`Empty value for --${name}`);
  }
  return raw;
}

export function parseStringArg(name: string, defaultValue: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return defaultValue;
  }
  const raw = value.slice(prefix.length);
  if (!raw) {
    throw new Error(`Empty value for --${name}`);
  }
  return raw;
}
