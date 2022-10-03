import {AbstractJavaCstTransformer} from '@java/transform/AbstractJavaCstTransformer';
import {OmniModel, OmniType, OmniTypeKind} from '@parse';
import {CompilationUnit, JavaCstRootNode, ModifierType} from '@java';
import * as Java from '@java/cst';
import {VisitorFactoryManager} from '@visit/VisitorFactoryManager';
import {RealOptions} from '@options';
import {OmniUtil} from '@parse/OmniUtil';
import {ITargetOptions} from '@interpret';

type CompilationUnitInfo = {
  cu: Java.CompilationUnit,
};

interface TypeMapping {
  definedIn?: CompilationUnit;
  usedIn: Set<CompilationUnit>;
}

export class InnerTypeCompressionCstTransformer extends AbstractJavaCstTransformer {

  transformCst(model: OmniModel, root: JavaCstRootNode, options: RealOptions<ITargetOptions>): Promise<void> {

    if (!options.compressSoloReferencedTypes && !options.compressUnreferencedSubTypes) {

      // The option for compressing types is disabled.
      return Promise.resolve();
    }

    const typeMapping = new Map<OmniType, TypeMapping>();
    const cuInfoStack: CompilationUnitInfo[] = [];
    root.visit(VisitorFactoryManager.create(this._javaVisitor, {

      visitCompilationUnit: (node, visitor) => {

        // TODO: To get this to work, there might be a need to rewrite PackageImportJavaCstTransformer?

        const mapping = typeMapping.get(node.object.type.omniType);
        if (mapping) {
          mapping.usedIn.add(node);
        } else {
          typeMapping.set(node.object.type.omniType, {
            usedIn: new Set(),
            definedIn: node,
          });
        }

        cuInfoStack.push({
          cu: node,
        });
        this._javaVisitor.visitCompilationUnit(node, visitor);
        cuInfoStack.pop();

      },

      visitType: (node) => {

        for (const usedType of OmniUtil.getResolvedVisibleTypes(node.omniType)) {

          // We will only compress certain kind of types.
          if (usedType.kind == OmniTypeKind.OBJECT
            || usedType.kind == OmniTypeKind.COMPOSITION
            || usedType.kind == OmniTypeKind.ENUM
            || usedType.kind == OmniTypeKind.INTERFACE) {

            const cu = cuInfoStack[cuInfoStack.length - 1];
            const mapping = typeMapping.get(usedType);
            if (mapping) {
              mapping.usedIn.add(cu.cu);
            } else {
              typeMapping.set(usedType, {
                usedIn: new Set([cu.cu]),
              });
            }
          }
        }
      }
    }));

    for (const e of typeMapping.entries()) {
      const usedInUnits = e[1].usedIn;
      if (usedInUnits.size != 1) {
        continue;
      }

      const usedInUnit = [...usedInUnits.values()][0];
      const type = e[0];
      if (OmniUtil.isAssignableTo(usedInUnit.object.extends?.type.omniType, type)) {

        // If the types are assignable, it means that the single use is a class extension.
        if (options.compressUnreferencedSubTypes && this.isAllowedKind(usedInUnit, options)) {

          // If the only use is as an extension, then IF we compress, the source/target should be reversed.
          // If typeA is only used in typeB, and typeB is extending from typeA, then typeB should be inside typeA.
          const target = e[1].definedIn;
          this.moveCompilationUnit(usedInUnit, target, type, root);
        }

      } else {

        const source = e[1].definedIn;
        if (options.compressSoloReferencedTypes && this.isAllowedKind(source, options)) {

          // This type is only ever used in one single unit.
          // To decrease the number of files, we can compress the types and make this an inner type.
          this.moveCompilationUnit(source, usedInUnit, type, root);
        }
      }
    }

    return Promise.resolve(undefined);
  }

  private isAllowedKind(cu: Java.CompilationUnit | undefined, options: ITargetOptions): boolean {

    if (!cu) {

      // We return true here, which is wrong, but it will throw an error inside moveCompilationUnit.
      return true;
    }

    return options.compressKinds.length == 0 || options.compressKinds.includes(cu.object.type.omniType.kind);
  }

  private moveCompilationUnit(
    sourceUnit: CompilationUnit | undefined,
    targetUnit: CompilationUnit | undefined,
    type: OmniType,
    root: JavaCstRootNode
  ): void {

    if (!sourceUnit) {
      throw new Error(`Could not find the CompilationUnit source where '${OmniUtil.getTypeDescription(type)}' is defined`);
    }

    if (!targetUnit) {
      throw new Error(`Could not find the CompilationUnit target where '${OmniUtil.getTypeDescription(type)}' is defined`);
    }

    if (!sourceUnit.object.modifiers.modifiers.find(it => it.type == ModifierType.STATIC)) {

      // Add the static modifier if it is not already added.
      // TODO: This does not need to be done for enums?
      sourceUnit.object.modifiers.modifiers.push(
        new Java.Modifier(ModifierType.STATIC)
      );
    }

    targetUnit.object.body.children.push(
      sourceUnit.object
    );

    const rootCuIndex = root.children.indexOf(sourceUnit);
    if (rootCuIndex == -1) {
      throw new Error(`The CompilationUnit for '${sourceUnit.object.name.value}' was not found in root node`);
    }

    root.children.splice(rootCuIndex, 1);
  }
}
