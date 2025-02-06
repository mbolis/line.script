import { DrawingContext } from "./draw";
import state from "./state";

const ZOOM_DOWN = 1;
const ZOOM_UP = 1.5;

class Robot {
  draw(dctx: DrawingContext) {
    const ctx = dctx.ctx;
    ctx.save();

    const c = dctx.getScaled(state.position);
    ctx.translate(c.x, c.y);
    ctx.rotate(state.facingRadians);

    const zRatio = state.height;

    // dot
    ctx.save();

    ctx.strokeStyle = state.color ?? state.foreground;
    ctx.globalAlpha = 1 - zRatio;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.restore();

    // triangle
    let red = 160 + 95 * (1 - zRatio) | 0;
    let green = 160 * zRatio | 0;
    let blue = 160 + 95 * (1 - zRatio) | 0;
    ctx.strokeStyle = `rgba(${red},${green},${blue},${state.opacity})`;

    const z = ZOOM_DOWN + zRatio * (ZOOM_UP - ZOOM_DOWN);
    const zoom = dctx.getScaled(0.5 * z);
    const _5 = 5 * zoom;
    const _3 = 3 * zoom;

    ctx.beginPath();
    ctx.moveTo(_5, -_3);
    ctx.lineTo(-_5, -_3);
    ctx.lineTo(0, _3);
    ctx.lineTo(_5, -_3);
    ctx.stroke();

    ctx.restore();
  }
}

export const robot = new Robot();

class Paper {
  draw(dctx: DrawingContext) {
    const ctx = dctx.ctx;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const x0 = width / 2;
    const y0 = height / 2;

    ctx.save();

    if (state.background) {
      ctx.fillStyle = state.background;
      ctx.fillRect(-x0, -y0, width, height);

    } else {
      ctx.fillStyle = "#DAEAFF";
      ctx.fillRect(-x0, -y0, width, height);

      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.moveTo(0, -y0);
      ctx.lineTo(0, y0);
      ctx.moveTo(-x0, 0);
      ctx.lineTo(x0, 0);
      ctx.stroke();

      const step = dctx.getScaled(5);

      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = step; x <= x0; x += step) {
        ctx.moveTo(x, -y0);
        ctx.lineTo(x, y0);
      }
      for (let x = -step; x >= -x0; x -= step) {
        ctx.moveTo(x, -y0);
        ctx.lineTo(x, y0);
      }
      for (let y = step; y <= y0; y += step) {
        ctx.moveTo(-x0, y);
        ctx.lineTo(x0, y);
      }
      for (let y = -step; y >= -y0; y -= step) {
        ctx.moveTo(-x0, y);
        ctx.lineTo(x0, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

export const paper = new Paper();
