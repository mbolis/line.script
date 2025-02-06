import { DrawingContext } from "./draw";
import { Segment, Vector2d } from "./geometry";
import state from "./state";

export type Ratio = number;

export class Stroke {
  readonly segment: Segment;

  constructor(
    from: Vector2d,
    to: Vector2d,
    readonly color?: string) {

    this.segment = new Segment(from, to);
  }

  private getDefaultColor(color: string): string {
    return this.color ?? color;
  }

  draw(dctx: DrawingContext) {
    const ctx = dctx.ctx;
    ctx.save();
    ctx.strokeStyle = this.getDefaultColor(state.foreground);
    this.segment.draw(dctx);
    ctx.restore();
  }
}
