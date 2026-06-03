
export function getArrayItemWithIndexWrapAround<T>(array: Array<T>, index: number): T {
  if (array.length === 0) {
    throw new Error(`Cannot get item ${index} from an empty array`);
  }

  return array[index % array.length]!;
}

export type Predicate<T> = (v: T) => boolean;
export type BiPredicate<T> = (a: T, b: T) => boolean;

export function findIndexAlongside<T>(a: Array<T>, b: Array<T>, predicate: BiPredicate<T>, fallback?: number): typeof fallback {

  let i = 0;
  for (; i < a.length && i < b.length; i++) {
    if (predicate(a[i]!, b[i]!)) {
      return i;
    }
  }

  return fallback;
}
