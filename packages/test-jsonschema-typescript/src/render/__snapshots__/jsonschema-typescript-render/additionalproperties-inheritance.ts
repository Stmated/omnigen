// noinspection JSUnusedGlobalSymbols

export interface FullParent {
  [key: string]: unknown;
}

export interface FullChild extends FullParent {
  prop2?: string | undefined;
}

export interface EmptyChild {
  prop1?: string | undefined;
  [key: string]: unknown;
}
