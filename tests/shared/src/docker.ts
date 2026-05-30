import { getContainerRuntimeClient, ImageName } from 'testcontainers';

const containerRuntimeClient = await getContainerRuntimeClient();

type SpecState =
  | 'unknown'
  | 'failed_to_check_locally'
  | 'missing'
  | 'falied_to_pull'
  | 'available';

interface ContainerSpec {
  name: string;
  image: string;
  state: SpecState;
}

const stateSymbolMap: Record<
  Extract<SpecState, 'available' | 'missing' | 'failed_to_check_locally'>,
  string
> = {
  available: '✓',
  missing: '✗',
  failed_to_check_locally: '⚠️',
};

async function img_exist(img: string): Promise<boolean> {
  return containerRuntimeClient.image.exists(ImageName.fromString(img));
}

async function download_imgs(missingSpecs: ContainerSpec[]): Promise<void> {
  const failed: ContainerSpec[] = [];

  console.log('');
  const downloadedImagesResult = await Promise.allSettled(
    missingSpecs.map(async (spec): Promise<ContainerSpec> => {
      console.log(`⬇️  ${spec.image}...`);
      return containerRuntimeClient.image
        .pull(ImageName.fromString(spec.image))
        .then(() => ({ ...spec, state: 'available' }) satisfies ContainerSpec)
        .catch(
          () => ({ ...spec, state: 'falied_to_pull' }) satisfies ContainerSpec,
        );
    }),
  );

  const downloadedImages: ContainerSpec[] = downloadedImagesResult.map(
    (result, index) => {
      if (result.status === 'rejected')
        return { ...missingSpecs[index], state: 'falied_to_pull' };
      else return result.value;
    },
  );

  downloadedImages.forEach((spec) => {
    if (spec.state === 'available') return;

    failed.push(spec);
  });

  if (failed.length === 0) return console.log('\n✓ Done.');

  for (const { image } of failed) {
    console.error(`✗ Failed: ${image}`);
  }
}

export async function verify_containers(
  images: Record<string, string>,
): Promise<void> {
  const specs: ContainerSpec[] = Object.entries(images).map(
    ([name, image]) => ({ name, image, state: 'unknown' }),
  );

  console.log(`📦 Check ${specs.length} images...\n`);

  const missing: ContainerSpec[] = [];

  const verifiedSpecsResult = await Promise.allSettled(
    specs.map(async (spec): Promise<ContainerSpec> => {
      const exists = await img_exist(spec.image);
      return { ...spec, state: exists ? 'available' : 'missing' };
    }),
  );

  const verifiedSpecs: ContainerSpec[] = verifiedSpecsResult.map(
    (result, index) => {
      if (result.status === 'rejected')
        return { ...specs[index], state: 'failed_to_check_locally' };
      else return result.value;
    },
  );

  verifiedSpecs.forEach((spec) => {
    const status = stateSymbolMap[spec.state as keyof typeof stateSymbolMap];
    console.log(`${status} ${spec.name.padEnd(12)} ${spec.image}`);

    if (spec.state === 'missing') missing.push(spec);
  });

  if (missing.length === 0) {
    console.log('\n✓ All containers ready.');
    return;
  }

  await download_imgs(missing);
}
