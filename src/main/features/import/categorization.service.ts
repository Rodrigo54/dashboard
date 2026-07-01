import type { TransactionCategory, TransactionType } from '@shared/enums';
import { Service } from '../../core/service.decorator';

interface CategoryRule {
  readonly category: TransactionCategory;
  readonly pattern: RegExp;
}

// Dicionário-semente: casa a descrição crua do extrato com uma categoria. A
// ordem importa — a primeira regra que casar vence. Regras aprendidas do
// usuário (padrão -> categoria) ficam como evolução futura, aplicadas antes
// desta semente.
const INCOME_RULES: readonly CategoryRule[] = [
  {
    category: 'salary',
    pattern: /sal[aá]rio|remunera|folha\s+pag|pagto\s+sal|vencimento|proventos/i,
  },
  { category: 'investment_return', pattern: /rendimento|dividend|jcp|resgate|juros\s+poup/i },
  { category: 'freelance', pattern: /honor[aá]ri|servi[cç]o\s+prestad/i },
];

const EXPENSE_RULES: readonly CategoryRule[] = [
  {
    category: 'food',
    pattern:
      /rest(aurante)?|lanchon|ifood|supermerc|mercado(?!\s*livre|\s*pago)|padaria|a[cç]ougue|hortifruti/i,
  },
  {
    category: 'transport',
    pattern:
      /uber|99app|99\s|posto|combust|gasolina|estacion|ped[aá]gio|metr[oô]|[oô]nibus|passagem/i,
  },
  { category: 'housing', pattern: /alug(uel)?|condom[ií]nio|imobili[aá]ri/i },
  {
    category: 'utilities',
    pattern:
      /energia|cemig|enel|copel|sabesp|[aá]gua|telefon|vivo|claro|\btim\b|internet|banda\s+larga/i,
  },
  {
    category: 'healthcare',
    pattern:
      /farm[aá]c|drogaria|drogasil|hospital|cl[ií]nic|laborat|unimed|\bamil\b|plano\s+de\s+sa[uú]de/i,
  },
  {
    category: 'education',
    pattern: /escola|fies|faculdade|universidade|\bcurso\b|col[eé]gio|mensalidade\s+escolar/i,
  },
  {
    category: 'entertainment',
    pattern: /netflix|spotify|cinema|prime\s+video|disney|\bhbo\b|max\b|youtube\s+prem/i,
  },
  { category: 'subscription', pattern: /assinatura|mensalidade|recorrente/i },
  {
    category: 'shopping',
    pattern: /magalu|americanas|amazon|mercado\s*livre|shopee|aliexpress|\bloja\b/i,
  },
  { category: 'tax', pattern: /tarifa|\biof\b|imposto|\bdarf\b|tributo|\btaxa\b|anuidade|juros/i },
];

/** Sugere a categoria de uma linha importada a partir da descrição crua. */
@Service('import-categorization')
export class CategorizationService {
  suggest(type: TransactionType, description: string): TransactionCategory {
    const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES;
    const match = rules.find((rule) => rule.pattern.test(description));
    if (match) return match.category;
    return type === 'income' ? 'other_income' : 'other_expense';
  }
}
