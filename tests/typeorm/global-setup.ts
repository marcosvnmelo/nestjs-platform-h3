import { verify_containers } from '@marcosvnmelo/testing-shared';

import { IMAGES } from '#containers';

export async function setup() {
  await verify_containers(IMAGES);
}
