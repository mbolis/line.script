import * as output from "./output";
import EventEmitter from "events";

function debounce(func: Function, wait: number, immediate?: boolean) {
  let timeout: any;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

type DiskState = { name?: string, code: string };

class RAM {
  #currentState: DiskState;
  get currentState() {
    return { ...this.#currentState };
  }

  constructor(private editor: CodeMirror.Editor) {
    const ramValue = localStorage.getItem("ram");
    this.#currentState = ramValue ? JSON.parse(ramValue) : { code: "" };
    editor.setValue(this.#currentState.code);

    editor.on("change", debounce(() => this.writeCode(editor.getValue()), 400));
  }

  private writeCode(code: string) {
    this.#currentState.code = code;
    this.persist();
  }

  private persist() {
    localStorage.setItem("ram", JSON.stringify(this.#currentState));
  }

  load(state: DiskState) {
    this.#currentState = state;
    this.persist();

    this.editor.setValue(state.code);
  }

  attach(name: string) {
    this.#currentState.name = name;
    this.persist();
  }

  detach() {
    this.#currentState.name = undefined;
    this.persist();
  }
}

class Disk {
  private readonly savedStates: Array<DiskState>;

  get saves() {
    return this.savedStates.map(s => ({ ...s }));
  }

  constructor() {
    const savesValue = localStorage.getItem("saves");
    this.savedStates = savesValue ? JSON.parse(savesValue) : [];
  }

  write(name: string, code: string): [number, DiskState?] {
    if (this.savedStates.length === 0) {
      const state = { name, code };
      this.savedStates.push(state);
      this.persist();
      return [0, state];
    }

    const [i, existing] = this.#get(name);
    if (existing) {
      existing.code = code;
      this.persist();
      return [i, undefined];
    }

    let idx = this.savedStates.findIndex(s => s.name > name);
    const state = { name, code };
    if (~idx) {
      this.savedStates.splice(idx, 0, state);
    } else {
      idx = this.savedStates.push(state) - 1;
    }
    this.persist();
    return [idx, state];
  }

  #get(name: string): [number, DiskState?] {
    const idx = this.savedStates.findIndex(s => s.name === name)
    return [idx, this.savedStates[idx]];
  }

  get(name: string): [number, DiskState?] {
    const [i, existing] = this.#get(name);
    return existing ? [i, { ...existing }] : [-1, undefined];
  }

  delete(name: string) {
    const idx = this.savedStates.findIndex(s => s.name === name);
    if (~idx) {
      this.savedStates.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  private persist() {
    localStorage.setItem("saves", JSON.stringify(this.savedStates));
  }
}

class SavesList extends EventEmitter {
  private el: HTMLUListElement;
  private itemTpl: HTMLLIElement;

  constructor(
    private readonly ram: RAM,
    private readonly disk: Disk,
  ) {
    super();

    this.el = document.getElementById("saves") as HTMLUListElement;

    this.itemTpl = this.el.querySelector("li") as HTMLLIElement;
    this.itemTpl.remove();

    this.render();
  }

  get isEmpty() {
    return this.disk.saves.length === 0;
  }

  get selected() {
    return this.ram.currentState.name;
  }

  render() {
    const items = this.disk.saves.map(this.renderItem, this);
    this.el.append(...items);
  }

  renderItem({ name }: DiskState) {
    const { name: currentName } = this.ram.currentState;

    const item = this.itemTpl.cloneNode(true) as HTMLLIElement;
    if (name === currentName) {
      item.classList.add("currently-loaded");
    }
    item.addEventListener("click", () => this.restoreSave(name));

    const itemName = item.querySelector(".name");
    itemName.textContent = name;

    const btnSave = item.querySelector(".save");
    btnSave.addEventListener("click", e => {
      e.stopPropagation();
      this.saveState(name);
    })

    const btnDelete = item.querySelector(".delete");
    btnDelete.addEventListener("click", e => {
      e.stopPropagation();
      this.deleteSave(name, item);
    });

    return item;
  }

  restoreSave(name: string) {
    const [i, state] = this.disk.get(name);
    if (!state) throw new Error("bad save name: " + name);

    this.ram.load(state)
    this.selectItem(i);

    output.clear();
    output.info(`Save restored: "${name}"`);

    this.emit("restored", state);
  }

  private selectItem(idx: number) {
    const currEl = this.el.querySelector(".currently-loaded");
    if (currEl) currEl.classList.remove("currently-loaded");
    this.el.children[idx].classList.add("currently-loaded");
  }

  saveState(name: string) {
    const { name: currentName, code } = this.ram.currentState;
    const [idx, newState] = this.disk.write(name, code)

    if (newState) {
      const item = this.renderItem(newState)
      const nextItem = this.el.children[idx];
      if (nextItem) {
        nextItem.insertAdjacentElement("beforebegin", item)
      } else {
        this.el.append(item);
      }
    }

    if (name !== currentName) {
      this.ram.attach(name);
      this.selectItem(idx);
    }

    output.clear();
    output.info(`Saved: "${name}"`);

    this.emit("saved", name);
  }

  deleteSave(name: string, item: HTMLElement) {
    if (!this.disk.delete(name)) {
      throw new Error("bad save name: " + name);
    }
    if (this.ram.currentState.name === name) {
      this.ram.detach();
    }
    item.remove();
    output.clear();
    output.info(`Save deleted: "${name}"`);

    this.emit("deleted", name);
  }
}

class UI {
  private readonly editor: HTMLElement;
  private readonly dialog: HTMLDivElement;
  private readonly button: HTMLButtonElement;
  private readonly saveButton: HTMLElement;
  private visible = false;


  constructor(
    editor: CodeMirror.Editor,
    private readonly saves: SavesList,
  ) {
    this.editor = editor.getWrapperElement();
    this.dialog = document.getElementById("disk") as HTMLDivElement;

    this.button = document.getElementById("load") as HTMLButtonElement;
    this.button.addEventListener("click", () => {
      if (this.visible) {
        this.hideDialog()
      } else {
        this.showDialog()
      }
    });
    
    this.saveButton = document.getElementById("save") as HTMLLIElement;
    this.saveButton.addEventListener("click", this.saveNew.bind(this));
    this.nameSaveButton();
    saves.on("saved", this.nameSaveButton.bind(this));
    saves.on("deleted", this.nameSaveButton.bind(this));
    
    saves.on("restored", this.hideDialog.bind(this));
  }

  private nameSaveButton() {
    if (this.saves.isEmpty) {
      this.saveButton.textContent = "Save... (Ctrl+S)"
    } else {
      this.saveButton.textContent = "Save As... (Ctrl+Shift+S)"
    }
  }

  saveCurrent() {
    const currentName = this.saves.selected;
    if (!currentName) return this.saveNew();
    else this.saveAs(currentName);
  }

  saveNew() {
    let name: string;
    while (!name) {
      name = prompt("Enter new name:", "").trim();
    }
    this.saveAs(name);
  }

  saveAs(name: string) {
    this.saves.saveState(name);
  }

  showDialog() {
    this.editor.style.display = "none";
    this.dialog.style.display = "block";
    this.button.className = "red";
    this.visible = true;
  }

  hideDialog() {
    this.editor.style.display = "";
    this.dialog.style.display = "";
    this.button.className = "blue";
    this.visible = false;
  }
}

let uis = new Map<CodeMirror.Editor, UI>();

export function initialize(editor: CodeMirror.Editor) {
  let ui = uis.get(editor);
  if (ui) return ui;

  const ram = new RAM(editor);
  const disk = new Disk();
  const saves = new SavesList(ram, disk);

  ui = new UI(editor, saves);
  uis.set(editor, ui);
  return ui;
}
