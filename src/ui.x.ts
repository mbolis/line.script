import { el } from "./components";

document.querySelector("#app").append(
  el("#canvas_holder", {},
    el("canvas#canvas"),
  ),
  el("#devarea", {},
    new Transport(xxx),
  ),
);

const btnPause = document.getElementById("pause") as HTMLButtonElement;
const btnStepFwd = document.getElementById("sfwd") as HTMLButtonElement;
const btnPlay = document.getElementById("play") as HTMLButtonElement;
const btnFastFwd = document.getElementById("ffwd") as HTMLButtonElement;
const btnStop = document.getElementById("stop") as HTMLButtonElement;

const btnHelp = document.getElementById("help") as HTMLButtonElement;
const dlgHelp = document.getElementById("help_dialog") as HTMLDialogElement;
btnHelp.addEventListener("click", () => dlgHelp.showModal());
if (!localStorage.getItem("hide_splash")) dlgHelp.showModal();

const btnCloseDialog = dlgHelp.querySelector(".close") as HTMLButtonElement;
btnCloseDialog.addEventListener("click", () => {
  localStorage.setItem("hide_splash", "1");
  dlgHelp.close();
});

const chkTrace = document.getElementById("trace") as HTMLInputElement;
chkTrace.addEventListener("change", () => editor.clearMarks());

const btnLoad = document.getElementById("load") as HTMLButtonElement;
btnLoad.addEventListener("click", () => {
  if (this.visible) {
    this.hideDialog()
  } else {
    this.showDialog()
  }
});

export function disable(...elements: HTMLButtonElement[]) {
  elements.forEach(element => {
    element.disabled = true;
    element.classList.add("disabled");
  });
}

export function enable(...elements: HTMLButtonElement[]) {
  elements.forEach(element => {
    element.disabled = false;
    element.classList.remove("disabled");
  });
}

export function hide(...elements: HTMLButtonElement[]) {
  elements.forEach(element => element.style.display = "none");
}

export function show(...elements: HTMLButtonElement[]) {
  elements.forEach(element => element.style.display = "");
  enable(...elements);
}
