const btnHelp = document.getElementById("help") as HTMLButtonElement;
const dlgHelp = document.getElementById("help_dialog") as HTMLDialogElement;
btnHelp.addEventListener("click", () => dlgHelp.showModal());
if (!localStorage.getItem("hide_splash")) dlgHelp.showModal();

const btnCloseDialog = dlgHelp.querySelector(".close") as HTMLButtonElement;
btnCloseDialog.addEventListener("click", () => {
  localStorage.setItem("hide_splash", "1");
  dlgHelp.close();
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
