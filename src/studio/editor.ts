import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

import { debounce } from "../util";

const txtCode = document.getElementById("code") as HTMLTextAreaElement;
const editor = CodeMirror.fromTextArea(txtCode, {
  lineNumbers: true,
  mode: "javascript",
  tabSize: 2,
});
export const el = editor.getWrapperElement();

export function getCode() {
  editor.save();
  return txtCode.value;
}
export function setCode(code: string) {
  editor.setValue(code);
}

export function onChange(cb: (value: string) => void) {
  editor.on("change", debounce(() => cb(editor.getValue()), 400));
}

export function clearMarks() {
  editor.getDoc().getAllMarks().forEach(mark => mark.clear());
}

type MarkPosition = number | CodeMirror.Position;

const origin = CodeMirror.Pos(0, 0);

function Pos(pos: MarkPosition) {
  return typeof pos === "number" ? editor.findPosH(origin, pos, "char", true) : pos;
}

export function mark(start: MarkPosition, end: MarkPosition, bg: string) {
  editor.getDoc().markText(Pos(start), Pos(end), { css: `background: ${bg}` });
}
export function markInstruction(start: MarkPosition, end: MarkPosition) {
  mark(start, end, "rgba(128,255,128,0.4)");
}
export function markError(start: MarkPosition, end: MarkPosition) {
  mark(start, end, "rgba(255,128,128,0.4)");
}

export function getToken(line: number, ch: number) {
  const token = editor.getLineTokens(line, true).find(token => token.start === ch);
  const start = CodeMirror.Pos(line, ch);
  const end = CodeMirror.Pos(line, ch + token.string.length);
  return { ...token, start, end };
}
