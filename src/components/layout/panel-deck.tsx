import type { JSX } from "@/jsx";
import flyd from "flyd";
import _ from "./panel-deck.module.css";

export interface PanelDeckProps {
  selected: flyd.Stream<string>;
  panels: Record<string, JSX.Element>;
}

export const PanelDeck: JSX.Component<PanelDeckProps> = ({
  panels,
  selected,
}) => {
  const htmlPanels = {} as Record<string, HTMLElement>;
  for (const [key, el] of Object.entries(panels)) {
    if (!(el instanceof HTMLElement)) throw new Error("only HTML elements allowed");
    htmlPanels[key] = el;
  }

  let currentPanel: HTMLElement;
  flyd.on(selected => {
    const nextPanel = htmlPanels[selected];
    if (currentPanel) {
      currentPanel.replaceWith(nextPanel);
    }
    currentPanel = nextPanel;
  }, selected);

  return (
    <div className={_.panelDeck}>
      {currentPanel}
    </div>
  );
};
