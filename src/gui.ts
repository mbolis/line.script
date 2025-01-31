import { Vector2d, Degrees, deg2rad } from "./geometry";
import { Frame } from "./frames";

export const ZOOM_DOWN = 1;
export const ZOOM_UP = 1.5;

export const DEFAULT_SCALE = 3.2;

export class Painter {
  position: Vector2d = Vector2d.ORIGIN;
  facing: Degrees = 0;
  z = ZOOM_DOWN;
  zoom = 0.5;
  scale = DEFAULT_SCALE;
  opacity = 1;
  brushColor = "black";

  update(frame: Frame) {
    this.position = frame.position.scale(this.scale);
    this.facing = frame.facing;
    this.z = ZOOM_DOWN + frame.height * (ZOOM_UP - ZOOM_DOWN);
    this.opacity = frame.opacity;
    this.brushColor = frame.foreground;
  }

  draw(ctx: CanvasRenderingContext2D) {
    let cx = this.position.x;
    let cy = this.position.y;

    let _5 = 5 * this.scale * this.zoom * this.z;
    let _3 = 3 * this.scale * this.zoom * this.z;

    ctx.save();

    ctx.translate(cx, cy);
    ctx.rotate(deg2rad(this.facing));

    let zRatio = (this.z - ZOOM_DOWN) / (ZOOM_UP - ZOOM_DOWN);

    // dot
    ctx.save();

    ctx.strokeStyle = this.brushColor;
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
    ctx.strokeStyle = `rgba(${red},${green},${blue},${this.opacity})`;

    ctx.beginPath();
    ctx.moveTo(_5, -_3);
    ctx.lineTo(-_5, -_3);
    ctx.lineTo(0, _3);
    ctx.lineTo(_5, -_3);
    ctx.stroke();

    ctx.restore();
  }
}