import flyd from "flyd";
import { mount } from ".";

export namespace JSX {
  export type Element = HTMLElement | string | Element[];

  export type Props<T extends object> = T & {
    children?: JSX.Element;
  }
  export type Component<T extends object = {}> = (props: Props<T>) => Element;

  type IfEquals<T, U, R> =
    (<X>() => X extends T ? 1 : 2) extends (<X>() => X extends U ? 1 : 2)
    ? R
    : never;
  type WritableKeys<T> = {
    [K in keyof T]: IfEquals<
      { [P in K]: T[K] },
      { -readonly [P in K]: T[K] },
      K
    >
  }[keyof T];
  type ElementProps<T> = {
    [K in WritableKeys<T>]?: K extends `on${string}`
    ? T[K]
    : T[K] | flyd.Stream<T[K]>;
  } & {
    children?: JSX.Element;
    classList?: string[];
  };
  export type IntrinsicElements = {
    [K in keyof HTMLElementTagNameMap]: ElementProps<HTMLElementTagNameMap[K]>
  };
}

export const jsx = el;
export const jsxs = el;
export const Fragment = Symbol("fragment");

export function el<T extends keyof JSX.IntrinsicElements>(tag: T, props: JSX.IntrinsicElements[T], _key?: string): JSX.Element;
export function el(tag: typeof Fragment, props: JSX.Props<{}>, _key?: string): JSX.Element;
export function el<T extends object>(tag: JSX.Component<T>, props: T, _key?: string): JSX.Element;
export function el<
  Tag extends keyof JSX.IntrinsicElements | typeof Fragment | JSX.Component<T> | undefined,
  T extends Tag extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[Tag] : object,
>(tag: Tag, props: T, _key?: string): JSX.Element {
  if (typeof tag === "function") {
    return tag(props as T);
  }
  if (typeof tag === "symbol") {
    return [(props as JSX.Props<{}>).children].flat();
  }
  if (!isHTMLProps(tag, props)) throw new Error();

  const element = isSVGTag(tag)
    ? document.createElementNS("http://www.w3.org/2000/svg", tag) as unknown as HTMLElement
    : document.createElement(tag);

  for (const key in props as object) {
    if (key === "children") continue;
    if (key === "classList") continue;

    const value = props[key];

    let m: RegExpExecArray | null;
    if (m = /^on(.*)/.exec(key)) {
      const [, eventType] = m;
      element.addEventListener(eventType, value);
    } else if (isStream(value)) {
      value.map((v: any) => element[key] = v);
    } else {
      setAttribute(element, key, value);
    }
  }

  mount(element, props.children);
  element.classList.add(...props.classList?.filter(Boolean) ?? []);

  return element;
}

function isStream(x: any): x is flyd.Stream<any> {
  return flyd.isStream(x);
}

function isHTMLProps<T extends keyof JSX.IntrinsicElements>(tag: T, _props: any): _props is JSX.IntrinsicElements[T] {
  return typeof tag === "string";
}

function isSVGTag(tagName: string) {
  return /^(svg|g|defs|desc|title|symbol|use|image|foreignObject|marker|path|rect|circle|ellipse|line|poly(line|gon)|text|tspan|tref|textPath|altGlyph(Def|Item)?|glyph(Ref)?|pattern|clipPath|mask|filter|fe[A-Z].*|(linear|radial)Gradient|stop|view)$/.test(tagName);
}

function setAttribute(element: HTMLElement, key: string, value: any) {
  if (/^(role$|aria[-A-Z])/.test(key)) {
    element.setAttribute(kebab(key), value);
  } else if (isProperty(key)) {
    element[key] = value;
  } else if (key == "style" && typeof value === "object") {
    Object.assign(element.style, value)
  } else {
    element.setAttribute(key, value)
  }
}

function isProperty(key: string) {
  return /^(checked|disabled|readonly|selected|multiple|value|placeholder|name|type|innerHTML|textContent|className|htmlFor|id|src|href)$/.test(key);
}

function kebab(s: string) {
  return s.replace(/[A-Z]/g, x => "-" + x.toLowerCase());
}
