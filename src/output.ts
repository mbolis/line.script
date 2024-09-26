const txtOut = document.getElementById("out");

export function info(message: string) {
  txtOut.innerHTML += `<span style=color:#0060df>${message}</span>\n`;
}

export function error(message: string) {
  txtOut.innerHTML += `<span style=color:red>${message}</span>\n`;
}

export function clear() {
  txtOut.textContent = "";
}
