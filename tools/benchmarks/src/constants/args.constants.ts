import {
  booleanArg,
  integerArg,
  stringArg,
} from '../utils/parse-args.utils.ts';

export const commonArgs = {
  duration: integerArg('duration', 10),
  connections: integerArg('connections', 10),
  pipelining: integerArg('pipelining', 1),
  warmupSeconds: integerArg('warmup', 2),
  serverReadyMs: integerArg('server-ready-timeout', 120_000),
  nestBodyParser: booleanArg('nest-body-parser', true),

  restMethod: stringArg('rest-method', 'POST'),

  enableUnsafePolyfills: booleanArg('enable-unsafe-polyfills', false),
  enableProfiling: booleanArg('profiling', false),
  port: integerArg('port', 3000),
  bootstrapProfileOut: stringArg(
    'bootstrap-profile-out',
    `cpu-profile.bootstrap.cpuprofile`,
  ),
  profileOut: stringArg('profile-out', `cpu-profile.server.cpuprofile`),
};
