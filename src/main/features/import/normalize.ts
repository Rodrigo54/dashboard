// Movido para src/shared/recurrence/normalize.ts: agora é consumido tanto pelo
// import quanto pelo matching de recorrências (main), então precisa viver em
// shared. Re-exportado aqui para não obrigar import.controller/fingerprint a
// mudar de caminho.
export { normalizeText, similarityText } from '@shared/recurrence/normalize';
