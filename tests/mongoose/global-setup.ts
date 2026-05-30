import { IMAGES } from '#containers';

import { verify_containers } from '@marcosvnmelo/testing-shared';

export async function setup() {
  await verify_containers(IMAGES);
}
