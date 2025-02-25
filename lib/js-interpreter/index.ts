export { Interpreter as JSInterpreter } from "./interpreter";
import { Interpreter } from "./interpreter";
export type State = ThisParameterType<typeof Interpreter.State>;
