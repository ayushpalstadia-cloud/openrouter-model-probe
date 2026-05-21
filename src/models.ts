
// FILE: src/models.ts
export type Category = 'fast' | 'reasoning' | 'coding';

export interface ModelEntry {
  slug: string;
  category: Category;
  description?: string;
}

export const MODELS: ModelEntry[] = [
  // Fast category
  { slug: 'openai/gpt-oss-20b:free', category: 'fast', description: 'Verified working. Best for classification, tagging, short outputs.' },
  { slug: 'nvidia/nemotron-nano-9b-v2:free', category: 'fast', description: 'Verified working. Reliable fast fallback.' },
  { slug: 'google/gemma-2-9b-it:free', category: 'fast', description: 'Unverified. Small, fast.' },
  { slug: 'mistralai/mistral-7b-instruct:free', category: 'fast', description: 'Unverified.' },
  { slug: 'microsoft/phi-3.5-mini-128k-instruct:free', category: 'fast', description: 'Unverified. 128k context.' },
  // Reasoning category
  { slug: 'openai/gpt-oss-120b:free', category: 'reasoning', description: 'Verified working. Best for analysis, summaries, long output.' },
  { slug: 'deepseek/deepseek-r1:free', category: 'reasoning', description: 'Rate limited at peak. Strong reasoning.' },
  { slug: 'google/gemma-4-26b-a4b-it:free', category: 'reasoning', description: 'Unverified.' },
  { slug: 'google/gemma-4-31b-it:free', category: 'reasoning', description: 'Unverified.' },
  { slug: 'mistralai/mistral-small-3.2-24b-instruct:free', category: 'reasoning', description: 'Unverified.' },
  // Coding category
  { slug: 'poolside/laguna-m.1:free', category: 'coding', description: 'Verified working. Flagship coding model.' },
  { slug: 'poolside/laguna-xs.2:free', category: 'coding', description: 'Verified working. Fast coding model.' },
  { slug: 'deepseek/deepseek-coder-v2-lite-instruct:free', category: 'coding', description: 'Unverified.' },
  { slug: 'qwen/qwen-2.5-coder-7b-instruct:free', category: 'coding', description: 'Unverified.' },
  { slug: 'microsoft/phi-4:free', category: 'coding', description: 'Unverified.' },
];

export function getModelsByCategory(category: Category): ModelEntry[] {
  return MODELS.filter(model => model.category === category);
}

export function getAllSlugs(): string[] {
  return MODELS.map(model => model.slug);
}
