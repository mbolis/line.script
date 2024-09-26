import { Segment, Vector2d, Degrees, Radians, deg2rad } from "./geometry";

export type Ratio = number;

type SceneInfo = {
  readonly painter?: PainterInfo;
  readonly drawing?: Stroke[];
};
export class SceneState implements SceneInfo {
  constructor(
    readonly painter: PainterState,
    readonly drawing: Stroke[] = []) { }

  update(scene: SceneInfo): SceneState {
    return new SceneState(
      scene.painter ? this.painter.update(scene.painter) : this.painter,
      scene.drawing ? this.drawing.concat(scene.drawing) : this.drawing);
  }
}

export class Stroke {
  readonly segment: Segment;
  constructor(
    private from: Vector2d,
    private to: Vector2d,
    readonly color = "") {

    this.segment = new Segment(from, to);
  }

  defaultColor(color: string): Stroke {
    if (this.color) {
      return this;
    } else {
      return new Stroke(this.from, this.to, color);
    }
  }

  draw(ctx: CanvasRenderingContext2D, scale = 1) {
    ctx.save();
    if (this.color) {
      ctx.strokeStyle = this.color;
    }
    this.segment.scaled(scale).draw(ctx);
    ctx.restore();
  }
}

type PainterInfo = {
  readonly position?: Vector2d;
  readonly facing?: Degrees;
  readonly height?: Ratio;
  readonly opacity?: Ratio;
};
export class PainterState implements PainterInfo {
  readonly position: Vector2d;
  readonly facing: Degrees;
  readonly height: Ratio;
  readonly opacity: Ratio;

  constructor(
    base: PainterInfo,
    {
      position = base.position,
      facing = base.facing,
      height = base.height,
      opacity = base.opacity
    } = {} as PainterInfo) {

    this.position = position;
    this.facing = facing;
    this.height = height;
    this.opacity = opacity;
  }

  get facingRadians(): Radians {
    return deg2rad(this.facing);
  }

  update(info: PainterInfo): PainterState {
    return new PainterState(this, info);
  }
}
