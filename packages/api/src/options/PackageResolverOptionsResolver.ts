import {IPackageResolver} from './IPackageResolver';

export class PackageResolverOptionsResolver {

  parse(raw: unknown): IPackageResolver | undefined {

    if (!raw) {
      return undefined;
    }

    if (typeof raw == 'string') {
      const obj = JSON.parse(raw) as object;
      if (typeof obj == 'object') {
        return PackageResolverOptionsResolver.parseObject(obj);
      }
    } else if (typeof raw == 'function') {
      return raw as IPackageResolver;
    } else if (typeof raw == 'object') {
      return PackageResolverOptionsResolver.parseObject(raw);
    }

    throw new Error(`Cannot convert value '${String(raw)}' into a package resolver`);
  }

  private static parseObject(obj: object): IPackageResolver {

    return (_type, typeName, options) => {

      for (const key in obj) {
        if (!(key in obj)) {
          continue;
        }

        if (typeName.match(`^${key}$`)) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const target = obj[key];
          if (typeof target == 'string') {
            return target;
          } else {
            throw new Error(`Not allowed to have non-string values as the package name`);
          }
        }
      }

      return options.package;
    };
  }
}
