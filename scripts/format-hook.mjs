// Hook PostToolUse do Claude Code: formata cada arquivo escrito/editado por um
// agente de IA com Prettier (e ESLint --fix para TS/HTML), espelhando o
// "format on save" do VSCode. Recebe o JSON do tool via stdin.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const PRETTIER_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.css',
  '.json',
  '.md',
]);
const ESLINT_EXT = new Set(['.ts', '.html']);

const isWin = process.platform === 'win32';
const binDir = join(process.cwd(), 'node_modules', '.bin');

// Resolve o shim do binário independentemente do gerenciador de pacotes:
// bun cria `nome.exe`, npm/pnpm criam `nome.cmd`, Unix usa o nome puro.
function resolveBin(name) {
  const candidates = isWin ? [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name] : [name];
  for (const candidate of candidates) {
    const full = join(binDir, candidate);
    if (existsSync(full)) return full;
  }
  return null;
}

function run(name, args) {
  const bin = resolveBin(name);
  if (!bin) return;
  // `.cmd`/`.bat` precisam de shell; executáveis reais (.exe) não.
  const shell = isWin && /\.(cmd|bat)$/i.test(bin);
  spawnSync(bin, [...args, filePath], { stdio: 'ignore', shell });
}

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;

let filePath;
try {
  filePath = JSON.parse(input)?.tool_input?.file_path;
} catch {
  process.exit(0);
}

const ext = filePath ? extname(filePath).toLowerCase() : '';
if (!filePath || !existsSync(filePath) || !PRETTIER_EXT.has(ext)) process.exit(0);

run('prettier', ['--write', '--ignore-unknown']);
if (ESLINT_EXT.has(ext)) run('eslint', ['--fix', '--no-warn-ignored']);

process.exit(0);
