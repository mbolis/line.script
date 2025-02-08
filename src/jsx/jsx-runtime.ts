import flyd from "flyd";
import { mount } from ".";

export namespace JSX {
  export type Element = HTMLElement | string | Element[];
}

export const jsx = el;
export const jsxs = el;
export const Fragment = Symbol("fragment");

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type Props<T extends object> = Overwrite<
  { [k in keyof T]: T[k] | flyd.Stream<T[k]> },
  { children: JSX.Element }
>;
type Component<T extends object> = (props: T) => JSX.Element;

export function el(tag: string, props: Props<HTMLElement>, _key?: string): JSX.Element;
export function el(tag: typeof Fragment, props: Props<{}>, _key?: string): JSX.Element;
export function el<T extends object>(tag: Component<T>, props: T, _key?: string): JSX.Element;
export function el<T extends object>(tag: string | typeof Fragment | Component<T> | undefined, props: Props<HTMLElement> | T, _key?: string): JSX.Element {
  if (typeof tag === "function") {
    return tag(props as T);
  }
  if (typeof tag === "symbol") {
    return [(props as Props<{}>).children].flat();
  }

  const { tagName, id, className } = parseTag(tag);
  props = props as Props<HTMLElement>;
  if (id) props.id = id;
  if (className) props.className = (props.className ? props.className + " " + className : className);

  const element = document.createElement(tagName);

  for (const key in props) {
    if (key === "children") continue;

    const value = props[key];

    if (isStream(value)) {
      element[key] = value();
      value.map((v: any) => element[key] = v);
    } else {
      setAttribute(element, key, value);
    }
  }

  mount(props.children, element);
  console.log(tag, props, element)

  return element;
}

function parseTag(tag: string) {
  const out = {} as { tagName: string, id: string, className: string };
  let rest: string;
  [, out.tagName, rest] = /^([-a-z]*)(.*)?/i.exec(tag)!;
  if (!out.tagName) out.tagName = "div";

  const classes = [] as string[];
  let result: RegExpExecArray | null;
  while (rest && (result = /^(?:#([\w-]+)|\.([\w-]+))?(.*)/.exec(rest))) {
    let id: string, className: string;
    [, id, className, rest] = result;
    if (id) out.id = id;
    else if (className) classes.push(className);
    else break;
  }

  out.className = classes.join(" ");
  return out;
}

function isStream(x: any): x is flyd.Stream<any> {
  return flyd.isStream(x);
}

function setAttribute(element: HTMLElement, key: string, value: any) {
  if (/^(role$|aria[-A-Z])/.test(key)) {
    element.setAttribute(kebab(key), value);
  } else {
    element[key] = value;
  }
}

function kebab(s: string) {
  return s.replace(/[A-Z]/g, x => "-" + x.toLowerCase());
}
