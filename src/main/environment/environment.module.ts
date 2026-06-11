// Barrel público da camada de environment — consumidores importam daqui.
export { getEnvironment, getPublicEnvironment } from './environment.providers';
export { interpolateEnvVars, parseEnvironment } from './environment.parser';
