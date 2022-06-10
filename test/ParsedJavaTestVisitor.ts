import {
  ArgumentListCtx,
  BaseJavaCstVisitorWithDefaults,
  BooleanLiteralCtx,
  FieldDeclarationCtx,
  FloatingPointLiteralCtx,
  IntegerLiteralCtx,
  LiteralCtx, MethodDeclaratorCtx, NormalInterfaceDeclarationCtx
} from 'java-parser';

export class ParsedJavaTestVisitor extends BaseJavaCstVisitorWithDefaults {
  readonly foundInterfaces: string[] = [];
  readonly foundMethods: string[] = [];
  readonly foundMethodArguments: any[][] = [];
  readonly foundFields: FieldDeclarationCtx[] = [];
  readonly foundLiterals: any[] = [];

  normalInterfaceDeclaration(ctx: NormalInterfaceDeclarationCtx, param?: any): any {
    if (ctx.typeIdentifier) {
      const children = ctx.typeIdentifier[0].children;
      if (children.Identifier) {
        this.foundInterfaces.push(children.Identifier[0].image);
      }
    }
    return super.normalInterfaceDeclaration(ctx, param);
  }

  // methodDeclaration(ctx: MethodDeclarationCtx, param?: any): any {
  //   this.foundMethods.push(ctx.methodHeader[0].children.methodDeclarator[0].children.Identifier[0].image);
  //   return super.methodDeclaration(ctx, param);
  // }

  methodDeclarator(ctx: MethodDeclaratorCtx, param?: any): any {
    this.foundMethods.push(ctx.Identifier[0].image);
    return super.methodDeclarator(ctx, param);
  }

  argumentList(ctx: ArgumentListCtx, param?: any): any {
    // Implement
    return super.argumentList(ctx, param);
  }

  fieldDeclaration(ctx: FieldDeclarationCtx, param?: any): any {
    this.foundFields.push(ctx);
    return super.fieldDeclaration(ctx, param);
  }

  literal(ctx: LiteralCtx, param?: any): any {
    if (ctx.StringLiteral) {
      this.foundLiterals.push(ctx.StringLiteral.map(lit => lit.image).filter(it => !!it)[0]);
    } else if (ctx.CharLiteral) {
      this.foundLiterals.push(ctx.CharLiteral.map(lit => lit.image).filter(it => !!it)[0]);
    } else if (ctx.Null) {
      this.foundLiterals.push(null);
    } else if (ctx.TextBlock) {
      this.foundLiterals.push(ctx.TextBlock.map(lit => lit.image).filter(it => !!it)[0]);
    }

    return super.literal(ctx, param);
  }

  booleanLiteral(ctx: BooleanLiteralCtx, param?: any): any {
    if (ctx.True) {
      this.foundLiterals.push(true);
    } else if (ctx.False) {
      this.foundLiterals.push(false);
    }

    return super.booleanLiteral(ctx, param);
  }

  integerLiteral(ctx: IntegerLiteralCtx, param?: any): any {
    if (ctx.HexLiteral) {
      this.foundLiterals.push(ctx.HexLiteral.map(it => Number.parseInt(it.image, 16))[0]);
    } else if (ctx.BinaryLiteral) {
      this.foundLiterals.push(ctx.BinaryLiteral.map(it => Number.parseInt(it.image, 2))[0]);
    } else if (ctx.OctalLiteral) {
      this.foundLiterals.push(ctx.OctalLiteral.map(it => Number.parseInt(it.image, 8))[0]);
    } else if (ctx.DecimalLiteral) {
      this.foundLiterals.push(ctx.DecimalLiteral.map(it => Number.parseInt(it.image, 10))[0]);
    }

    return super.integerLiteral(ctx, param);
  }

  floatingPointLiteral(ctx: FloatingPointLiteralCtx, param?: any): any {
    if (ctx.FloatLiteral) {
      this.foundLiterals.push(ctx.FloatLiteral.map(it => Number.parseFloat(it.image))[0]);
    } else if (ctx.HexFloatLiteral) {
      this.foundLiterals.push(ctx.HexFloatLiteral.map(it => {
        const parts = it.image.split('.');
        if (parts.length > 1) {
          return parseInt(parts[0], 16) + parseInt(parts[1], 16) / Math.pow(16, parts[1].length);
        }
        return parseInt(parts[0], 16);
      })[0]);
    }

    return super.floatingPointLiteral(ctx, param);
  }
}
