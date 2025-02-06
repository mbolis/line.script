import type { Frame } from "../state";
import { Vector2d } from "../geometry";
import { Bezier as BezierCurve, PositionAndFacing, type BezierResult } from "./bezier";

const subscribers = new Map<number, (r: BezierResult[]) => void>();
const worker = new Worker(new URL("./worker", import.meta.url), { type: "module" });
worker.addEventListener("message", e => {
  const { id, values, done } = e.data;

  values.forEach((v: BezierResult) => v.position = Vector2d.of(v.position));
  subscribers.get(id)(values);
  if (done) {
    subscribers.delete(id);
  }
});

export class Bezier extends BezierCurve {
  private lut = [] as BezierResult[];

  constructor(
    p0: Vector2d,
    p1: Vector2d,
    p2: Vector2d,
    p3?: Vector2d,
  ) {
    super(p0, p1, p2, p3);

    const lut = this.lut;
    subscribers.set(this.id, v => lut.push(...v))
  }

  repositionAndCalculate(frame: PositionAndFacing, sync: boolean) {
    this.reposition(frame);
    if (sync) {
      const length = this.approxLength;
      for (let i = 0; i < length; i++) {
        this.lut.push(this.value(i / (length - 1)));
      }
    } else {
      worker.postMessage({ id: this.id, p0: this.p0, p1: this.p1, p2: this.p2, p3: this.p3 });
    }
  }

  lookupValues(t: number) {
    const i = this.approxLength * t | 0;
    const values = this.lut.slice(0, i + 1);
    if (values.length === 0) return [this.value(t)];
    return values;
  }
}
