import flyd from "flyd"

export function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: any;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

export function decouple<T>(stream: flyd.Stream<T>) {
  let touched = false;

  const decoupledStream = flyd.stream<T>();
  flyd.on((t: T) => {
    if (touched) {
      return;
    }
    decoupledStream(t);
  }, stream);

  flyd.on((t: T) => {
    touched = true;
    try {
      stream(t);
    } finally {
      touched = false;
    }
  }, decoupledStream);

  return decoupledStream;
}

export function into<T, U>(fn: (t: T) => U, stream: flyd.Stream<U>) {
  const intoStream = flyd.stream<T>();
  flyd.on((t: T) => stream(fn(t)), intoStream);
  return intoStream;
}

export function bindFn(fn: Function, ...args) {
  return fn.bind(null, ...args);
}