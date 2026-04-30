const fs = require("fs");
const path = require("path");

const origem = __dirname;
const destino = path.join(__dirname, "dist");

const ignorar = [".git", "node_modules", "dist"];

function copiar(origemAtual, destinoAtual) {
  if (!fs.existsSync(destinoAtual)) {
    fs.mkdirSync(destinoAtual, { recursive: true });
  }

  for (const item of fs.readdirSync(origemAtual)) {
    if (ignorar.includes(item)) continue;

    const origemItem = path.join(origemAtual, item);
    const destinoItem = path.join(destinoAtual, item);
    const stat = fs.statSync(origemItem);

    if (stat.isDirectory()) {
      copiar(origemItem, destinoItem);
    } else {
      fs.copyFileSync(origemItem, destinoItem);
    }
  }
}

if (fs.existsSync(destino)) {
  fs.rmSync(destino, { recursive: true, force: true });
}

copiar(origem, destino);
console.log("Arquivos copiados para dist com sucesso.");
