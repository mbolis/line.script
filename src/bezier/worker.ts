import { Bezier } from "./bezier";

addEventListener("message", e => {
  const { id, p0, p1, p2, p3 } = e.data;

  const curve = new Bezier(p0, p1, p2, p3);
  const length = curve.approxLength;
  for (let i = 0; i < length; i++) {
    postMessage({ id, value: curve.value(i / (length - 1)) });
  }
  postMessage({ done: true });
});