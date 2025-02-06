import * as output from "../studio/output";
import * as editor from "../studio/editor";
import transport from "../studio/transport";
import { Interpreter } from "./interpreter";

let interpreter: Interpreter = null;

export function stepToNextInstruction() {
  return interpreter.stepToNextInstruction();
}

export function ensureRunning() {
  if (transport.stateIs("ready", "done")) {
    try {
      interpreter = new Interpreter(editor.getCode());
    } catch (err) {
      transport.setState("done");

      const errMessage = /(.*) \((\d+):(\d+)\)\s*$/.exec(err.message);
      if (errMessage) {
        const [, message, msgLine, msgCh] = errMessage;
        const line = +msgLine - 1;
        const ch = +msgCh;
        const { string, start, end } = editor.getToken(line, ch);
        editor.markError(start, end);
        output.error(`${message} '${string}' (${line + 1}:${ch})`);
      } else {
        const message = err.message ?? err;
        output.error(message);
      }

      throw err;
    }
  }
}
