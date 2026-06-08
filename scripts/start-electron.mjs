// Launches Electron with a clean environment.
//
// Some shells/IDEs export ELECTRON_RUN_AS_NODE=1, which makes the electron
// binary behave as a plain Node process: no window opens and require('electron')
// returns the binary path instead of the API. We strip it before spawning.
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
