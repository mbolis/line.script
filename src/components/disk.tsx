import type { JSX } from "@/jsx";
import _ from "./disk.module.css";

export interface DiskProps {
}

export const Disk: JSX.Component<DiskProps> = ({
}) => {
  return (
    <div id="disk">
      <nav id="save_menu">
        <ul>
          <li>
            <button id="save" className="naked"></button>
          </li>
        </ul>
      </nav>
      <ul id="saves">
        <li>
          <span className="name"></span>
          <button className="naked save" title="Save">
            <div role="presentation"></div>
          </button>
          <button className="naked delete" title="Delete">
            <div role="presentation"></div>
          </button>
        </li>
      </ul>
    </div>
  );
};
