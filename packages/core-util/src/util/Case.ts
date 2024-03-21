/**
 * Taken from https://github.com/sindresorhus/camelcase
 * and https://github.com/jonschlinkert/pascalcase
 * But updated to typescript and made it easier to use the preserveConsecutiveUppercase option.
 */
import * as ChangeCase from 'change-case';

const UPPERCASE = /[\p{Lu}]/u;
const LOWERCASE = /[\p{Ll}]/u;
const LEADING_CAPITAL = /^[\p{Lu}](?![\p{Lu}])/gu;
const IDENTIFIER = /([\p{Alpha}\p{N}_]|$)/u;
const SEPARATORS = /[.\-/[\]()\s#+*~`]+/;

const LEADING_SEPARATORS = /^[.\-/[\]()\s#+*~`]+/; // Allows to start with '_' and '$'
const SEPARATORS_AND_IDENTIFIER = new RegExp(SEPARATORS.source + IDENTIFIER.source, 'gu');
const NUMBERS_AND_IDENTIFIER = new RegExp('\\d+' + IDENTIFIER.source, 'gu');

type CharTransformer = { (c: string): string };

export interface CamelCaseOptions {
  pascalCase: boolean;
  preserveConsecutiveUppercase: boolean;
  locale: undefined | string | string[];
}

export interface PascalCaseOptions extends CamelCaseOptions {
  punctuationRegex: RegExp | undefined;
}

export class Case {

  public static camel(value: string, options?: Partial<CamelCaseOptions>): string {
    return CamelCase.camelCase(value, options);
  }

  public static pascal(value: string, option?: Partial<PascalCaseOptions>): string {
    return PascalCase.pascalCase(value, option);
  }

  public static pascalKeepUpperCase(value: string): string {
    return PascalCase.pascalCase(value, {
      preserveConsecutiveUppercase: true,
    });
  }

  public static constant(value: string): string {

    // NOTE: Replace this with own code instead?
    // TODO: It is not certain all languages ban numbers as a first character in a constant name... should be target-dependant
    if (value.length > 0 && value.charAt(0).match(/[0-9]/)) {
      return `_${ChangeCase.constantCase(value)}`;
    }

    return ChangeCase.constantCase(value);
  }
}

class PascalCase {

  public static pascalCase(value: string, options?: Partial<PascalCaseOptions>) {
    if (value) {

      const punctuationFixed = options?.punctuationRegex !== undefined
        ? value.replace(options?.punctuationRegex, ' ')
        : value;

      return CamelCase.camelCase(punctuationFixed, {
        ...options,
        pascalCase: true,
      });
    }

    return '';
  };
}

class CamelCase {

  public static preserveCamelCase(value: string, toLowerCase: CharTransformer, toUpperCase: CharTransformer) {
    let isLastCharLower = false;
    let isLastCharUpper = false;
    let isLastLastCharUpper = false;

    for (let index = 0; index < value.length; index++) {
      const character = value[index];

      if (isLastCharLower && UPPERCASE.test(character)) {
        value = value.slice(0, index) + '-' + value.slice(index);
        isLastCharLower = false;
        isLastLastCharUpper = isLastCharUpper;
        isLastCharUpper = true;
        index++;
      } else if (isLastCharUpper && isLastLastCharUpper && LOWERCASE.test(character)) {
        value = value.slice(0, index - 1) + '-' + value.slice(index - 1);
        isLastLastCharUpper = isLastCharUpper;
        isLastCharUpper = false;
        isLastCharLower = true;
      } else {
        isLastCharLower = toLowerCase(character) === character && toUpperCase(character) !== character;
        isLastLastCharUpper = isLastCharUpper;
        isLastCharUpper = toUpperCase(character) === character && toLowerCase(character) !== character;
      }
    }

    return value;
  };

  public static preserveConsecutiveUppercase(input: string, toLowerCase: CharTransformer) {
    LEADING_CAPITAL.lastIndex = 0;

    return input.replace(LEADING_CAPITAL, m1 => toLowerCase(m1));
  };

  public static postProcess(input: string, toUpperCase: CharTransformer) {
    SEPARATORS_AND_IDENTIFIER.lastIndex = 0;
    NUMBERS_AND_IDENTIFIER.lastIndex = 0;

    return input
      .replace(SEPARATORS_AND_IDENTIFIER, (_, identifier) => toUpperCase(identifier))
      .replace(NUMBERS_AND_IDENTIFIER, m => toUpperCase(m));
  };

  public static camelCase(input: string | string[], options?: Partial<CamelCaseOptions>) {
    if (!(typeof input === 'string' || Array.isArray(input))) {
      throw new TypeError('Expected the input to be `string | string[]`');
    }

    const safeOptions: CamelCaseOptions = {
      pascalCase: options?.pascalCase || false,
      preserveConsecutiveUppercase: options?.preserveConsecutiveUppercase || false,
      locale: options?.locale || undefined,
    };

    if (Array.isArray(input)) {
      input = input.map(x => x.trim())
        .filter(x => x.length)
        .join('-');
    } else {
      input = input.trim();
    }

    if (input.length === 0) {
      return '';
    }

    const toLowerCase: CharTransformer = !safeOptions.locale
      ? string => string.toLowerCase()
      : string => string.toLocaleLowerCase(safeOptions.locale);

    const toUpperCase: CharTransformer = !safeOptions.locale
      ? string => string.toUpperCase()
      : string => string.toLocaleUpperCase(safeOptions.locale);

    if (input.length === 1) {
      if (SEPARATORS.test(input)) {
        return '';
      }

      return safeOptions.pascalCase ? toUpperCase(input) : toLowerCase(input);
    }

    const hasUpperCase = (input !== toLowerCase(input));

    if (hasUpperCase) {
      input = CamelCase.preserveCamelCase(input, toLowerCase, toUpperCase);
    }

    input = input.replace(LEADING_SEPARATORS, '');
    input = safeOptions.preserveConsecutiveUppercase ? CamelCase.preserveConsecutiveUppercase(input, toLowerCase) : toLowerCase(input);

    if (safeOptions.pascalCase) {
      input = toUpperCase(input.charAt(0)) + input.slice(1);
    }

    return CamelCase.postProcess(input, toUpperCase);
  }
}
