import type { JSX } from "@/jsx/jsx-runtime";
import _ from "./flex-spacer.module.css";

export const FlexSpacer: JSX.Component = () => (
  <span className={_.spacer}></span>
);