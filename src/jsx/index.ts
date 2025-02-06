import type { JSX } from "./jsx-runtime";

export function mount(parent: HTMLElement | string, el: JSX.Element) {
  if (typeof parent === "string") parent = document.querySelector(parent) as HTMLElement;
  parent.append(...[el as any].flat(Infinity).filter(Boolean));
}

export type { JSX };