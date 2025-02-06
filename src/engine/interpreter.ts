import { Node } from "acorn";
import JSInterpreter from "js-interpreter";
import { deg2rad, Degrees, Vector2d } from "../geometry";

import * as output from "../studio/output";
import { Stroke } from "../scene";
import state, { Animation, Change, Mutation, Wait } from "../state";

import MainLoop from "mainloop.js"; // FIXME: we don't want you here!
import { Bezier } from "../bezier";

type State = {
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
  createAsyncFunction(fn: Function): any;
  createPrimitive(value: any): any;
  createObject(value: any): any;
  getScope(): any;
};
interface InitFunc {
  (interpreter: NativeInterpreter, scope: any): any;
}

export class Instruction {
  constructor(
    readonly currentState: State,
    readonly mutation: Mutation) { }

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

class Stack<T> extends Array<T> {
  constructor() {
    super();
  }

  peek() {
    return this[this.length - 1];
  }
}

const MOVE_DURATION = 5;
const ROTATE_DURATION = 1;
const RISE_DURATION = 25;
const FALL_DURATION = 25;
const FADE_DURATION = 25;
const WAIT_DURATION = 80;

export class Interpreter {
  private interpreter: NativeInterpreter;
  private instructionStack = new Stack<Node>();

  constructor(readonly code: string) {
    this.interpreter = new JSInterpreter(code, this.init);
    this.interpreter.getScope().strict = true
  }

  private readonly init: InitFunc = (interpreter, scope) => {
    scope.toString = () => "#GlobalScope";

    setFn("forward", (distance: number, color = state.color) => {
      this.mutation = new Animation(MOVE_DURATION * distance, (delta, s) => {
        const position = s.position.plus(Vector2d.polar(s.facingRadians, distance * delta));
        return {
          position,
          ...s.height === 0 && { currentStrokes: [new Stroke(s.position, position, color)] },
        }
      });
    });
    setFn("back", (distance: number, color = state.color) => {
      this.mutation = new Animation(MOVE_DURATION * distance, (delta, s) => {
        const position = s.position.plus(Vector2d.polar(s.facingRadians, -distance * delta));
        return {
          position,
          ...s.height === 0 && { currentStrokes: [new Stroke(s.position, position, color)] },
        }
      });
    });
    setFn("right", (angle: Degrees) => {
      this.mutation = new Animation(ROTATE_DURATION * angle, (delta, { facing }) => ({
        facing: facing - angle * delta,
      }));
    });
    setFn("left", (angle: Degrees) => {
      this.mutation = new Animation(ROTATE_DURATION * angle, (delta, { facing }) => ({
        facing: facing + angle * delta,
      }));
    });
    setFn("bezier", (d1: number, a1: Degrees, d2: number, a2?: Degrees, d3?: number) => {
      if (a2 !== undefined && d3 === undefined) throw new Error(`segment 3 length unspecified`);

      let p0 = Vector2d.ORIGIN;
      let p1 = p0.plus(Vector2d.y(d1));
      let p2 = p1.plus(Vector2d.y(d2).rotate(deg2rad((a1))));
      let p3 = a2 !== undefined && p2.plus(Vector2d.y(d3).rotate(deg2rad((a1 + a2))));
      let firstRun = true;

      const curve = new Bezier(p0, p1, p2, p3);

      this.mutation = new Animation(MOVE_DURATION * curve.approxLength, (delta, state) => {
        if (firstRun) {
          curve.repositionAndCalculate(state, delta === 1);
          firstRun = false;
        }

        const segments = curve.lookupValues(delta);
        const { position, facing } = segments[segments.length - 1];

        return {
          position, facing,
          ...state.height === 0 && segments.map(
            (f, i) => new Stroke((segments[i - 1] || state).position, f.position)
          ),
        };
      });
    });
    setFn("up", () => {
      this.mutation = new Animation(RISE_DURATION, (delta) => ({ height: delta }));
    });
    setFn("down", () => {
      this.mutation = new Animation(FALL_DURATION, (delta) => ({ height: 1 - delta }));
    });
    setFn("hide", () => {
      this.mutation = new Animation(FADE_DURATION, (delta) => ({ opacity: 1 - delta }));
    });
    setFn("show", () => {
      this.mutation = new Animation(FADE_DURATION, (delta) => ({ opacity: delta }));
    });

    prop("color", {
      get: fn(() => state.color),
      set: fn((color: any) => {
        color = String(color);
        this.mutation = new Change(() => ({ color }));
      }),
    });
    prop("foreground", {
      get: fn(() => state.foreground),
      set: fn((foreground: any) => {
        foreground = String(foreground);
        this.mutation = new Change(() => ({ foreground }));
      }),
    });
    prop("background", {
      get: fn(() => state.background),
      set: fn((background: any) => {
        background = String(background);
        this.mutation = new Change(() => ({ background }));
      }),
    });

    prop("speed", {
      get: fn(() => state.speed),
      set: fn((speed: any) => {
        speed = Number(speed);
        if (Number.isNaN(speed)) throw new Error("speed must be a number");
        this.mutation = new Change(() => ({ speed }));
      }),
    });

    setAsyncFn("ask", (question = "", zero: any, done: (v: any | null) => void) => {
      MainLoop.stop(); // FIXME: find another way to make this sync, please!
      let input = prompt(String(question)); // FIXME: rework into asynchronous style!
      MainLoop.start(); // FIXME:

      if (typeof zero == "number") Promise.resolve(+(input || zero)).then(done);
      if (typeof zero == "boolean") Promise.resolve(!!(input || zero)).then(done);
      Promise.resolve(input || zero).then(done);
    });

    setFn("print", (...words: any[]) => {
      output.info(words.join(" "));
    });
    setFn("println", (...lines: any[]) => {
      output.info(lines.join("\n") + "\n");
    });

    setFn("wait", (seconds: number) => {
      this.mutation = new Wait(seconds * WAIT_DURATION);
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

    function setFn(name: string, fnWrapper: Function) {
      interpreter.setProperty(scope, name, fn(fnWrapper), JSInterpreter.READONLY_NONENUMERABLE_DESCRIPTOR);
    }
    function fn(wrapper: Function) {
      return interpreter.createNativeFunction(wrapper);
    }
    function prop(name: string, desc: PropertyDescriptor) {
      interpreter.setProperty(scope, name, JSInterpreter.VALUE_IN_DESCRIPTOR, desc);
    }
    type FnWithCallback = (...args: [...params: any[], cb: (v: any) => void]) => any;
    function setAsyncFn(name: string, fnWrapper: FnWithCallback) {
      interpreter.setProperty(scope, name, interpreter.createAsyncFunction(fnWrapper));
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
  private get currentNode() {
    return this.instructionStack.peek();
  }

  private state: State;
  private mutation: Mutation;
  private makeCurrentInstruction(): Instruction {
    const instruction = new Instruction(this.state, this.mutation);
    this.mutation = null;
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

    return this.makeCurrentInstruction();
  }
};