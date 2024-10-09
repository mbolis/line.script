import { Vector2d, Degrees, Radians, deg2rad } from "./geometry";
import { Stroke } from "./scene";

type FrameMutations = {
  position?: Vector2d;
  facing?: Degrees;
  height?: number;
  opacity?: number;
  newStrokes?: Stroke[];
  foreground?: string;
  background?: string;
  speed?: number;
}
export class Frame {
  static new() {
    return new Frame;
  }

  private constructor(
    readonly position: Vector2d = Vector2d.ORIGIN,
    readonly facing: Degrees = 0,
    readonly height = 0,
    readonly opacity = 1,
    readonly strokes: Stroke[] = [],
    readonly foreground = "",
    readonly background = "",
    readonly speed = 100,
  ) { }

  get facingRadians(): Radians {
    return deg2rad(this.facing);
  }

  with(properties: FrameMutations): Frame {
    return new Frame(
      properties.position || this.position,
      "facing" in properties ? properties.facing : this.facing,
      "height" in properties ? properties.height : this.height,
      "opacity" in properties ? properties.opacity : this.opacity,
      "newStrokes" in properties ? this.strokes.concat(properties.newStrokes) : this.strokes,
      "foreground" in properties ? properties.foreground : this.foreground,
      "background" in properties ? properties.background : this.background,
      "speed" in properties ? properties.speed : this.speed);
  }
}

export class Animation {
  keyFrame: Frame;
  elapsed = 0;

  constructor(
    readonly duration: number,
    readonly update: (delta: number, keyFrame: Frame) => Frame) { }

  get currentFrame(): Frame {
    return this.update(this.elapsed / this.duration, this.keyFrame);
  }
  get lastFrame(): Frame {
    return this.update(1, this.keyFrame);
  }

  withKeyFrame(keyFrame: Frame): Animation {
    this.keyFrame = keyFrame;
    return this;
  }
}