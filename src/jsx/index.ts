import type { JSX } from "./jsx-runtime";

export function mount(el: JSX.Element, parent: HTMLElement) {
  parent.append(...[el as any].flat(Infinity));
}