import { join } from 'node:path';
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

// Hook afterPack do electron-builder: vira os Electron Fuses no binário
// empacotado. Desliga RunAsNode para que a build de produção não possa ser
// executada como Node puro (ELECTRON_RUN_AS_NODE) — endurecimento de segurança.
export default async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;

  const ext = { darwin: '.app', win32: '.exe', linux: '' }[electronPlatformName];
  const executableName =
    electronPlatformName === 'linux'
      ? packager.appInfo.productFilename.toLowerCase()
      : packager.appInfo.productFilename;

  const electronBinaryPath = join(appOutDir, `${executableName}${ext}`);

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
  });
}
