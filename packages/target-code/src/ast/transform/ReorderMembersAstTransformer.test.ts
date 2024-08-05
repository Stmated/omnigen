import {test, expect} from 'vitest';
import {ReorderMembersAstTransformer} from './ReorderMembersAstTransformer.ts';
import {
  DEFAULT_TARGET_OPTIONS,
  ObjectName,
  ObjectNameResolver,
  OMNI_GENERIC_FEATURES, OmniInterfaceOrObjectType, OmniItemKind,
  OmniModel,
  OmniObjectType,
  OmniPrimitiveKinds,
  OmniPrimitiveType, OmniSubTypeCapableType, OmniSuperTypeCapableType, OmniType,
  OmniTypeKind,
  OmniUnknownType,
  Options,
  PackageOptions,
  Reducer,
  ReducerResult,
  TargetFunctions,
  TargetOptions,
  UnknownKind,
} from '@omnigen/core';
import * as Code from '../Code';
import {CodeVisitor} from 'visitor/CodeVisitor.ts';
import {AbstractObjectNameResolver, isDefined, OmniUtil} from '@omnigen/core-util';
import {CodeUtil} from '../../util/CodeUtil.ts';

type NameResolverOptions = PackageOptions & TargetOptions & Options;

class TestObjectNameResolver extends AbstractObjectNameResolver<NameResolverOptions> {

  public namespaceSeparator: string = '.';

  public isReservedWord(word: string): boolean {
    return false;
  }

  protected createInterfaceName(innerEdgeName: string, options: NameResolverOptions): string {
    return `I${innerEdgeName}`;
  }

  protected getUnknownKind(type: OmniUnknownType, options: NameResolverOptions): UnknownKind {
    return type.unknownKind ?? UnknownKind.ANY;
  }

  public parse(fqn: string): ObjectName {
    const parts = fqn.split('.');

    return {
      namespace: parts.slice(0, -1),
      edgeName: parts[parts.length - 1],
    };
  }

  protected getPrimitiveName(type: OmniPrimitiveType, kind: OmniPrimitiveKinds, boxed: boolean | undefined, options: NameResolverOptions): ObjectName {
    return {
      namespace: [],
      edgeName: `${type.kind}${kind}`,
    };
  }
}

export class TestCodeModelFunctions implements TargetFunctions {

  asSubType(type: OmniType): OmniSubTypeCapableType | undefined {
    return OmniUtil.asSubType(type) ? type : undefined;
  }

  asSuperType(type: OmniType): OmniSuperTypeCapableType | undefined {
    return OmniUtil.asSuperType(type) ? type : undefined;
  }

  getSuperClass(model: OmniModel, type: OmniType, returnUnwrapped?: boolean): OmniSuperTypeCapableType | undefined {
    return CodeUtil.getSuperClassOfSubType(model, type, returnUnwrapped);
  }

  getSuperInterfaces(model: OmniModel, type: OmniType): OmniInterfaceOrObjectType[] {
    return CodeUtil.getSuperInterfacesOfSubType(model, type);
  }
}

class TestCodeRootAstNode extends Code.CodeRootAstNode {

  getFunctions(): TargetFunctions {
    return new TestCodeModelFunctions();
  }

  getNameResolver(): ObjectNameResolver {
    return new TestObjectNameResolver();
  }

  reduce(reducer: Reducer<CodeVisitor<unknown>>): ReducerResult<Code.CodeRootAstNode> {
    const reduced = this.children.map(it => it.reduce(reducer)).filter(isDefined);
    if (reduced && reduced.length > 0) {
      const newRoot = new TestCodeRootAstNode();
      newRoot.children.push(...reduced);
      return newRoot;
    }
    return undefined;
  }
}

test('test order', () => {

  const transformer = new ReorderMembersAstTransformer();

  const aType: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'A',
    properties: [],
  };

  const bType: OmniObjectType = {
    kind: OmniTypeKind.OBJECT,
    name: 'B',
    properties: [],
  };

  const a = new Code.ClassDeclaration(
    new Code.EdgeType(aType),
    new Code.Identifier(`A`),
    new Code.Block(
    ),
  );

  const b = new Code.ClassDeclaration(
    new Code.EdgeType(bType),
    new Code.Identifier(`B`),
    new Code.Block(
      new Code.Field(
        a.type,
        new Code.Identifier(`ref`),
      ),
    ),
  );

  const model: OmniModel = {
    kind: OmniItemKind.MODEL,
    schemaType: 'other',
    types: [bType, aType],
    endpoints: [],
  };

  const root = new TestCodeRootAstNode();
  const unit = new Code.CompilationUnit(
    new Code.PackageDeclaration('package'),
    new Code.ImportList(),
    b, a,
  );

  root.children.push(unit);

  expect(unit.children[0]).toEqual(b);
  expect(unit.children[1]).toEqual(a);

  transformer.transformAst({
    model: model,
    root: root,
    options: {...DEFAULT_TARGET_OPTIONS},
    features: OMNI_GENERIC_FEATURES,
    externals: [],
  });

  expect(unit.children[0]).toEqual(a);
  expect(unit.children[1]).toEqual(b);
});
