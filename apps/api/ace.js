/*
 * Entrypoint del CLI ace. Se invoca como `node ace <command>` desde scripts
 * del package.json (los scripts pasan `--import=ts-node-maintained/register/esm`
 * para resolver TypeScript en vivo).
 */
await import('./bin/console.js')
