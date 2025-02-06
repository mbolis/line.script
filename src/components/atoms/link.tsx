import type { JSX } from "@/jsx/jsx-runtime";
import _ from "./link.module.css";

export interface LinkProps {
  tooltip?: string;
  onclick: () => void;
}

export const Link: JSX.Component<LinkProps> = ({
  children,
  tooltip,
  onclick,
}) => {
  return (
    <button
      className={_.link}
      title={tooltip}
      onclick={onclick}
    >
      {children}
    </button>
  );
};