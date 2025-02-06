import type { JSX } from "@/jsx/jsx-runtime";
import _ from "./button.module.css";

export interface ButtonProps {
  variant: "sfwd" | "play" | "pause" | "ffwd" | "stop" | "load";
  color?: "green" | "yellow" | "red" | "blue";
  tooltip?: string;
  onclick: () => void;
}

export const Button: JSX.Component<ButtonProps> = ({
  children,
  variant,
  color = "green",
  tooltip,
  onclick,
}) => {
  return (
    <button
      classList={[_.button, _[variant], _[color]]}
      title={tooltip?.replace(/\n/g, "&#10;")}
      onclick={onclick}
    >
      {children}
    </button>
  );
};