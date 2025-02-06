import { rad2deg, Vector2d, type Degrees } from "../geometry";

export interface BezierResult {
  position: Vector2d;
  facing: Degrees;
}

export interface PositionAndFacing {
  position: Vector2d;
  facingRadians: number;
}

export class Bezier {
  private static nextId = 0;
  readonly id = Bezier.nextId++;

  private mode: "quadratic" | "cubic";
  private d10: Vector2d;
  private d21: Vector2d;
  private d32: Vector2d;

  constructor(
    protected p0: Vector2d,
    protected p1: Vector2d,
    protected p2: Vector2d,
    protected p3?: Vector2d,
  ) {
    this.mode = p3 ? "cubic" : "quadratic";

    this.p0 = Vector2d.of(p0);
    this.p1 = Vector2d.of(p1);
    this.p2 = Vector2d.of(p2);
    this.p3 = p3 && Vector2d.of(p3);

    this.d10 = this.p1.minus(p0);
    this.d21 = this.p2.minus(p1);
    this.d32 = p3 && this.p3.minus(p2);
  }

  protected reposition({ position, facingRadians }: PositionAndFacing) {
    this.p0 = this.p0.rotate(facingRadians).plus(position);
    this.p1 = this.p1.rotate(facingRadians).plus(position);
    this.p2 = this.p2.rotate(facingRadians).plus(position);
    this.p3 = this.p3 && this.p3.rotate(facingRadians).plus(position);

    this.d10 = this.p1.minus(this.p0);
    this.d21 = this.p2.minus(this.p1);
    this.d32 = this.p3 && this.p3.minus(this.p2);
  }

  value(t: number) {
    return this[this.mode](t);
  }

  private quadratic(t: number): BezierResult {
    const t_ = 1 - t;

    const a = t_ ** 2;
    const b = 2 * t * t_;
    const c = t ** 2;
    const position = this.p0.scale(a)
      .plus(this.p1.scale(b))
      .plus(this.p2.scale(c));
    const facingCoords = this.d10.scale(t_)
      .plus(this.d21.scale(t));
    const facing = rad2deg(Math.atan2(facingCoords.y, facingCoords.x)) - 90;

    return { position, facing };
  }

  private cubic(t: number): BezierResult {
    const t_ = 1 - t;

    const a = t_ ** 3;
    const b = 3 * t * t_ ** 2;
    const c = 3 * t ** 2 * t_;
    const d = t ** 3;
    const position = this.p0.scale(a)
      .plus(this.p1.scale(b))
      .plus(this.p2.scale(c))
      .plus(this.p3.scale(d));
    const a_ = t_ ** 2;
    const b_ = 2 * t * t_;
    const c_ = t ** 2
    const facingCoords = this.d10.scale(a_)
      .plus(this.d21.scale(b_))
      .plus(this.d32.scale(c_));
    const facing = rad2deg(Math.atan2(facingCoords.y, facingCoords.x)) - 90;

    return { position, facing };
  }

  private static readonly APPROX_STEP = 1 / 16;

  private _approxLength: number;

  get approxLength() {
    if (this._approxLength !== undefined) {
      return this._approxLength;
    }

    let p = this.p0;
    let length = 0;
    for (let t = 0; t <= 1; t += Bezier.APPROX_STEP) {
      const p_ = this.value(t).position;
      length += p_.minus(p).length;
      p = p_;
    }
    return this._approxLength = length | 0;
  }
}
