import * as MainLoop from "mainloop.js";

import { Degrees, Vector2d } from "./geometry";
import { SceneState, Ratio, Stroke, PainterState } from "./scene";

type Millis = number;

class AppState {
  constructor(
    readonly scene: SceneState) { }
}

interface Task {
  readonly duration: Millis;
  updateState(baseState: AppState, delta: Millis): AppState;
}
type TaskID = number;
type TaskCallback = (command: TaskCommand, id: TaskID) => void;
class TaskCommandCallback {
  constructor(
    private command: TaskCommand,
    private id: TaskID,
    private callback: TaskCallback) { }

  call() {
    this.callback(this.command, this.id);
  }
}
export type TaskCommand =
  ["line" | "move", number]
  | ["rotate", Degrees]
  | ["up" | "down" | "hide" | "show"];

class PaintingTask implements Task {
  constructor(
    readonly action: PaintingAction,
    readonly duration: Millis,
    readonly instructionNode: any) { } // TODO: keep track of instruction and stack

  private updateScene(baseState: SceneState, delta: Millis): SceneState {
    let completion: Ratio = this.duration === 0 ? 1 : delta / this.duration;
    return this.action.update(baseState, Math.min(Math.max(0, completion), 1));
  }

  updateState(baseState: AppState, delta: number): AppState {
    return new AppState(this.updateScene(baseState.scene, delta));
  }

}

interface PaintingAction {
  update(state: SceneState, delta: Ratio): SceneState;
}
class LineAction implements PaintingAction {
  private readonly distanceVector: Vector2d;
  constructor(readonly length: number) {
    this.distanceVector = Vector2d.y(length);
  }

  update(state: SceneState, delta: Ratio): SceneState {
    let deltaVector = this.distanceVector.scale(delta).rotate(state.painter.facingRadians);
    let targetPosition = state.painter.position.plus(deltaVector);

    return state.update({
      painter: { position: targetPosition },
      drawing: [new Stroke(state.painter.position, targetPosition)]
    });
  }
}
class MoveAction implements PaintingAction {
  private readonly distanceVector: Vector2d;
  constructor(readonly length: number) {
    this.distanceVector = Vector2d.y(length);
  }

  update(state: SceneState, delta: Ratio): SceneState {
    let deltaVector = this.distanceVector.rotate(state.painter.facingRadians).scale(delta);
    let targetPosition = state.painter.position.plus(deltaVector);
    return state.update({
      painter: { position: targetPosition }
    });
  }
}
class RotateAction implements PaintingAction {
  constructor(readonly angle: Degrees) { }

  update(state: SceneState, _delta: Ratio): SceneState {
    let targetFacing = state.painter.facing + this.angle;
    return state.update({
      painter: { facing: targetFacing }
    });
  }
}
class PitchAction implements PaintingAction {
  constructor(readonly targetHeight: number) { }

  update(state: SceneState, _delta: Ratio): SceneState {
    return state.update({
      painter: { height: this.targetHeight }
    });
  }
}
class ShowAction implements PaintingAction {
  constructor(readonly targetOpacity: number) { }

  update(state: SceneState, _delta: Ratio): SceneState {
    return state.update({
      painter: { opacity: this.targetOpacity }
    });
  }
}

export function nextTick(fn: () => void) {
  Promise.resolve().then(fn);
}

export class Scheduler {
  private snapshots: AppState[] = [
    new AppState(
      new SceneState(
        new PainterState({
          position: Vector2d.ORIGIN,
          facing: 0,
          height: 0,
          opacity: 1
        })))
  ];

  private tasks: Task[] = [];
  private pendingIndex: number = 0;

  private elapsedTime: Millis = 0;
  private isAnimating = false;

  private taskCallbacks: TaskCommandCallback[] = [];

  constructor(draw: (scene: SceneState) => void) {
    MainLoop
      .setBegin(() => this.begin())
      .setUpdate((delta) => this.update(delta))
      .setDraw(() => draw(this.scene))
      .setEnd(() => this.end())
      .start()
  }

  get snapshot(): AppState {
    return this.snapshots[this.snapshots.length - 1];
  }
  get scene(): SceneState {
    return this.snapshot.scene;
  }
  get pendingTask(): Task {
    return this.tasks[this.pendingIndex];
  }

  private begin() {
    this.isAnimating = false;
  }

  private update(delta: Millis) {
    let task: Task;
    let elapsedTime: Millis;

    if (this.isAnimating) {
      this.snapshots.pop();
    }

    while (task = this.pendingTask) {
      elapsedTime = this.elapsedTime + delta;
      if (elapsedTime < task.duration) {
        break;
      }

      let nextSnapshot = task.updateState(this.snapshot, 1);
      this.snapshots.push(nextSnapshot);
      delta = elapsedTime - task.duration;
      this.elapsedTime = 0;

      let taskCallback = this.taskCallbacks[this.pendingIndex];
      if (taskCallback) {
        taskCallback.call();
      }

      this.pendingIndex++;
    }

    if (this.isAnimating = !!task) {
      let nextSnapshot = task.updateState(this.snapshot, elapsedTime);
      this.snapshots.push(nextSnapshot);
      this.elapsedTime = elapsedTime;
    }
  }

  private end() {
    if (this.isAnimating) {
      this.snapshots.pop();
    }
  }

  enqueue(command: TaskCommand, duration: Millis, then?: TaskCallback) {
    let [op, ...args] = command;
    let action: PaintingAction;
    switch (op) {
      case "line":
        action = new LineAction(args[0] as number);
        break;
      case "move":
        action = new MoveAction(args[0] as number);
        break;
      case "rotate":
        action = new RotateAction(args[0] as Degrees);
        break;
      case "up":
        action = new PitchAction(1);
        break;
      case "down":
        action = new PitchAction(0);
        break;
      case "show":
        action = new ShowAction(1);
        break;
      case "hide":
        action = new ShowAction(0);
        break;
      default:
        throw new Error(`Unrecognized operation: ${op}`);
    }

    let taskId = this.tasks.push(new PaintingTask(action, duration, null)) - 1;
    this.taskCallbacks[taskId] = new TaskCommandCallback(command, taskId, then);
  }
}