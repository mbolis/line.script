import type { JSX } from "@/jsx/jsx-runtime";
import _ from "./checkbox.module.css";
import { decouple, into } from "@/util";

export interface CheckboxProps {
  value: flyd.Stream<boolean>;
}

let nextId = 1;

export const Checkbox: JSX.Component<CheckboxProps> = ({
  value,
  children,
}) => {
  value = decouple(value);
  const id = `checkbox_${nextId++}`;

  return (
    <label htmlFor={id} className={_.checkbox}>
      {children}<input
        id={id}
        type="checkbox"
        checked={value}
        onchange={into(e => e.target.checked, value)}
      />
    </label>
  );
};