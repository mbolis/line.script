import { Bezier, type BezierResult } from "./bezier";

const BATCH_SIZE = 16;

addEventListener("message", e => {
  const { id, p0, p1, p2, p3 } = e.data;

  const curve = new Bezier(p0, p1, p2, p3);
  const length = curve.approxLength;
  const values = [] as BezierResult[];
  for (let i = 0; i < length; i++) {
    values.push(curve.value(i / (length - 1)));
    if (i % BATCH_SIZE === BATCH_SIZE - 1) {
      postMessage({ id, values });
      values.length = 0;
    }
  }
  postMessage({ id, values, done: true });
});