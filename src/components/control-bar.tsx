import type { JSX } from "@/jsx";
import _ from "./control-bar.module.css";
import { Button } from "./atoms/button";
import { Link } from "./atoms/link";
import { Checkbox } from "./atoms/checkbox";
import { FlexSpacer } from "./atoms/flex-spacer";
import * as store from "@/store";
import { State } from "@/store";
import { bindFn, decouple } from "@/util";

export interface ControlBarProps {
  diskVisible: flyd.Stream<boolean>;
}

export const ControlBar: JSX.Component<ControlBarProps> = ({
  diskVisible,
}) => {
  diskVisible = decouple(diskVisible);

  const [, setState] = store.select("state");
  const [traceMode$, setTraceMode] = store.select("traceMode");

  return (
    <div className={_.transport}>
      <Button
        variant="sfwd"
        color="green"
        tooltip="Step once (Ctrl+Alt+Enter)"
        onclick={bindFn(setState, State.STEP_FWD)}
      >
        StepFwd
      </Button>
      <Button
        variant="play"
        color="green"
        tooltip="Play animation (Ctrl+Enter)"
        onclick={bindFn(setState, State.PLAYING)}
      >
        Play
      </Button>
      <Button
        variant="pause"
        color="yellow"
        tooltip="Pause animation (Ctrl+Enter)"
        onclick={bindFn(setState, State.PAUSED)}
      >
        Pause
      </Button>
      <Button
        variant="ffwd"
        color="green"
        tooltip="Fast fwd to end (Ctrl+Shift+Enter)"
        onclick={bindFn(setState, State.FAST_FWD)}
      >
        FastFwd
      </Button>
      <Button
        variant="stop"
        color="red"
        tooltip="Stop and reset (Ctrl+Esc)"
        onclick={bindFn(setState, State.READY)}
      >
        Stop
      </Button>

      <FlexSpacer />

      <div className={_.flags}>
        <Link
          tooltip="Help (Ctrl+?)"
        >
          help
        </Link>
        |
        <Checkbox value={traceMode$} onchange={setTraceMode}>
          trace & debug view
        </Checkbox>
      </div>

      <Button
        variant="load"
        color="blue"
        tooltip="Save/Restore (Ctrl+O)\n(Ctrl+S to Save)"
        onclick={() => diskVisible(!diskVisible())}
      >
        Load
      </Button>
    </div>
  );
}