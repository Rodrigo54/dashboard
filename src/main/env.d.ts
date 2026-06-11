/// <reference types="electron-vite/node" />

// Imports de YAML como texto bruto (feature `?raw` do Vite) — usados pelo
// provider de environment para embutir os environments/*.yml no bundle do main.
declare module '*.yml?raw' {
  const content: string;
  export default content;
}
