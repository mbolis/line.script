import { DrawingContext } from "./draw";

export type Radians = number;
export type Degrees = number;

export function deg2rad(degrees: Degrees): Radians {
  return degrees / 180 * Math.PI;
}
export function rad2deg(radians: Radians): Degrees {
  return radians * 180 / Math.PI;
}

export class Vector2d {
  readonly x: number;
  readonly y: number;

  static of({ x, y }: { x: number, y: number }) {
    return new Vector2d(x, y);
  }

  static x(x: number): Vector2d {
    return new Vector2d(x, 0);
  }
  static y(y: number): Vector2d {
    return new Vector2d(0, y);
  }
  static polar(angle: Radians, modulo: number) {
    return Vector2d.y(modulo).rotate(angle);
  }

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  get length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  plus(that: Vector2d) {
    return new Vector2d(this.x + that.x, this.y + that.y);
  }

  minus(that: Vector2d) {
    return new Vector2d(this.x - that.x, this.y - that.y);
  }

  scale(k: number) {
    return new Vector2d(k * this.x, k * this.y);
  }

  rotate(th: Radians) {
    let x = this.x * Math.cos(th) - this.y * Math.sin(th);
    let y = this.x * Math.sin(th) + this.y * Math.cos(th);
    return new Vector2d(x, y);
  }

  segmentTo(point: Vector2d) {
    return new Segment(this, point);
  }
  segmentBy(translation: Vector2d) {
    return new Segment(this, this.plus(translation));
  }

  toString() {
    return `(${this.x},${this.y})`;
  }
};
export namespace Vector2d {
  export const ORIGIN = new Vector2d;
}

export type Coords = [number, number];

export function coords2Vector2d(coords: Coords) {
  return new Vector2d(coords[0], coords[1]);
}

export class Segment {
  private from: Vector2d;
  private to: Vector2d;

  constructor(from: Vector2d | Coords, to: Vector2d | Coords) {
    this.from = (from instanceof Vector2d) ? from : coords2Vector2d(from);
    this.to = (to instanceof Vector2d) ? to : coords2Vector2d(to);
  }

  private _length: number;
  get length(): number {
    if (typeof this._length === "undefined") {
      let delta = this.to.minus(this.from);
      this._length = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
    }
    return this._length;
  }

  draw(dctx: DrawingContext) {
    const ctx = dctx.ctx;
    const scaled = dctx.getScaled(this);

    ctx.beginPath();
    ctx.moveTo(scaled.from.x, scaled.from.y);
    ctx.lineTo(scaled.to.x, scaled.to.y);
    ctx.stroke();
  }

  lerp(ratio: number): Segment {
    if (ratio < 0 || ratio > 1) {
      throw new Error("Cannot generate line with ratio=" + ratio);
    }

    let delta = this.to.minus(this.from).scale(ratio);
    return new Segment(this.from, this.from.plus(delta));
  }

  scaled(k: number): Segment {
    return new Segment(this.from.scale(k), this.to.scale(k));
  }

  translated(dx: number, dy: number): Segment {
    const d = new Vector2d(dx, dy);
    return new Segment(this.from.plus(d), this.to.plus(d));
  }

  toString(): string {
    return `${this.from}->${this.to}`;
  }
}
