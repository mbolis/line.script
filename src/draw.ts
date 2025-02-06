import { Segment, Vector2d } from "./geometry";
import state from "./state";

const ctxMap = new WeakMap<CanvasRenderingContext2D, DrawingContext>();

export const DEFAULT_SCALE = 3.2;

export interface Drawable {
  draw(ctx: DrawingContext): void;
}

export class DrawingContext {

  static get(ctx: CanvasRenderingContext2D) {
    let dctx = ctxMap.get(ctx);
    if (!dctx) {
      ctxMap.set(ctx, dctx = new DrawingContext(ctx));
    }
    return dctx;
  }

  private get scale() {
    return state.scale * DEFAULT_SCALE;
  }
  getScaled<T extends number | Segment | Vector2d>(x: T): T {
    if (typeof x === "number") {
      return x * this.scale as T;
    }
    if (x instanceof Segment) {
      return x.scaled(this.scale) as T;
    }
    if (x instanceof Vector2d) {
      return x.scale(this.scale) as T;
    }
  }

  private constructor(
    readonly ctx: CanvasRenderingContext2D,
  ) { }

  draw(objects: Drawable[]) {
    for (const o of objects) {
      o.draw(this);
    }
  }
}
