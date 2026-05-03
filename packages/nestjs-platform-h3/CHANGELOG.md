## [11.1.19-3](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.19-2...v11.1.19-3) (2026-05-03)


### Bug Fixes

* **h3-adapter:** map parser errors to BadRequest ([c599209](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/c5992090effb702d5861e878ba4d7b4d06aa2695))
* prototype pollution ([6f0497a](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/6f0497afdfb1c2922cb6fd71aae67553639fc959))


### Features

* add unsafe polyfills option ([106a873](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/106a8734cb2dfff0f055d829de3c0565824ddcc5))
* **benchmarks:** add unsafe polyfills to H3 bench harness ([d1d3877](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/d1d38775d0c41ece9420061c4e6dced6936ce136))
* **benchmarks:** POST/GET toggle via --rest-method ([aa8987e](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/aa8987e8142f1aff6c1b2b722123e248d23077ca))
* **h3:** add setAdapterDisguise for Express checks ([fdd5ced](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/fdd5ced17955df831f82282faa732e3c30df1e47))
* **h3:** H3-native JSON parser ([dedf9cb](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/dedf9cb09c56c9f450f5efc7f1f8d153a5fdc659))


### Performance Improvements

* fix `res.end` double call ([ca56e72](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/ca56e72396470496ecd2ccb8642c86a44cb0f402))
* **h3:** fast-path MIME typing and JSON bodies ([0ba3656](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/0ba365688de00595f1bb8a547a05102a6e8a21b1))
* improve polyfills overhead ([be061e8](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/be061e8ed4a310dda700cda5071fbcdedfbdb747))



## [11.1.19-2](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.19-1...v11.1.19-2) (2026-04-24)


### Bug Fixes

* solve multiple errors from tests ([bd287a5](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/bd287a549b28d01bf7f6c8ad923007039e78f184))


### Features

* enhance H3Adapter to support reverse route handling for versioned routes ([6a4bb3c](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/6a4bb3cb6764ca7250e73a2d7dd3f9bc6d11830a))



## [11.1.19-2](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.19-1...v11.1.19-2) (2026-04-24)


### Bug Fixes

* solve multiple errors from tests ([bd287a5](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/bd287a549b28d01bf7f6c8ad923007039e78f184))


### Features

* enhance H3Adapter to support reverse route handling for versioned routes ([6a4bb3c](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/6a4bb3cb6764ca7250e73a2d7dd3f9bc6d11830a))



## [11.1.19-1](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-6...v11.1.19-1) (2026-04-13)



## [11.1.19-1](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.1-9.0...v11.1.19-1) (2026-04-13)



## [11.1.1-9.0](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-6...v11.1.1-9.0) (2026-04-13)



## [11.1.18-6](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-5...v11.1.18-6) (2026-04-12)


### Features

* add Express-like polyfill methods to H3 response object for NestJS compatibility ([3a3e19e](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/3a3e19eeb89920a7566aeb7b8037ad0321e44632))
* add support for 'all' method in H3Adapter for route registration ([dfc6291](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/dfc629143dc88603b982b0cd2eca5aca02e27dde))



## [11.1.18-5](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-4...v11.1.18-5) (2026-04-11)


### Bug Fixes

* update dts configuration to enable bundling ([cdbcd51](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/cdbcd510f857dc28af64b32a21087493b7966c1e))



## [11.1.18-4](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-3...v11.1.18-4) (2026-04-11)


### Features

* add quick-publish patch ([02e8a7f](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/02e8a7f9a052e67a3703225cc237401f8d05abd2))



## [11.1.18-3](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-2...v11.1.18-3) (2026-04-11)


### Bug Fixes

* add check for existing catalog entries before restoring ([b329a0c](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/b329a0c49edeadecb196eb4aa8048c99919a875b))
* add scripts to resolve and restore catalog entries in package.json ([a2983a7](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/a2983a70e4dbe4465afa9cc5cc57f17790a49588))
* update package.json scripts for catalog resolution and restoration ([a069a8c](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/a069a8c3b05df36964be9a75d1f659625ad7cfc3))



## [11.1.18-2](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.18-1...v11.1.18-2) (2026-04-10)


### Features

* optimize H3 response pipeline by capturing response body ([32e5760](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/32e57600d0434245a3c28d481446d141d00cbbc0))



## [11.1.18-1](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.14-2...v11.1.18-1) (2026-04-09)


### Features

* update NestJS packages ([560bb44](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/560bb4415a8d49f1c29e61496405782d69fc4782))



## [11.1.14-2](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/v11.1.14-1...v11.1.14-2) (2026-04-09)


### Features

* update h3 version to 2.0.1-rc.20 ([9038542](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/90385422d7235fc1fd172aa0d870ec8116d5b678))



## [11.1.14-1](https://github.com/marcosvnmelo/nestjs-platform-h3/compare/3bc44d9388daf9d0ac86a3885a10506d32340068...v11.1.14-1) (2026-02-28)


### Bug Fixes

* add repository field to package.json ([64c7393](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/64c73934038cf804f249299c094c4f2c42c82b97))
* change event listeners from 'close' to 'finish' ([3bc44d9](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/3bc44d9388daf9d0ac86a3885a10506d32340068))
* ensure request and response are defined before processing in H3Adapter ([4922f24](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/4922f24f5486caa7793e18e7251281aea4b690db))
* ensure response handling is correctly resolved in H3Adapter ([5007305](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/5007305bd76ac449221bd95a473bf603f6c44470))
* inject dependencies in RolesGuard and HelloController constructors ([c6486c2](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/c6486c2dccb64abe4aa39fb4d3dfe32af7475a77))
* return 404 response directly instead of throwing an exception in H3Adapter ([2ba909f](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/2ba909ff587a4963d4be556676eddf33ad7b35a9))


### Features

* add benchmark module ([f6a150e](https://github.com/marcosvnmelo/nestjs-platform-h3/commit/f6a150e6e6e8321d32818f770067f6feca33f8fe))



