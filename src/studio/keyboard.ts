import disk from "./disk";
import transport, { toggleTraceEnabled } from "./transport";

document.addEventListener("keydown", e => {
  if (e.ctrlKey) {
    if (e.key === "Enter") {
      if (e.altKey && !e.shiftKey) {
        transport.setState("step-fwd");
      } else if (e.shiftKey && !e.altKey) {
        transport.setState("fast-fwd");
      } else if (!e.altKey && !e.shiftKey) {
        if (transport.stateIs("playing")) {
          transport.setState("paused");
        } else {
          transport.setState("playing");
        }
      }
      return;
    }
    if (e.key === "Escape" && !e.shiftKey && !e.altKey) {
      if (transport.stateIsNot("ready")) {
        transport.setState("ready");
      }
      return
    }
    if (e.key === "?") {
      e.preventDefault();
      const help = document.querySelector("#help") as HTMLElement;
      help.click();
      return
    }
    if (e.key === "s" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      disk.saveCurrent();
      return
    }
    if (e.key === "S" && e.shiftKey && !e.altKey) {
      e.preventDefault();
      disk.saveNew();
      return
    }
    if (e.key === "o" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      disk.showDialog();
      return
    }
    return;
  }
  if (e.shiftKey && e.altKey && e.key === "T") {
    toggleTraceEnabled();
    return;
  }
});
