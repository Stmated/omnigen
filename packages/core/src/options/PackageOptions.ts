import {IPackageResolver, ZodOptions} from '../options';
import {PackageResolverOptionsResolver} from './PackageResolverOptionsResolver.ts';
import {z} from 'zod';

export const ZodPackageOptions = ZodOptions.extend({
  package: z.string().default('generated.omnigen'),
  packageResolver: z.union([z.custom<IPackageResolver>(), z.record(z.string(), z.string()), z.undefined()])
    .transform(input => {
      const resolver = new PackageResolverOptionsResolver();
      return resolver.parse(input);
    }),
});

export type PackageOptions = z.infer<typeof ZodPackageOptions>;

export const DEFAULT_PACKAGE_OPTIONS: Readonly<PackageOptions> = ZodPackageOptions.readonly().parse({});

