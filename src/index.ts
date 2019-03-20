import * as MainLoop from "mainloop.js"

import * as CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

import { Animation, Frame } from "./frames";
import { Interpreter, Instruction } from "./interpreter";
import { Painter } from "./gui";
import * as disk from "./disk";

class PainterStudio {
    private animation: Animation;
    private frame: Frame;
    private painter: Painter;

    private isFreezing = false;

    constructor(private ctx: CanvasRenderingContext2D) {
        MainLoop.setDraw(() => this.draw());
        this.reset();
    }

    reset() {
        if (MainLoop.isRunning()) {
            MainLoop.stop();
        }

        this.animation = null;
        this.frame = Frame.new();
        this.painter = new Painter;

        this.draw();
    }

    animate() {
        this.isFreezing = false;

        if (!MainLoop.isRunning()) {
            MainLoop.start();
        }
    }
    freeze() {
        this.isFreezing = true;
    }

    setAnimation(animation: Animation): Animation {
        return animation === null ? null : this.animation = animation.withKeyFrame(this.frame);
    }

    update(delta: number): boolean {
        if (this.isFreezing) {
            if (this.animation) {
                this.frame = this.animation.lastFrame;
                this.animation = null;
            }

            MainLoop.stop();

        } else {
            if (!this.animation && !getNextAnimation()) {
                return false;
            }

            while (this.animation) {
                this.animation.elapsed += delta / 1000 * speed;
                if (this.animation.elapsed < this.animation.duration) {
                    this.frame = this.animation.currentFrame;
                    break;
                }

                this.frame = this.animation.lastFrame;
                delta = (this.animation.elapsed - this.animation.duration) * 1000 / speed;
                this.animation.elapsed = this.animation.duration;

                if (!getNextAnimation()) {
                    return false;
                }
            }
        }

        this.painter.update(this.frame);

        return true;
    }

    draw() {
        this.drawPaper(this.ctx);
        this.frame.strokes.forEach(stroke => stroke.defaultColor(this.frame.foreground).draw(ctx, 3.2));
        this.painter.draw(this.ctx);
    }

    private drawPaper(ctx: CanvasRenderingContext2D, scale = 3.2) {
        const WIDTH = ctx.canvas.width;
        const HEIGHT = ctx.canvas.height;
        const X = WIDTH / 2;
        const Y = HEIGHT / 2;

        ctx.save();

        if (!this.frame.background || this.frame.background === "none" || this.frame.background === "transparent") {
            ctx.fillStyle = "#DAEAFF";
            ctx.fillRect(-X, -Y, WIDTH, HEIGHT);
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(0, -Y);
            ctx.lineTo(0, Y);
            ctx.moveTo(-X, 0);
            ctx.lineTo(X, 0);
            ctx.stroke();

            const STEP = 5 * scale;

            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for (let x = STEP; x <= X; x += STEP) {
                ctx.moveTo(x, -Y);
                ctx.lineTo(x, Y);
            }
            for (let x = -STEP; x >= -X; x -= STEP) {
                ctx.moveTo(x, -Y);
                ctx.lineTo(x, Y);
            }
            for (let y = STEP; y <= Y; y += STEP) {
                ctx.moveTo(-X, y);
                ctx.lineTo(X, y);
            }
            for (let y = -STEP; y >= -Y; y -= STEP) {
                ctx.moveTo(-X, y);
                ctx.lineTo(X, y);
            }
            ctx.stroke();

        } else {
            ctx.fillStyle = this.frame.background;
            ctx.fillRect(-X, -Y, WIDTH, HEIGHT);
        }

        ctx.restore();
    }
}

const canvasHolder = document.getElementById("canvas_holder");
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

const studio = new PainterStudio(ctx);

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

    studio.draw();
}

const txtCode = document.getElementById("code") as HTMLTextAreaElement;
const editor = CodeMirror.fromTextArea(txtCode, {
    lineNumbers: true,
    mode: "javascript",
    tabSize: 2,
    extraKeys: {
        "Ctrl-Alt-Enter": () => setState("step-fwd"),
        "Ctrl-Enter": () => setState("playing"),
        "Shift-Ctrl-Enter": () => setState("fast-fwd"),
        "Ctrl-S": disk.saveOperation,
        "Ctrl-O": disk.showDiskContent
    }
});

disk.initialize(editor);

const txtOut = document.getElementById("out");

const btnPause = document.getElementById("pause") as HTMLButtonElement;
const btnSfwd = document.getElementById("sfwd") as HTMLButtonElement;
const btnPlay = document.getElementById("play") as HTMLButtonElement;
const btnFfwd = document.getElementById("ffwd") as HTMLButtonElement;
const btnStop = document.getElementById("stop") as HTMLButtonElement;

const chkTrace = document.getElementById("trace") as HTMLInputElement;
chkTrace.addEventListener("change", () => clearEditorMarks());

type TransportState = "ready" | "playing" | "paused" | "step-fwd" | "fast-fwd" | "done";
let state: TransportState;
setState("ready");

btnPause.addEventListener("click", () => {
    setState("paused");
});
btnSfwd.addEventListener("click", () => {
    setState("step-fwd");
});
btnPlay.addEventListener("click", () => {
    setState("playing");
});
btnFfwd.addEventListener("click", () => {
    setState("fast-fwd");
});
btnStop.addEventListener("click", () => {
    setState("ready");
});

const MAX_LOOP_COUNT = 10000;

let interpreter: Interpreter;
function getNextAnimation(loopCount = 0): Animation {
    try {
        const instruction: Instruction = interpreter.stepToNextInstruction();

        if (instruction) {
            if (chkTrace.checked) {
                clearEditorMarks();
                const start = editor.findPosH(CodeMirror.Pos(0, 0), instruction.node.start, "char", true);
                const end = editor.findPosH(CodeMirror.Pos(0, 0), instruction.node.end, "char", true);
                editor.getDoc().markText(start, end, { css: "background: rgba(128,255,128,0.4)" })

                return studio.setAnimation(instruction.animation || new Animation(10, (_, keyFrame) => keyFrame)); // FIXME:

            } else {
                if (instruction.animation) {
                    return studio.setAnimation(instruction.animation);
                } else {
                    if (loopCount < MAX_LOOP_COUNT) {
                        return getNextAnimation(loopCount + 1);
                    } else {
                        clearEditorMarks();
                        markError(instruction.node.start, instruction.node.end);
                        txtOut.innerHTML = "<span style=color:red>WARNING: Possible infinite loop!</span>\n";
                        return studio.setAnimation(new Animation(state === "fast-fwd" ? 20000 : 20, (_, keyFrame) => keyFrame));
                    }
                }
            }
        }
    } catch (err) {
        setState("done");
        markError(err.state.node.start, err.state.node.end, err.message);
        throw err;
    }

    return studio.setAnimation(null);
}

function clearEditorMarks() {
    editor.getDoc().getAllMarks().forEach(mark => mark.clear());
}
function markError(start: number, end: number, message?: string) {
    const startPos = editor.findPosH(CodeMirror.Pos(0, 0), start, "char", true);
    const endPos = editor.findPosH(CodeMirror.Pos(0, 0), end, "char", true);
    editor.getDoc().markText(startPos, endPos, { css: "background: rgba(255,128,128,0.4)" })

    if (message) {
        txtOut.innerHTML += `<span style=color:red>${message}</span>\n`;
    }
}

setupMainLoop();

function setState(nextState: TransportState) {
    switch (nextState) {
        case "ready":
            hide(btnPause, btnStop);
            show(btnSfwd, btnFfwd, btnPlay);

            clearEditorMarks();
            txtOut.textContent = "";
            studio.reset();
            break;

        case "playing":
            hide(btnPlay);
            show(btnSfwd, btnPause, btnFfwd, btnStop);
            disable(btnSfwd);

            ensureRunning();

            studio.animate();
            break;

        case "step-fwd":
            hide(btnSfwd, btnPause, btnPlay, btnFfwd, btnStop);

            ensureRunning();

            studio.animate();

            if (getNextAnimation()) {
                setState("paused");
            } else {
                setState("done");
            }

            return;

        case "paused":
            hide(btnPause);
            show(btnSfwd, btnPlay, btnFfwd, btnStop);

            studio.freeze();
            break;

        case "fast-fwd":
            hide(btnFfwd);
            show(btnSfwd, btnPlay, btnPause, btnStop);
            disable(btnSfwd);

            ensureRunning();

            studio.animate();
            break;

        case "done":
            hide(btnPause);
            show(btnSfwd, btnPlay, btnFfwd, btnStop);
            disable()

            clearEditorMarks();
            studio.freeze();
            break;
    }

    state = nextState;
}

function ensureRunning() {
    if (state === "ready" || state === "done") {
        editor.save();
        try {
            interpreter = new Interpreter(txtCode.value);
        } catch (err) {

            setState("done");

            const message = /(.*)\((\d+):(\d+)\)\s*$/.exec(err.message);
            const startPos = CodeMirror.Pos(+message[2], +message[3]);
            const token = editor.getTokenAt(startPos);
            markError(token.start, token.end, message[1] + `'${token.string}'`);

            throw err;
        }

        txtOut.textContent = "";
        studio.reset();
    }
}

function disable(...elements: HTMLButtonElement[]) {
    elements.forEach(element => {
        element.disabled = true;
        element.classList.add("disabled");
    });
}
function enable(...elements: HTMLButtonElement[]) {
    elements.forEach(element => {
        element.disabled = false;
        element.classList.remove("disabled");
    });
}
function hide(...elements: HTMLButtonElement[]) {
    elements.forEach(element => element.style.display = "none");
}
function show(...elements: HTMLButtonElement[]) {
    elements.forEach(element => element.style.display = "inline-block");
    enable(...elements);
}

const speed = 100;

function setupMainLoop() {
    MainLoop
        .setUpdate(delta => {
            if (state === "step-fwd") {
                return;
            }
            if (state === "fast-fwd") {
                delta *= 1000;
            }
            if (!studio.update(delta)) {
                setState("done");
            }
        });
}

