const events = new EventTarget();

export default {
  on<T extends CustomEvent = CustomEvent>(type: EventType, callback: (e: T) => void) {
    events.addEventListener(type, callback);
  },

  fire(type: EventType, detail?: any) {
    events.dispatchEvent(new CustomEvent(type, { detail }));
  },
}

export enum EventType {
  REPAINT = "repaint",
  STATE_READY = "state.ready",
  STATE_PLAYING = "state.playing",
  STATE_STEP_FWD = "state.step.fwd",
  STATE_PAUSED = "state.paused",
  STATE_FAST_FWD = "state.fast.fwd",
  STATE_DONE = "state.done",
}