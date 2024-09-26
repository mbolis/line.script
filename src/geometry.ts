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

  plus(that: Vector2d): Vector2d {
    return new Vector2d(this.x + that.x, this.y + that.y);
  }

  minus(that: Vector2d): Vector2d {
    return new Vector2d(this.x - that.x, this.y - that.y);
  }

  scale(k: number): Vector2d {
    return new Vector2d(k * this.x, k * this.y);
  }

  rotate(th: Radians): Vector2d {
    let x = this.x * Math.cos(th) - this.y * Math.sin(th);
    let y = this.x * Math.sin(th) + this.y * Math.cos(th);
    return new Vector2d(x, y);
  }

  segmentTo(point: Vector2d): Segment {
    return new Segment(this, point);
  }
  segmentBy(translation: Vector2d): Segment {
    return new Segment(this, this.plus(translation));
  }

  toString(): string {
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
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

  toString(): string {
    return `${this.from}->${this.to}`;
  }
}

type FromTo = [Coords, Coords];

function fromTo2Segment(fromTo: FromTo) {
  return new Segment(fromTo[0], fromTo[1]);
}

export class Path {
  private fragments: Segment[];
  constructor(fragments: Array<Segment | FromTo> = []) {
    this.fragments = fragments.map(fragment =>
      (fragment instanceof Segment) ? fragment : fromTo2Segment(fragment));
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.fragments.forEach(segment => segment.draw(ctx));
    ctx.restore();
  }

  push(next: Segment): Path {
    return new Path(this.fragments.concat(next));
  }

  get totalLength(): number {
    let totalLength = 0;
    for (let i = 0; i < this.fragments.length; i++) {
      let fragment = this.fragments[i];
      totalLength += fragment.length;
    }

    return totalLength;
  }

  scaled(k: number) {
    return new Path(this.fragments.map(segment => segment.scaled(k)));
  }

  toString(): string {
    return this.fragments.join(", ");
  }
}
