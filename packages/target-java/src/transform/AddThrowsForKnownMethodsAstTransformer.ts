/* eslint-disable @typescript-eslint/naming-convention */
import {AbstractJavaAstTransformer, JavaAstTransformerArgs} from './AbstractJavaAstTransformer.js';
import {OmniHardcodedReferenceType, OmniType, OmniTypeKind, OmniUtil, VisitorFactoryManager} from '@omnigen/core';
import * as Java from '../ast/index.js';
import {LoggerFactory} from '@omnigen/core-log';

const logger = LoggerFactory.create(import.meta.url);

interface MethodInfo {
  declaration: Java.MethodDeclaration;
  exceptions: string[];
}

/**
 * It would be even better if this was fetched from an external source, like a configuration file.
 * Or even better, from remote somewhere. This is a later problem of course.
 */
export class AddThrowsForKnownMethodsAstTransformer extends AbstractJavaAstTransformer {

  private static readonly _inheritances: {[key: string]: string[]} = {
    'com.fasterxml.jackson.databind.JsonMappingException': [
      'com.fasterxml.jackson.databind.DatabindException',
    ],
    'com.fasterxml.jackson.databind.DatabindException': [
      'com.fasterxml.jackson.core.JsonProcessingException',
    ],
    'com.fasterxml.jackson.core.JsonProcessingException': [
      'com.fasterxml.jackson.core.JacksonException',
    ],
    'com.fasterxml.jackson.core.JacksonException': [
      'java.io.IOException',
    ]
  };

  transformAst(args: JavaAstTransformerArgs): Promise<void> {

    const methodStack: MethodInfo[] = [];
    args.root.visit(VisitorFactoryManager.create(AbstractJavaAstTransformer.JAVA_VISITOR, {

      visitMethodDeclaration: (node, visitor) => {

        // NOTE: Does not check if entering anonymous/inner/local types
        methodStack.push({declaration: node, exceptions: []});
        AbstractJavaAstTransformer.JAVA_VISITOR.visitMethodDeclaration(node, visitor);
        const info = methodStack.pop();
        if (!info || info.exceptions.length == 0) {
          return;
        }

        if (!node.signature.throws) {
          node.signature.throws = new Java.TypeList([]);
        }

        const filtered = info.exceptions.filter(it => {

          // const superExceptions = AddThrowsForKnownMethodsAstTransformer._inheritances[it];
          // if (superExceptions && info.exceptions.filter(e => superExceptions.includes(e)).length > 0) {
          //   // This type has a super-exception, and the super-exception is already in the array. Skip.
          //   return false;
          // }

          if (this.hasSuperException(it, info.exceptions)) {
            return false;
          }

          return true;
        });

        for (const exception of filtered) {

          const hasException = node.signature.throws.children.find(
            it => it.omniType.kind == OmniTypeKind.HARDCODED_REFERENCE && it.omniType.fqn == exception);

          if (!hasException) {

            node.signature.throws.children.push(new Java.RegularType(
              {kind: OmniTypeKind.HARDCODED_REFERENCE, fqn: exception},
            ));
          }
        }
      },

      visitMethodCall: (node, visitor) => {

        const methodName = (node.methodName.original || node.methodName.value);
        const targetType = this.resolveTargetType(node.target);

        if (targetType && targetType.kind == OmniTypeKind.HARDCODED_REFERENCE) {

          const exceptionClasses = this.getExceptionClasses(targetType, methodName);
          if (exceptionClasses.length > 0) {

            const method = methodStack[methodStack.length - 1];
            method.exceptions.push(...exceptionClasses);
          }
        }

        AbstractJavaAstTransformer.JAVA_VISITOR.visitMethodCall(node, visitor);
      },
    }));

    return Promise.resolve();
  }

  private hasSuperException(ex: string, needle: string | string[]): boolean {

    const stack: string[] = [ex];

    // If we do not know of any super exceptions, we can at least be sure one of them is Exception.
    stack.push('java.lang.Exception');

    while (stack.length > 0) {

      const current = stack.shift();
      if (!current) {
        continue;
      }

      if (current != ex) {
        if (Array.isArray(needle) ? needle.includes(current) : current == needle) {
          return true;
        }
      }

      const supers = AddThrowsForKnownMethodsAstTransformer._inheritances[current];
      if (supers) {
        stack.push(...supers);
      }
    }

    return false;
  }

  private resolveTargetType(exp: Java.AbstractExpression | undefined): OmniType | undefined {

    if (exp instanceof Java.RegularType) {
      return exp.omniType;
    } else if (exp instanceof Java.GenericType) {
      return exp.omniType;
    } else if (exp instanceof Java.FieldReference) {
      return this.resolveTargetType(exp.field.type);
    } else if (exp instanceof Java.DeclarationReference) {
      return this.resolveTargetType(exp.declaration);
    } else if (exp instanceof Java.ArgumentDeclaration) {
      return this.resolveTargetType(exp.type);
    } else if (exp instanceof Java.VariableDeclaration) {
      return this.resolveTargetType(exp.type);
    }

    return undefined;
  }

  private getExceptionClasses(targetType: OmniHardcodedReferenceType, methodName: string): string[] {
    switch (targetType.fqn) {
      case 'com.fasterxml.jackson.databind.ObjectMapper':
        switch (methodName) {
          case 'writeValueAsString':
            return ['com.fasterxml.jackson.core.JsonProcessingException'];
          case 'readValue':
            return [
              'com.fasterxml.jackson.core.JsonProcessingException',
              'com.fasterxml.jackson.databind.JsonMappingException',
            ];
        }
        break;
      case 'java.net.http.HttpClient':
        switch (methodName) {
          case 'send':
            return [
              'java.io.IOException',
              'java.lang.InterruptedException',
            ];
        }
        break;
    }

    return [];
  }
}
