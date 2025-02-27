import { Node } from "acorn";
import { JSInterpreter } from "../lib/js-interpreter";
import { Degrees, Vector2d, deg2rad } from "./geometry";

import { Animation, Frame } from "./frames";
import * as output from "./output";
import { Stroke } from "./scene";

import MainLoop from "mainloop.js"; // FIXME: we don't want you here!
import { Bezier } from "./bezier";

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

// type NativeInterpreter = {
//   ast: Node;
//   appendCode: (code: any) => void;
//   step: () => boolean;
//   run: () => boolean;
//   stateStack: State[];
//   paused_: boolean;
//   value: any;
//   //parentScope: any;
//   setProperty(scope: any, name: string, value: any, desc?: PropertyDescriptor): void;
//   createNativeFunction(fn: Function): any;
//   createAsyncFunction(fn: Function): any;
//   //createPrimitive(value: any): any;
//   createObject(value: any): any;
//   getScope(): any;
// };
interface InitFunc {
  (interpreter: JSInterpreter, scope: any): any;
}

export class Instruction {
  constructor(
    readonly currentState: State,
    readonly suspended: boolean,
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
  private interpreter: JSInterpreter;

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
    scope.toString = () => "#GlobalScope";

    let currentColor = "black";
    prop("color", {
      get: fn(() => currentColor),
      set: fn((c: any) => {
        currentColor = String(c);
        this.animation = new Animation(0, (_, keyFrame: Frame) => {
          return keyFrame.with({ color: currentColor });
        });
      }),
    });

    setFn("forward", (distance: number, color = currentColor) => {
      this.animation = new Animation(MOVE_DURATION * distance / 10, (delta: number, keyFrame: Frame) => {
        const from = keyFrame.position, angle = keyFrame.facingRadians;
        const to = from.plus(Vector2d.polar(angle, distance * delta));

        if (keyFrame.height === 0) {
          return keyFrame.with({ position: to, strokes: [...keyFrame.strokes, new Stroke(from, to, color)] });
        }
        return keyFrame.with({ position: to });
      });
    });
    setFn("back", (distance: number, color = currentColor) => {
      this.animation = new Animation(MOVE_DURATION * distance / 10, (delta: number, keyFrame: Frame) => {
        const from = keyFrame.position, angle = keyFrame.facingRadians;
        const to = from.plus(Vector2d.polar(angle, -distance * delta));

        if (keyFrame.height === 0) {
          return keyFrame.with({ position: to, strokes: [...keyFrame.strokes, new Stroke(from, to, color)] });
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
    setFn("bezier", (d1: number, a1: Degrees, d2: number, a2?: Degrees, d3?: number) => {
      if (a2 !== undefined && d3 === undefined) throw new Error(`segment 3 length unspecified`);

      let p0 = Vector2d.ORIGIN;
      let p1 = p0.plus(Vector2d.y(d1));
      let p2 = p1.plus(Vector2d.y(d2).rotate(deg2rad((a1))));
      let p3 = a2 !== undefined && p2.plus(Vector2d.y(d3).rotate(deg2rad((a1 + a2))));
      let firstRun = true;

      const curve = new Bezier(p0, p1, p2, p3);

      this.animation = new Animation(MOVE_DURATION * curve.approxLength / 10, (delta: number, keyFrame: Frame) => {
        if (firstRun) {
          curve.repositionAndCalculate(keyFrame, delta === 1);
          firstRun = false;
        }

        const segments = curve.lookupValues(delta);
        const { position, facing } = segments[segments.length - 1];
        if (keyFrame.height === 0) {
          const strokes = segments.map((f, i) => new Stroke((segments[i - 1] || keyFrame).position, f.position));
          return keyFrame = keyFrame.with({ position, facing, strokes: [...keyFrame.strokes, ...strokes] });
        }
        return keyFrame = keyFrame.with({ position, facing });
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

    let speed = 100;
    prop("speed", {
      get: fn(() => speed),
      set: fn((s: any) => {
        speed = Number(s);
        if (Number.isNaN(speed)) return;
        this.animation = new Animation(0, (_, keyFrame: Frame) => {
          return keyFrame.with({ speed });
        });
      }),
    });

    setFn("ask", (question: any = "", zero?: any) => {
      MainLoop.stop(); // FIXME: find another way to make this sync, please!
      let input = prompt(String(question)); // FIXME: rework into asynchronous style!
      MainLoop.start(); // FIXME:

      if (typeof zero == "number") return +(input || zero);
      if (typeof zero == "boolean") return !!(input || zero);
      return input || zero;
    });

    setAsyncFn("print", (done: () => void, ...words: any[]) => {
      requestAnimationFrame(() => {
        output.info(words.join(" "));
        done();
      });
    });
    setAsyncFn("println", (done: () => void, ...lines: any[]) => {
      requestAnimationFrame(() => {
        output.info(lines.join("\n"));
        done();
      });
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

    setFn("rgb", (r: number, g: number, b: number, a = 1) => {
      checkRange("red", r, 0, 255);
      checkRange("green", g, 0, 255);
      checkRange("blue", b, 0, 255);
      checkRange("alpha", a, 0, 1);

      return `rgb(${r | 0} ${g | 0} ${b | 0} / ${a})`;
    });
    setFn("hsl", (h: number, s: number, l: number, a = 1) => {
      checkRange("saturation", s, 0, 1);
      checkRange("lightness", l, 0, 1);
      checkRange("alpha", a, 0, 1);

      return `hsl(${h | 0} ${s * 100} ${l * 100} / ${a * 100})`;
    });
    function checkRange(name: string, value: number, min: number, max: number) {
      if (value < min) throw new Error(`${name} should be >= ${min} (was ${value})`);
      if (value > max) throw new Error(`${name} should be <= ${max} (was ${value})`);
    }
    function fn(fnWrapper: Function): any {
      return interpreter.createNativeFunction(fnWrapper, false);
    }
    function setFn(name: string, fnWrapper: Function) {
      interpreter.setProperty(scope, name, fn(fnWrapper), JSInterpreter.NONCONFIGURABLE_READONLY_NONENUMERABLE_DESCRIPTOR);
    }
    function prop(name: string, desc: PropertyDescriptor) {
      interpreter.setProperty(scope, name, JSInterpreter.VALUE_IN_DESCRIPTOR, desc);
    }

    type FnWithCallback = (cb: Function, ...args: any[]) => any;
    function setAsyncFn(name: string, fnWrapper: FnWithCallback) {
      interpreter.setProperty(scope, name, interpreter.createAsyncFunction(fnWrapper, true));
    }
  };

  reset() {
    this.interpreter = new JSInterpreter(this.interpreter.ast, this.init);
  }

  private step(): [State, boolean] {
    let recoverState = this.currentState;
    try {
      if (this.interpreter.paused_) {
        return [this.currentState, true]
      }
      if (this.interpreter.step()) {
        return [this.currentState, false];
      }
    } catch (e) {
      e.state = recoverState;
      throw e;
    }
    return [null, false];
  }
  private get currentState(): State {
    return this.interpreter.stateStack[this.interpreter.stateStack.length - 1] as unknown as State;
  }
  private get currentNode(): Node {
    return this.instructionStack.peek();
  }

  private state: State;
  private suspended: boolean;
  private animation: Animation;
  private currentInstruction(): Instruction {
    let instruction = new Instruction(this.state, this.suspended, this.animation);
    this.animation = null;
    return instruction;
  }

  stepToNextInstruction(): Instruction {
    seek: {
      while ([this.state, this.suspended] = this.step()) {
        if (this.suspended) return this.currentInstruction();
        if (!this.state) return null;

        const node = this.state.node;

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