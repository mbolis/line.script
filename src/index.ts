import MainLoop from "mainloop.js";

import "./style.css";

import studio from "./studio";
import transport from "./studio/transport";

MainLoop
  .setUpdate(delta => {
    if (transport.stateIs("step-fwd")) {
      return;
    }
    if (transport.stateIs("fast-fwd")) {
      delta *= 1000;
    }
    if (!studio.update(delta)) {
      transport.setState("done");
    }
  });
