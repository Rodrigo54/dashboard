/**
 * Conversões entre `Date` e o valor string de `<input type="date">`
 * (`YYYY-MM-DD`), sempre em horário local — `new Date('YYYY-MM-DD')` parseia
 * como UTC e deslocaria o dia no fuso de Brasília.
 */

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
