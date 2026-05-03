export const enum ServerEnum {
  EXPRESS = 'EXPRESS',
  FASTIFY = 'FASTIFY',
  H3 = 'H3',
  NEST_EXPRESS = 'NEST_EXPRESS',
  NEST_FASTIFY = 'NEST_FASTIFY',
  NEST_H3 = 'NEST_H3',
}

export const serverFileMap: Record<ServerEnum, string> = {
  EXPRESS: 'express-server.js',
  FASTIFY: 'fastify-server.js',
  H3: 'h3-server.js',
  NEST_EXPRESS: 'nest-express-server.js',
  NEST_FASTIFY: 'nest-fastify-server.js',
  NEST_H3: 'nest-h3-server.js',
};
