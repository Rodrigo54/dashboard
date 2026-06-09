// Wrapper do CLI do electron-vite que roda com um ambiente limpo.
//
// Alguns shells/IDEs exportam ELECTRON_RUN_AS_NODE=1, o que faz o binário do
// Electron se comportar como Node puro (sem janela; `require('electron')` não
// expõe a API, então `app` fica `undefined`). O launcher do electron-vite NÃO
// remove essa variável, então a limpamos aqui antes de delegar ao CLI — o
// Electron filho herda o ambiente já limpo.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
// O subpath do bin não está no campo "exports" do electron-vite, mas
// "./package.json" está — então resolvemos o pacote por ele e montamos o
// caminho do CLI a partir do diretório do pacote + o campo `bin`.
const pkgPath = require.resolve('electron-vite/package.json');
const { bin } = require(pkgPath);
const cli = join(dirname(pkgPath), bin['electron-vite']);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
