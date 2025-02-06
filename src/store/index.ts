import flyd from "flyd";

export enum State {
  READY = "ready",
  PLAYING = "playing",
  PAUSED = "paused",
  STEP_FWD = "step-fwd",
  FAST_FWD = "fast-fwd",
  DONE = "done",
}

const store = {
  state: flyd.stream<State>(),
  traceMode: flyd.stream(false),
}

type Store = typeof store;
type T<K extends keyof Store> = Store[K] extends flyd.Stream<infer T> ? T : never;
type Get<K extends keyof Store> = flyd.Stream<T<K>>;
type Set<K extends keyof Store> = (x: T<K>) => void;

export function select<K extends keyof Store>(key: K): [Get<K>, Set<K>] {
  return [
    store[key].map(x => x) as Get<K>,
    flyd.stream().map<T<K>>(store[key] as unknown as Get<K>),
  ] as const;
}
