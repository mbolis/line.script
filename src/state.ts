import { DrawingContext } from "./draw";
import { deg2rad, Degrees, rad2deg, Radians, Vector2d } from "./geometry";
import { Stroke } from "./scene";

export class AppState {
  #position: Vector2d;
  #facing: Degrees;
  #height: number;
  #opacity: number;
  #color: string;
  #strokes: Stroke[];
  #foreground: string;
  #background: string;
  #scale: number;
  #offset: Vector2d;
  #speed: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.#position = Vector2d.ORIGIN;
    this.#facing = 0;
    this.#height = 0;
    this.#opacity = 1;
    this.#color = null;
    this.#strokes = [];
    this.#foreground = "black";
    this.#background = null;
    this.#scale = 1;
    this.#offset = Vector2d.ORIGIN;
    this.#speed = 100;
  }

  get position() {
    return this.#position;
  }
  get facing() {
    return this.#facing;
  }
  get facingRadians() {
    return deg2rad(this.#facing);
  }
  get height() {
    return this.#height;
  }
  get opacity() {
    return this.#opacity;
  }
  get color() {
    return this.#color;
  }
  get strokes() {
    return [...this.#strokes];
  }
  get foreground() {
    return this.#foreground;
  }
  get background() {
    return this.#background;
  }
  get scale() {
    return this.#scale;
  }
  get offset() {
    return this.#offset;
  }
  get speed() {
    return this.#speed;
  }

  apply(mutations: AppStateMutations) {
    if (mutations.position !== undefined) {
      this.#position = mutations.position;
    }
    if (mutations.facing !== undefined) {
      this.#facing = mutations.facing;
    }
    if (mutations.facing !== undefined) {
      this.#facing = rad2deg(mutations.facingRadians);
    }
    if (mutations.height !== undefined) {
      this.#height = mutations.height;
    }
    if (mutations.opacity !== undefined) {
      this.#opacity = mutations.opacity;
    }
    if (mutations.color !== undefined) {
      this.#color = mutations.color || null;
    }
    if (mutations.currentStrokes !== undefined) {
      this.#strokes = [...this.strokes, ...mutations.currentStrokes];
    }
    if (mutations.foreground !== undefined) {
      this.#foreground = mutations.foreground || "black";
    }
    if (mutations.background !== undefined) {
      this.#background = mutations.background;
      if (this.#background === "none" || this.#background === "transparent") {
        this.#background = null;
      }
    }
    if (mutations.scale !== undefined) {
      this.#scale = mutations.scale;
    }
    if (mutations.offset !== undefined) {
      this.#offset = mutations.offset;
    }
    if (mutations.speed !== undefined) {
      this.#speed = mutations.speed;
    }
  }

  getDrawableFrame() {
    return new Frame(this.#strokes);
  }
}

export type AppStateMutations = {
  position?: Vector2d;
  facing?: Degrees;
  facingRadians?: Radians;
  height?: number;
  opacity?: number;
  color?: string;
  currentStrokes?: Stroke[];
  foreground?: string;
  background?: string;
  scale?: number;
  offset?: Vector2d;
  speed?: number;
}

const state = new AppState();
export default state;

export class Frame {
  constructor(
    readonly strokes = [] as Stroke[],
  ) { }

  draw(dctx: DrawingContext) {
    for (const stroke of this.strokes) {
      stroke.draw(dctx);
    }
  }
}

export interface Mutation {
  advance(delta: number): [AppStateMutations, number];
  complete(): AppStateMutations | undefined;
}

export class Animation implements Mutation {
  elapsed = 0;

  constructor(
    private readonly duration: number,
    private readonly update: (delta: number, state: AppState) => AppStateMutations,
  ) { }

  advance(delta: number): [AppStateMutations, number] {
    this.elapsed += delta;
    if (this.elapsed < this.duration) {
      return [this.calculate(), 0];
    }

    delta = this.elapsed - this.duration;
    this.elapsed = this.duration;
    return [this.calculate(), delta];
  }

  complete() {
    if (this.elapsed === this.duration) return this.calculate();
  }

  private calculate(): AppStateMutations {
    const ratio = this.elapsed / this.duration;
    return this.update(ratio, state);
  }
}

export class Wait extends Animation {
  constructor(duration: number) {
    super(duration, () => ({}));
  }
}

export class Change extends Animation {
  constructor(update: (state: AppState) => AppStateMutations) {
    super(0, (_, state) => update(state));
  }
}

export class AsyncMutation implements Mutation {
  constructor(private readonly promise: Promise<any>) { } // TODO

  advance(delta: number): [AppStateMutations, number] {
    throw new Error("Method not implemented.");
  }
  complete(): AppStateMutations | undefined {
    throw new Error("Method not implemented.");
  }
}