export interface DependentSchemas extends StylesForCookieThen {
  readonly style?: string | undefined;
}

export type StylesForCookie = StylesForCookieThen | StylesForCookieElse;

export interface StylesForCookieElse {
  readonly 'cookie-else-prop'?: string | undefined;
}

export interface StylesForCookieThen {
  readonly 'cookie-then-prop'?: boolean | undefined;
}

export type StylesForForm = StylesForFormThen | StylesForFormElse;

export interface StylesForFormElse {
  readonly explode?: boolean | undefined;
}

export interface StylesForFormThen {
  readonly explode?: boolean | undefined;
}
