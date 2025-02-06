import MainLoop from "mainloop.js";
import { DrawingContext } from "../draw";
import * as engine from "../engine";
import { paper, robot } from "../gui";
import state, { AppStateMutations, Mutation, Wait } from "../state";
import * as canvas from "./canvas";
import * as editor from "./editor";
import * as output from "./output";
import transport, { isTraceEnabled } from "./transport";
import events, { EventType as E } from "../events";

const MAX_LOOP_COUNT = 10000;

class PainterStudio {
  private mutation: Mutation;
  private isFreezing = false;

  constructor() {
    events.on(E.STATE_READY, () => this.reset());
    events.on(E.STATE_PLAYING, () => this.animate());
    events.on(E.STATE_FAST_FWD, () => this.animate());
    events.on(E.STATE_PAUSED, () => this.freeze());
    events.on(E.STATE_STEP_FWD, () => this.stepAnimate());
    events.on(E.STATE_DONE, () => {
      editor.clearMarks(); // TODO can be moved to editor...
      this.freeze();
    });

    events.on(E.REPAINT, () => this.draw());

    MainLoop.setDraw(() => this.draw());
    this.reset();
  }

  reset() {
    if (MainLoop.isRunning()) {
      MainLoop.stop();
    }

    this.mutation = null;

    editor.clearMarks();
    output.clear();
    state.reset();

    this.draw();
  }

  animate() {
    engine.ensureRunning();
    output.clear();
    this.reset();

    this.isFreezing = false;
    if (!MainLoop.isRunning()) {
      MainLoop.start();
    }
  }
  freeze() {
    this.isFreezing = true;
  }

  stepAnimate() {
    this.animate();

    if (this.getMutation()) {
      const completeMutation = this.mutation.complete();
      if (completeMutation) {
        state.apply(completeMutation);
        this.mutation = null;
      }

      transport.setState("paused");
    } else {
      transport.setState("done");
    }
  }

  private getMutation(infiniteLoopDetector = 0) {
    if (this.mutation) return this.mutation;

    try {
      const instruction = engine.stepToNextInstruction();

      if (instruction) {
        if (isTraceEnabled()) {
          editor.clearMarks();
          editor.markInstruction(instruction.node.start, instruction.node.end);

          return this.mutation = instruction.mutation || new Wait(10);

        } else if (instruction.mutation) {
          return this.mutation = instruction.mutation;

        } else if (infiniteLoopDetector < MAX_LOOP_COUNT) {
          return this.getMutation(infiniteLoopDetector + 1);

        } else {
          editor.clearMarks();
          editor.markError(instruction.node.start, instruction.node.end);

          output.clear();
          output.error("WARNING: Possible infinite loop!");

          return this.mutation = new Wait(transport.stateIs("fast-fwd") ? 20000 : 20);
        }
      }
    } catch (err) {
      if (infiniteLoopDetector == 0) {
        transport.setState("done");
        editor.markError(err.state.node.start, err.state.node.end)
        output.error(err.message);
      }
      throw err;
    }

    return this.mutation = null;
  }

  update(delta: number): boolean {
    if (this.isFreezing) {
      MainLoop.stop();
      return;
    }

    if (!this.getMutation()) {
      return false;
    }

    delta = delta / 1000 * state.speed;

    while (this.getMutation()) {
      let mutations: AppStateMutations;
      [mutations, delta] = this.mutation.advance(delta);

      if (delta <= 0) {
        state.apply(mutations);
        return true;
      }
    }

    return false;
  }

  draw() {
    DrawingContext
      .get(canvas.ctx)
      .draw([
        paper,
        state.getDrawableFrame(),
        robot,
      ]);
  }
}

export default new PainterStudio();