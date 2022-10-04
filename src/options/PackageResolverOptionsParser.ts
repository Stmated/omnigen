import {IOptionParser} from '@options/IOptions';
import {IPackageResolver} from '@java';

export class PackageResolverOptionsParser implements IOptionParser<IPackageResolver | undefined> {

  parse(raw: unknown): IPackageResolver | undefined {

    if (!raw) {
      return undefined;
    }

    if (typeof raw == 'string') {
      const obj = JSON.parse(raw) as object;
      if (typeof obj == 'object') {
        return PackageResolverOptionsParser.parseObject(obj);
      }
    } else if (typeof raw == 'function') {
      return raw as IPackageResolver;
    } else if (typeof raw == 'object') {
      return PackageResolverOptionsParser.parseObject(raw);
    }

    throw new Error(`Cannot convert value '${String(raw)}' into a package resolver`);
  }

  private static parseObject(obj: object): IPackageResolver {

    return (type, typeName, options) => {

      for (const key in obj) {
        if (key in obj) {
          const regex = key;
          if (typeName.match(`^${regex}$`)) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const target = obj[key];
            if (typeof target == 'string') {
              return target;
            } else {
              throw new Error(`Not allowed to have non-string values as the packge name`);
            }
          }
        }
      }

      return options.package;
    };
  }
}