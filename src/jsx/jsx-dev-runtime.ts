import { el, Fragment as ElFragment } from "./jsx-runtime";

export namespace JSX {
  export type Element = HTMLElement | string;
}

export const jsxDEV = el;
export const Fragment = ElFragment;