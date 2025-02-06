import events, { EventType as E } from "../events";

const canvasHolder = document.getElementById("canvas_holder");
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
export const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

window.addEventListener("resize", setCanvasSize);
setCanvasSize();

function setCanvasSize() {
  canvas.width = canvasHolder.offsetWidth;
  canvas.height = canvasHolder.offsetHeight;

  ctx.restore();
  ctx.save();
  ctx.scale(1, -1);
  ctx.translate(canvas.width / 2, -canvas.height / 2);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  events.fire(E.REPAINT);
}
