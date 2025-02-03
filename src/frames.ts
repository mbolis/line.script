import { Vector2d, Degrees, Radians, deg2rad } from "./geometry";
import { Stroke } from "./scene";

type FrameMutations = {
  position?: Vector2d;
  facing?: Degrees;
  height?: number;
  opacity?: number;
  strokes?: Stroke[];
  color?: string;
  foreground?: string;
  background?: string;
  speed?: number;
}

export class Frame {
  static new() {
    return new Frame;
  }

  private constructor(
    readonly position = Vector2d.ORIGIN,
    readonly facing = 0 as Degrees,
    readonly height = 0,
    readonly opacity = 1,
    readonly strokes = [] as Stroke[],
    readonly color = "",
    readonly foreground = "",
    readonly background = "",
    readonly speed = 100,
  ) { }

  get facingRadians(): Radians {
    return deg2rad(this.facing);
  }

  with(properties: FrameMutations): Frame {
    return new Frame(
      properties.position ?? this.position,
      properties.facing ?? this.facing,
      properties.height ?? this.height,
      properties.opacity ?? this.opacity,
      properties.strokes ?? this.strokes,
      properties.color ?? this.color,
      properties.foreground ?? this.foreground,
      properties.background ?? this.background,
      properties.speed ?? this.speed,
    );
  }
}

export class Animation {
  keyFrame: Frame;
  elapsed = 0;

  constructor(
    readonly duration: number,
    readonly update: (delta: number, keyFrame: Frame) => Frame,
  ) { }

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