import JSInterpreter from "js-interpreter";
import { Node } from "acorn";
import { Degrees, Vector2d } from "./geometry";

import { Animation, Frame } from "./frames";
import { Stroke } from "./scene";
import * as output from "./output";

import MainLoop from "mainloop.js" // FIXME: we don't want you here!

export type State = {
  node: Node;
  value?: any;
  mode_?: any;
  isLoop?: boolean;
  n_?: number;
  doneVariable_: true;

  // Call
  doneCallee_?: boolean;
  doneArgs_?: boolean;
  doneExec_?: boolean;
  arguments_?: Node[];

  // Switch
  test_?: boolean;
  index_?: number;
  checked_?: boolean[];
  switchValue_?: any;
  isSwitch?: boolean;

  // Try
  doneBlock_?: boolean;
  doneHandler_?: boolean;
  doneFinalizer_?: boolean;
  throwValue?: any;
}

type NativeInterpreter = {
  ast: Node;
  appendCode: (code: any) => void;
  step: () => boolean;
  run: () => boolean;
  stateStack: State[];
  value: any;
  parentScope: any;
  setProperty(scope: any, name: string, value: any, desc?: PropertyDescriptor);
  createNativeFunction(fn: Function): any;
  createPrimitive(value: any): any;
  createObject(value: any): any;
  getScope(): any;
};
interface InitFunc {
  (interpreter: NativeInterpreter, scope: any): any;
}

export interface Environment {
  forward(distance: number): void;
  back(distance: number): void;
  left(angle: Degrees): void;
  right(angle: Degrees): void;
  up(): void;
  down(): void;
  hide(): void;
  show(): void;
}

export class Instruction {
  constructor(
    readonly currentState: State,
    readonly animation: Animation) { }

  get node() {
    let state = this.currentState, node = state.node;
    if (node.type === "ForStatement") {
      if (state.mode_ === 1) {
        node = (<any>node).test;
      } else if (state.mode_ === 3) {
        node = (<any>node).update;
      }
    } else if (node.type === "ForInStatement") {
      if (state.isLoop) {
        node = {
          type: "ForInUpdate",
          start: (<any>node).left.start,
          end: (<any>node).right.end,
        };
      }
    } else if (/(Do|While)Statement/.test(node.type) && state.isLoop) {
      node = (<any>node).test
    } else if (node.type === "IfStatement") {
      if (state.mode_ === 1) {
        node = (<any>node).test;
      }
    } else if (node.type === "SwitchStatement") {
      if (state.switchValue_ && +state.value === +state.switchValue_) {
        node = (<any>node).cases[state.index_];
      } else if (state.test_) {
        node = (<any>node).discriminant;
      }
    } else if (node.type === "TryStatement") {
      if (state.throwValue) {
        node = (<any>node).handler.param;
      }
    } else if (node.type === "ConditionalExpression") {
      if (state.mode_ === 1) {
        node = (<any>node).test;
      } else if (state.mode_ === 2) {
        if ((<any>node).test_) {
          node = (<any>node).consequent;
        } else {
          node = (<any>node).alternate;
        }
      }
    } else if (node.type === "SequenceExpression") {
      if (state.n_) {
        node = (<any>node).expressions[state.n_ - 1];
      }
    } else if (node.type === "CallExpression") {
      if (state.n_ && !state.doneArgs_) {
        node = (<any>node).arguments[state.n_ - 1];
      }
    }

    return node;
  }
}

interface Stack<T> {
  push(item: T): number;
  pop(): T;
  peek(): T;
  map<R>(fn: (t: T) => R): R;
}

const MOVE_DURATION = 50;
const ROTATE_DURATION = 25;
const RISE_DURATION = 25;
const FALL_DURATION = 25;
const FADE_DURATION = 25;
//const WAIT_DURATION = 10;

export class Interpreter {
  private interpreter: NativeInterpreter;

  private instructionStack: Stack<Node> = (() => {
    let instructionStack = [] as any;
    instructionStack.peek = function (): Node {
      return this[this.length - 1];
    };
    return instructionStack as Stack<Node>;
  })();

  constructor(readonly code: string) {
    this.interpreter = new JSInterpreter(code, this.init);
    this.interpreter.getScope().strict = true
  }

  private readonly init: InitFunc = (interpreter, scope) => {
    setFn("forward", (distance: number, color?: string) => {
      this.animation = new Animation(MOVE_DURATION * distance / 10, (delta: number, keyFrame: Frame) => {
        let from = keyFrame.position, angle = keyFrame.facingRadians;
        let to = from.plus(Vector2d.polar(angle, distance * delta));

        if (keyFrame.height === 0) {
          return keyFrame.with({ position: to, newStrokes: [new Stroke(from, to, color)] });
        }
        return keyFrame.with({ position: to });
      });
    });
    setFn("back", (distance: number, color?: string) => {
      this.animation = new Animation(MOVE_DURATION * distance / 10, (delta: number, keyFrame: Frame) => {
        let from = keyFrame.position, angle = keyFrame.facingRadians;
        let to = from.plus(Vector2d.polar(angle, -distance * delta));

        if (keyFrame.height === 0) {
          return keyFrame.with({ position: to, newStrokes: [new Stroke(from, to, color)] });
        }
        return keyFrame.with({ position: to });
      });
    });
    setFn("right", (angle: Degrees) => {
      this.animation = new Animation(ROTATE_DURATION * angle / 30, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ facing: keyFrame.facing - angle * delta });
      });
    });
    setFn("left", (angle: Degrees) => {
      this.animation = new Animation(ROTATE_DURATION * angle / 30, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ facing: keyFrame.facing + angle * delta });
      });
    });
    setFn("up", () => {
      this.animation = new Animation(RISE_DURATION, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ height: delta });
      });
    });
    setFn("down", () => {
      this.animation = new Animation(FALL_DURATION, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ height: 1 - delta });
      });
    });
    setFn("hide", () => {
      this.animation = new Animation(FADE_DURATION, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ opacity: 1 - delta });
      });
    });
    setFn("show", () => {
      this.animation = new Animation(FADE_DURATION, (delta: number, keyFrame: Frame) => {
        return keyFrame.with({ opacity: delta });
      });
    });

    let foreground = "black";
    prop("foreground", {
      get: fn(() => foreground),
      set: fn((fg: any) => {
        foreground = String(fg);
        this.animation = new Animation(0, (_, keyFrame: Frame) => {
          return keyFrame.with({ foreground });
        });
      }),
    });

    let background = "none";
    prop("background", {
      get: fn(() => background),
      set: fn((bg: any) => {
        background = String(bg);
        this.animation = new Animation(0, (_, keyFrame: Frame) => {
          return keyFrame.with({ background });
        });
      }),
    });

    setFn("ask", (question: any) => {
      MainLoop.stop(); // FIXME: find another way to make this sync, please!
      let input = prompt(String(question)); // FIXME: rework into asynchronous style!
      MainLoop.start(); // FIXME:

      return input;
    });

    // FIXME: no document.getElementById here!
    setFn("print", (...words: any[]) => {
      output.info(words.join(" "));
    });
    setFn("println", (...lines: any[]) => {
      output.info(lines.join("\n") + "\n");
    });

    setFn("wait", (seconds: number) => {
      this.animation = new Animation(seconds * 80, (_, keyFrame: Frame) => keyFrame); // FIXME: Magic Number!
    });

    setFn("random", (min?: number, max?: number) => {
      if (typeof min === "undefined") {
        return Math.random();
      }
      if (typeof max === "undefined") {
        max = min;
        min = 0;
      }
      let delta = max - min;
      return min + Math.random() * delta | 0;
    });

    setFn("rgb", (r: number, g: number, b: number, a?: number) => {
      checkRange("red", r, 0, 255);
      checkRange("green", g, 0, 255);
      checkRange("blue", b, 0, 255);
      checkRange("alpha", a, 0, 1);

      return `rgb(${r | 0} ${g | 0} ${b | 0} / ${a})`;
    });
    setFn("hsl", (h: number, s: number, l: number, a?: number) => {
      checkRange("saturation", s, 0, 1);
      checkRange("lightness", l, 0, 1);
      checkRange("alpha", a, 0, 1);

      return `hsl(${h | 0} ${s} ${l} / ${a})`;
    });
    function checkRange(name: string, value: number, min: number, max: number) {
      if (value < min) throw new Error(`${name} should be >= ${min} (was ${value})`);
      if (value > max) throw new Error(`${name} should be <= ${max} (was ${value})`);
    }

    function setFn(name: string, fnWrapper: Function) {
      interpreter.setProperty(scope, name, fn(fnWrapper));
    }
    function fn(wrapper: Function) {
      return interpreter.createNativeFunction(wrapper);
    }
    function prop(name: string, desc: PropertyDescriptor) {
      interpreter.setProperty(scope, name, JSInterpreter.VALUE_IN_DESCRIPTOR, desc);
    }
  };

  reset() {
    this.interpreter = new JSInterpreter(this.interpreter.ast, this.init);
  }

  private step(): State {
    let recoverState = this.currentState;
    try {
      if (this.interpreter.step()) {
        return this.currentState;
      }
    } catch (e) {
      e.state = recoverState;
      throw e;
    }
    return null;
  }
  private get currentState(): State {
    return this.interpreter.stateStack[this.interpreter.stateStack.length - 1];
  }
  private get currentNode(): Node {
    return this.instructionStack.peek();
  }

  private state: State;
  private animation: Animation;
  private currentInstruction(): Instruction {
    let instruction = new Instruction(this.state, this.animation);
    this.animation = null;
    return instruction;
  }

  stepToNextInstruction(): Instruction {
    seek: {
      while (this.state = this.step()) {
        let node = this.state.node;

        if (node.type === "ForStatement") {
          if (node !== this.currentNode) {
            this.instructionStack.push(node);
            break seek;
          } else if (this.state.mode_ === 1) {
            break seek; // return For.TestInstruction
          } else if (this.state.mode_ === 3) {
            break seek; // return For.UpdateInstruction
          } else if (this.state.mode_ === 2) {
            if (!this.state.value || !this.state.value.data) {
              this.instructionStack.pop();
            }
            break seek;
          }
        } else if (node.type === "ForInStatement") {
          if (!this.state.doneVariable_) {
            break seek;
          } else if (this.state.isLoop) {
            break seek; // return ForIn.Update
          }
        } else if (/(Do|While)Statement/.test(node.type)) {
          if (node !== this.currentNode) {
            this.instructionStack.push(node);
            break seek;
          } else if (this.state.isLoop) {
            if (!this.state.value || !this.state.value.data) {
              this.instructionStack.pop();
            }
            break seek; // return While.TestInstruction
          }
        } else if (node.type === "BlockStatement") {
          if (!this.state.n_) {
            break seek;
          }
        } else if (node.type === "IfStatement") {
          if (!this.state.mode_) {
            this.instructionStack.push(node);
            break seek;
          } else if (this.state.mode_ === 1) {
            if (!this.state.value.data) {
              this.instructionStack.pop();
            }
            break seek; // return If.TestInstruction
          } else if (this.state.mode_ === 2) {
            this.instructionStack.pop();
          }
        } else if (node.type === "SwitchStatement") {
          if (this.state.switchValue_) {
            if (!this.state.isSwitch && +this.state.value === +this.state.switchValue_) {
              break seek; // return Switch.Found
            }
          } else if (this.state.test_) {
            break seek; // return Switch.TestInstruction
          } else {
            break seek;
          }
        } else if (node.type === "TryStatement") {
          if (this.state.throwValue) {
            break seek; // return Try.CatchBlock
          } else if (!this.state.doneBlock_) {
            break seek; // return Try.TryBlock
          }
        } else if (node.type === "ConditionalExpression") {
          if (!this.state.mode_) {
            break seek;
          } else if (this.state.mode_ === 1) {
            (<any>node).test_ = this.state.value.data;
            this.instructionStack.push(node);
            break seek; // return Elvis.TestInstruction
          } else if (this.state.mode_ === 2) {
            if ((<any>this.instructionStack.pop()).test_) {
              break seek; // return Elvis.Consequent
            } else {
              break seek; // return Elvis.Alternate
            }
          }
        } else if (node.type === "SequenceExpression") {
          if (!this.state.n_) {
            break seek;
          } else {
            break seek; // return Sequence.Element(this.state.n_)
          }
        } else if (node.type === "CallExpression") {
          if (this.state.doneExec_) {
            this.instructionStack.pop();
          } else if (this.state.n_) {
            break seek; // return Call.Args(this.state.n_)
          } else if (this.state.doneCallee_) {
            // break seek; // return Call.Fn(String(this.state.value))
          } else {
            this.instructionStack.push(node);
          }
        } else if (/(Break|Continue)Statement/.test(node.type)) {
          break seek;
        } else if (/^(?!Function).*(Statement|Declaration)/.test(node.type)) {
          if (node === this.currentNode) {
            this.instructionStack.pop();
            break seek;
          } else {
            this.instructionStack.push(node);
            //break seek;
          }
        } else {
          //console.log("???", node.type)
        }
      }
      return null;
    }

    return this.currentInstruction();
  }
};