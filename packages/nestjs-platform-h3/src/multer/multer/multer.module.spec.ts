import { describe, expect, it, rs } from '@rstest/core';

import { MULTER_MODULE_OPTIONS } from '../files.constants.js';
import { H3MulterModule } from '../multer.module.js';

describe('H3MulterModule', () => {
  describe('register', () => {
    it('should provide options with useValue', () => {
      const options = {
        test: 'test',
      };
      const dynamicModule = H3MulterModule.register(options as any);

      expect(dynamicModule.providers).toHaveLength(1);
      expect(dynamicModule.imports).toBeUndefined();
      expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);

      expect(dynamicModule.providers?.[0]).toEqual({
        provide: MULTER_MODULE_OPTIONS,
        useValue: options,
      });
    });
  });

  describe('register async', () => {
    describe('when useFactory', () => {
      it('should provide an options factory', () => {
        const options: any = {};
        const asyncOptions = {
          useFactory: () => options,
        };
        const dynamicModule = H3MulterModule.registerAsync(asyncOptions);

        expect(dynamicModule.providers).toHaveLength(1);
        expect(dynamicModule.imports).toEqual([]);
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
        expect(dynamicModule.providers).toContainEqual(
          expect.objectContaining({
            provide: MULTER_MODULE_OPTIONS,
            useFactory: asyncOptions.useFactory,
            inject: [],
          }),
        );
      });
    });

    describe('when useExisting', () => {
      it('should provide async factory with inject', () => {
        const asyncOptions = {
          useExisting: Object,
        };
        const dynamicModule = H3MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).toHaveLength(1);
        expect(dynamicModule.imports).toEqual([]);
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
      });
    });

    describe('when useClass', () => {
      it('should provide options factory plus class provider', () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = H3MulterModule.registerAsync(asyncOptions as any);

        expect(dynamicModule.providers).toHaveLength(2);
        expect(dynamicModule.imports).toEqual([]);
        expect(dynamicModule.exports).toContain(MULTER_MODULE_OPTIONS);
      });
      it('provider should call "createMulterOptions"', async () => {
        const asyncOptions = {
          useClass: Object,
        };
        const dynamicModule = H3MulterModule.registerAsync(asyncOptions as any);
        const optionsFactory = {
          createMulterOptions: rs.fn(),
        };
        const moduleOptionsProvider = dynamicModule.providers!.find(
          (p) =>
            !!p &&
            typeof p === 'object' &&
            'useFactory' in p &&
            p.provide === MULTER_MODULE_OPTIONS,
        ) as { useFactory: (factory: typeof optionsFactory) => Promise<void> };
        await moduleOptionsProvider.useFactory(optionsFactory);
        expect(optionsFactory.createMulterOptions).toHaveBeenCalled();
      });
    });
  });
});
