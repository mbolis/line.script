
type Props = Partial<HTMLElement>;
type Child = HTMLElement | Component | Child[];

export function el(tag: string, props: Props = {}, ...children: Child[]) {
const {tagName, id, className} = parseTagName(tag);
  const el = document.createElement(tagName);
  if (id) props.id = id;
  if (className) props.className = (props.className + " " + className).trim();
  Object.assign(el, props);
  el.append(...flatten(children));
  return el;
}

function flatten(c: Child[]) {
  return c.flatMap(c => {
    if (Array.isArray(c)) return flatten(c);
    if ("el" in c) return [c.el];
    return [c];
  });
}

const reTagName = /^([a-z-]*)(.*)/i;
const reDecorators = /^(?:#([\w-]+)|\.([\w-]+))?(.*)/;
function parseTagName(input: string) {
  const result = { tagName: "", id: "", className: "" };
  let [, tagName, rest] = reTagName.exec(input);
  result.tagName = tagName || "div";

  let id: string;
  let className: string;
  while (rest && ([, id, className, rest] = reDecorators.exec(rest))) {
    if (id) {
      if (result.id) throw new Error("el with multiple ids: " + input);
      result.id = id;
    } else if (className) {
      result.className += " " + className;
    } else {
      throw new Error("bad el definition: " + input);
    }
    id = null;
    className = null;
  }

  return result;
}