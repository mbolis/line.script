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

const btnLoad = document.getElementById("load") as HTMLButtonElement;
const btnSave = document.getElementById("save");

const dlgDisk = document.getElementById("disk");
const lstSaves = document.getElementById("saves");

type DiskState = { name?: string, code: string };

let editor: CodeMirror.Editor;
let currentlyLoaded: DiskState;

export function initialize(codeMirrorEditor: CodeMirror.Editor) {
    editor = codeMirrorEditor;

    loadRamState();
    loadSavedEditorStates();

    editor.on("change", debounce(
        () => saveRamState(Object.assign(currentlyLoaded, { code: editor.getValue() })),
        400));
}
function loadRamState() {
    currentlyLoaded = JSON.parse(localStorage.getItem("ram") || `{"code":""}`);
    editor.setValue(currentlyLoaded.code);
}
function loadSavedEditorStates() {
    lstSaves.innerHTML = "";
    getSavedEditorStates()
        .forEach(({ name }) => {
            const item = document.createElement("li");
            if (name == currentlyLoaded.name) {
                item.classList.add("currently-loaded");
            }
            item.textContent = name;
            item.addEventListener("click", () => loadEditorState(name));
            lstSaves.appendChild(item);

            const btnDelete = document.createElement("a");
            btnDelete.classList.add("delete");
            btnDelete.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteEditorState(name);
            });
            item.appendChild(btnDelete);
        });
}
function loadEditorState(saveName: string) {
    const save = getEditorState(saveName);
    if (save) {
        saveRamState(save);
        editor.setValue(save.code);

        alert(`Save restored: "${saveName}"`);
        hideDiskContent();
        loadSavedEditorStates();
    }
}
function getSavedEditorStates(): Array<DiskState> {
    const savesText = localStorage.getItem("saves");
    if (!savesText) {
        return [];
    }
    return JSON.parse(savesText);
}
function getEditorState(saveName: string) {
    return getSavedEditorStates().find(({ name }) => name == saveName);
}

function deleteEditorState(nameToDelete: string) {
    if (confirm(`Delete "${nameToDelete}" permanently?`)) {
        const saves = getSavedEditorStates().filter(({ name }) => name != nameToDelete);
        localStorage.setItem("saves", JSON.stringify(saves));
        if (currentlyLoaded.name == nameToDelete) {
            saveRamState({ code: currentlyLoaded.code });
        }
        loadSavedEditorStates();
    }
}

let dlgDiskState = "hidden";
btnLoad.addEventListener("click", () => {
    if (dlgDiskState == "hidden") {
        showDiskContent();
    } else {
        hideDiskContent();
    }
});

export function showDiskContent() {
    editor.getWrapperElement().style.display = "none";
    dlgDisk.style.display = "block";
    dlgDiskState = "visible";
    btnLoad.className = "red";
}
function hideDiskContent() {
    editor.getWrapperElement().style.display = null;
    dlgDisk.style.display = null;
    btnLoad.className = "blue";
    dlgDiskState = "hidden";
}

function saveRamState(state: DiskState) {
    currentlyLoaded = state
    localStorage.setItem("ram", JSON.stringify(state));
}
function saveEditorState(name: string, code: string) {
    saveRamState({ name, code });
    const saves = getSavedEditorStates()
        .filter(({ name: prevName }) => prevName != name)
        .concat(currentlyLoaded)
        .sort(({ name: n1 }, { name: n2 }) => n1.localeCompare(n2));
    localStorage.setItem("saves", JSON.stringify(saves));
    loadSavedEditorStates();
}

btnSave.addEventListener("click", saveOperation);
export function saveOperation() {
    let name: string;
    if (currentlyLoaded && currentlyLoaded.name) {
        name = currentlyLoaded.name
        if (confirm(`Overwrite: "${name}" ?`)) {
            saveEditorState(name, editor.getValue());
        } else if (name = prompt("Enter new name:")) {
            if (getEditorState(name) && !confirm(`Overwrite: "${name}" ?`)) {
                return;
            }
            saveEditorState(name, editor.getValue());
        }
    } else if (name = prompt("Enter name:")) {
        if (getEditorState(name) && !confirm(`Overwrite: "${name}" ?`)) {
            return;
        }
        saveEditorState(name, editor.getValue());
    }
}
