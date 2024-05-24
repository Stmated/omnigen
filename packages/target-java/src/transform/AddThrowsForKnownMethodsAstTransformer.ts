import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer';
import {ObjectName, ObjectNameResolver, OmniHardcodedReferenceType, OmniType, OmniTypeKind, RootAstNode} from '@omnigen/core';
import * as Java from '../ast/JavaAst';
import {LoggerFactory} from '@omnigen/core-log';
import {VisitorFactoryManager} from '@omnigen/core-util';
import {JavaObjectNameResolver} from '../ast/JavaObjectNameResolver.ts';
import {JACKSON_OBJECT_MAPPER} from './JacksonJavaAstTransformer.ts';

const logger = LoggerFactory.create(import.meta.url);

interface MethodInfo {
  declaration: Java.MethodDeclaration;
  exceptions: ObjectName[];
}

interface SuperTypeMapping {
  subType: ObjectName;
  superTypes: ObjectName[];
}

/**
 * It would be even better if this was fetched from an external source, like a configuration file.
 * Or even better, from remote somewhere. This is a later problem of course.
 */
export class AddThrowsForKnownMethodsAstTransformer extends AbstractJavaAstTransformer {

  private static readonly _JSON_PROCESSING_EXCEPTION = JavaObjectNameResolver.internalParse('com.fasterxml.jackson.core.JsonProcessingException');
  private static readonly _JSON_MAPPING_EXCEPTION = JavaObjectNameResolver.internalParse('com.fasterxml.jackson.databind.JsonMappingException');
  private static readonly _JAVA_IO_EXCEPTION = JavaObjectNameResolver.internalParse('java.io.IOException');
  private static readonly _JAVA_LANG_INTERRUPTED_EXCEPTION = JavaObjectNameResolver.internalParse('java.lang.InterruptedException');

  private static readonly _JAVA_HTTP_CLIENT = JavaObjectNameResolver.internalParse('java.net.http.HttpClient');

  private static readonly _SUPERTYPE_MAPPING: SuperTypeMapping[] = [
    {
      subType: AddThrowsForKnownMethodsAstTransformer._JSON_MAPPING_EXCEPTION,
      superTypes: [
        JavaObjectNameResolver.internalParse('com.fasterxml.jackson.databind.DatabindException'),
      ],
    },
    {
      subType: JavaObjectNameResolver.internalParse('com.fasterxml.jackson.databind.DatabindException'),
      superTypes: [
        AddThrowsForKnownMethodsAstTransformer._JSON_PROCESSING_EXCEPTION,
      ],
    },
    {
      subType: AddThrowsForKnownMethodsAstTransformer._JSON_PROCESSING_EXCEPTION,
      superTypes: [
        JavaObjectNameResolver.internalParse('com.fasterxml.jackson.core.JacksonException'),
      ],
    },
    {
      subType: JavaObjectNameResolver.internalParse('com.fasterxml.jackson.core.JacksonException'),
      superTypes: [
        AddThrowsForKnownMethodsAstTransformer._JAVA_IO_EXCEPTION,
      ],
    },
  ];

  private static readonly javaLangException = JavaObjectNameResolver.internalParse('java.lang.Exception');

  transformAst(args: JavaAstTransformerArgs): void {

    const nameResolver = args.root.getNameResolver();
    const methodStack: MethodInfo[] = [];

    const defaultVisitor = args.root.createVisitor();
    args.root.visit(VisitorFactoryManager.create(defaultVisitor, {

      visitMethodDeclaration: (node, visitor) => {

        // NOTE: Does not check if entering anonymous/inner/local types
        methodStack.push({declaration: node, exceptions: []});
        defaultVisitor.visitMethodDeclaration(node, visitor);
        const info = methodStack.pop();
        if (!info || info.exceptions.length == 0) {
          return;
        }

        if (!node.signature.throws) {
          node.signature.throws = new Java.TypeList([]);
        }

        const filtered = info.exceptions.filter(it => {

          if (this.hasSuperException(it, info.exceptions, nameResolver)) {
            return false;
          }

          return true;
        });

        for (const exception of filtered) {

          const hasException = node.signature.throws.children.find(
            it => it.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE && it.omniType.fqn == exception);

          if (!hasException) {

            node.signature.throws.children.push(new Java.EdgeType(
              {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: exception},
            ));
          }
        }
      },

      visitMethodCall: (node, visitor) => {

        const methodName = node.target instanceof Java.MemberAccess
          ? node.target.member instanceof Java.Identifier
            ? (node.target.member.original || node.target.member.value)
            : undefined
          : undefined;

        const targetType = this.resolveTargetType(args.root, node.target);

        if (targetType && targetType.kind == OmniTypeKind.HARDCODED_REFERENCE) {

          const exceptionClasses = this.getExceptionClasses(targetType, methodName, nameResolver);
          if (exceptionClasses.length > 0) {

            const method = methodStack[methodStack.length - 1];
            method.exceptions.push(...exceptionClasses);
          }
        }

        defaultVisitor.visitMethodCall(node, visitor);
      },
    }));
  }

  private hasSuperException(ex: ObjectName, needle: ObjectName | ObjectName[], nameResolver: ObjectNameResolver): boolean {

    const stack: ObjectName[] = [ex];

    // If we do not know of any super exceptions, we can at least be sure one of them is Exception.
    stack.push(AddThrowsForKnownMethodsAstTransformer.javaLangException);

    while (stack.length > 0) {

      const current = stack.shift();
      if (!current) {
        continue;
      }

      if (!nameResolver.isEqual(current, ex)) {
        if (Array.isArray(needle) ? needle.includes(current) : current == needle) {
          return true;
        }
      }

      for (const mapping of AddThrowsForKnownMethodsAstTransformer._SUPERTYPE_MAPPING) {
        if (nameResolver.isEqual(current, mapping.subType)) {
          stack.push(...mapping.superTypes);
          break;
        }
      }
    }

    return false;
  }

  private resolveTargetType(root: RootAstNode, exp: Java.AbstractCodeNode | undefined): OmniType | undefined {

    if (exp instanceof Java.EdgeType) {
      return exp.omniType;
    } else if (exp instanceof Java.GenericType) {
      return exp.omniType;
    } else if (exp instanceof Java.FieldReference) {
      const resolved = root.resolveNodeRef(exp);
      // if (resolved instanceof Java.AbstractCodeNode) {
      return this.resolveTargetType(root, resolved);
      // } else {
      //   throw new Error(`Do not know how to resolve the type of reference to '${resolved}'`);
      // }
    } else if (exp instanceof Java.DeclarationReference) {
      const dec = exp.resolve(root);
      return this.resolveTargetType(root, dec);
    } else if (exp instanceof Java.Parameter) {
      return this.resolveTargetType(root, exp.type);
    } else if (exp instanceof Java.VariableDeclaration) {
      return this.resolveTargetType(root, exp.type);
    } else if (exp instanceof Java.Field) {
      return this.resolveTargetType(root, exp.type);
    }

    return undefined;
  }

  private getExceptionClasses(targetType: OmniHardcodedReferenceType, methodName: string | undefined, nameResolver: ObjectNameResolver): ObjectName[] {

    if (nameResolver.isEqual(targetType.fqn, JACKSON_OBJECT_MAPPER)) {
      switch (methodName) {
        case 'writeValueAsString':
          return [AddThrowsForKnownMethodsAstTransformer._JSON_PROCESSING_EXCEPTION];
        case 'readValue':
          return [
            AddThrowsForKnownMethodsAstTransformer._JSON_PROCESSING_EXCEPTION,
            AddThrowsForKnownMethodsAstTransformer._JSON_MAPPING_EXCEPTION,
          ];
      }
    }

    if (nameResolver.isEqual(targetType.fqn, AddThrowsForKnownMethodsAstTransformer._JAVA_HTTP_CLIENT)) {
      switch (methodName) {
        case 'send':
          return [
            AddThrowsForKnownMethodsAstTransformer._JAVA_IO_EXCEPTION,
            AddThrowsForKnownMethodsAstTransformer._JAVA_LANG_INTERRUPTED_EXCEPTION,
          ];
      }
    }

    return [];
  }
}
