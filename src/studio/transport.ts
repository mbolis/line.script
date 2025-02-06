import events, {EventType as E} from "../events";
import * as editor from "./editor";
import { disable, hide, show } from "./ui";

const chkTrace = document.getElementById("trace") as HTMLInputElement;
chkTrace.addEventListener("change", () => editor.clearMarks());

export function isTraceEnabled() {
  return chkTrace.checked;
}
export function toggleTraceEnabled() {
  chkTrace.checked = !chkTrace.checked;
}

export type TransportState = "ready" | "playing" | "paused" | "step-fwd" | "fast-fwd" | "done";

class Transport {
  state: TransportState = null;

  constructor() {
    this.setState("ready");
  }

  getState() {
    return this.state;
  }
  stateIs(...values: TransportState[]) {
    return values.some(v => v === this.state);
  }
  stateIsNot(...values: TransportState[]) {
    return values.every(v => v !== this.state);
  }

  setState(nextState: TransportState) {
    switch (nextState) {
      case "ready":
        hide(btnPause, btnStop);
        show(btnStepFwd, btnFastFwd, btnPlay);

        events.fire(E.STATE_READY);
        break;

      case "playing":
        hide(btnPlay);
        show(btnStepFwd, btnPause, btnFastFwd, btnStop);
        disable(btnStepFwd);

        events.fire(E.STATE_PLAYING);
        break;

      case "step-fwd":
        hide(btnStepFwd, btnPause, btnPlay, btnFastFwd, btnStop);

        events.fire(E.STATE_STEP_FWD);
        break;

      case "paused":
        hide(btnPause);
        show(btnStepFwd, btnPlay, btnFastFwd, btnStop);

        events.fire(E.STATE_PAUSED);
        break;

      case "fast-fwd":
        hide(btnFastFwd);
        show(btnStepFwd, btnPlay, btnPause, btnStop);
        disable(btnStepFwd);

        events.fire(E.STATE_FAST_FWD);
        break;

      case "done":
        hide(btnPause);
        show(btnStepFwd, btnPlay, btnFastFwd, btnStop);
        disable()

        events.fire(E.STATE_DONE);
        break;
    }

    this.state = nextState;
  }
}

const btnPause = document.getElementById("pause") as HTMLButtonElement;
const btnStepFwd = document.getElementById("sfwd") as HTMLButtonElement;
const btnPlay = document.getElementById("play") as HTMLButtonElement;
const btnFastFwd = document.getElementById("ffwd") as HTMLButtonElement;
const btnStop = document.getElementById("stop") as HTMLButtonElement;

btnPause.addEventListener("click", () => {
  transport.setState("paused");
});
btnStepFwd.addEventListener("click", () => {
  transport.setState("step-fwd");
});
btnPlay.addEventListener("click", () => {
  transport.setState("playing");
});
btnFastFwd.addEventListener("click", () => {
  transport.setState("fast-fwd");
});
btnStop.addEventListener("click", () => {
  transport.setState("ready");
});

const transport = new Transport();
export default transport;
