import { fail } from 'assert';
import { join } from 'path';
import type { App } from 'supertest/types.d.ts';
import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { beforeAll, describe, expect, it } from '@rstest/core';
import request from 'supertest';

import type { MicroserviceOptions } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';

import type { NestH3Application } from '@marcosvnmelo/nestjs-platform-h3';
import { H3Adapter } from '@marcosvnmelo/nestjs-platform-h3';

import { AdvancedGrpcController } from '../src/grpc-advanced/advanced.grpc.controller.ts';

describe('Advanced GRPC transport', () => {
  let server: App;
  let app: NestH3Application;
  let client: any;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdvancedGrpcController],
    }).compile();
    // Create gRPC + HTTP server
    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    /*
     *  Create microservice configuration
     */
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        url: 'localhost:5001',
        package: 'proto_example',
        protoPath: 'root.proto',
        loader: {
          includeDirs: [
            join(import.meta.dirname, '../src/grpc-advanced/proto'),
          ],
          keepCase: true,
        },
      },
    });
    // Start gRPC microservice
    await app.startAllMicroservices();
    await app.init();
    // Load proto-buffers for test gRPC dispatch
    const proto = ProtoLoader.loadSync('root.proto', {
      includeDirs: [join(import.meta.dirname, '../src/grpc-advanced/proto')],
    }) as any;
    // Create Raw gRPC client object
    const protoGRPC = GRPC.loadPackageDefinition(proto) as any;
    // Create client connected to started services at standard 5000 port
    client = new protoGRPC.proto_example.orders.OrderService(
      'localhost:5001',
      GRPC.credentials.createInsecure(),
    );
  });

  it(`GRPC Sending and Receiving HTTP POST`, async () => {
    await request(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send({ id: 1 })
      .expect(200, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
  });

  it(`GRPC Streaming and Receiving HTTP POST`, async () => {
    await request(server)
      .post('/client-streaming')
      .set('Content-Type', 'application/json')
      .send({ id: 1 })
      .expect(200, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
  });

  it('GRPC Sending and receiving message', async () => {
    // Execute find in Promise
    return new Promise((resolve) => {
      client.find(
        {
          id: 1,
        },
        (err: any, result: any) => {
          // Compare results
          expect(err).toBeNull();
          expect(result).toEqual({
            id: 1,
            itemTypes: [1],
            shipmentType: {
              from: 'test',
              to: 'test1',
              carrier: 'test-carrier',
            },
          });
          // Resolve after checkups
          resolve();
        },
      );
    });
  });

  it('GRPC Sending and receiving Stream from RX handler', async () => {
    const callHandler = client.sync();

    // Get Set-Cookie from Metadata
    callHandler.on('metadata', (metadata: GRPC.Metadata) => {
      expect(metadata.get('Set-Cookie')[0]).toBe('test_cookie=abcd');
    });

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).toEqual({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (!String(err).toLowerCase().includes('cancelled')) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, _reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending and receiving Stream from Call handler', async () => {
    const callHandler = client.syncCall();

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).toEqual({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (!String(err).toLowerCase().includes('cancelled')) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, _reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending Stream and receiving a single message from RX handler', async () => {
    const callHandler = client.streamReq((err: any, res: any) => {
      if (err) {
        throw err;
      }
      expect(res).toEqual({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    return new Promise((resolve, _reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending Stream and receiving a single message from Call handler', async () => {
    const callHandler = client.streamReqCall((err: any, res: any) => {
      if (err) {
        throw err;
      }
      expect(res).toEqual({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    return new Promise((resolve, _reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });
});
