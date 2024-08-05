import {assert, describe, test} from 'vitest';
import {JavaObjectNameResolver} from './JavaObjectNameResolver.ts';
import {DEFAULT_PACKAGE_OPTIONS, DEFAULT_TARGET_OPTIONS, NameParts, OmniType, OmniTypeKind, PackageOptions, TargetOptions} from '@omnigen/api';
import {DEFAULT_JAVA_OPTIONS, JavaOptions} from '../options';

describe('JavaAstNameResolver', () => {

  const resolver = new JavaObjectNameResolver();

  test('reserved', () => {

    assert.isFalse(resolver.isReservedWord('foo'));
    assert.isTrue(resolver.isReservedWord('this'));
  });

  test('abs and rel', () => {

    const tFoo: OmniType = {
      kind: OmniTypeKind.OBJECT,
      name: 'Foo',
      properties: [],
    };

    const tBar: OmniType = {
      kind: OmniTypeKind.OBJECT,
      name: 'Bar',
      properties: [],
    };

    const tBaz: OmniType = {
      kind: OmniTypeKind.OBJECT,
      name: 'Baz',
      properties: [],
    };

    const options: PackageOptions & TargetOptions & JavaOptions = {
      ...DEFAULT_PACKAGE_OPTIONS,
      ...DEFAULT_TARGET_OPTIONS,
      ...DEFAULT_JAVA_OPTIONS,
      package: 'some.package',
      packageResolver: (type, name, opt) => {
        if (type === tBaz) {
          return 'some.cool.package';
        }

        return opt.package;
      },
    };

    const nameFoo = resolver.investigate({type: tFoo, options: options});
    const nameBar = resolver.investigate({type: tBar, options: options});
    const nameBaz = resolver.investigate({type: tBaz, options: options});

    assert.equal(resolver.build({name: nameFoo, with: NameParts.FULL}), 'some.package.Foo');
    assert.equal(resolver.build({name: nameBar, with: NameParts.FULL}), 'some.package.Bar');
    assert.equal(resolver.build({name: nameBaz, with: NameParts.FULL}), 'some.cool.package.Baz');

    assert.equal(resolver.build({name: nameFoo, with: NameParts.NAMESPACE}), 'some.package');
    assert.equal(resolver.build({name: nameBar, with: NameParts.NAMESPACE}), 'some.package');
    assert.equal(resolver.build({name: nameBaz, with: NameParts.NAMESPACE}), 'some.cool.package');

    assert.equal(resolver.build({name: nameFoo, with: NameParts.NAME}), 'Foo');
    assert.equal(resolver.build({name: nameBar, with: NameParts.NAME}), 'Bar');
    assert.equal(resolver.build({name: nameBaz, with: NameParts.NAME}), 'Baz');

    assert.equal(resolver.build({name: nameFoo, with: NameParts.FULL, relativeTo: nameBar.namespace}), 'Foo');
    assert.equal(resolver.build({name: nameBar, with: NameParts.FULL, relativeTo: nameFoo.namespace}), 'Bar');
    assert.equal(resolver.build({name: nameBaz, with: NameParts.FULL, relativeTo: nameFoo.namespace}), 'some.cool.package.Baz');
    assert.equal(resolver.build({name: nameFoo, with: NameParts.FULL, relativeTo: nameBaz.namespace}), 'some.package.Foo');
  });
});
