import { TestResult, TestStatus } from './runner';

export type OutputFormat = 'table' | 'json' | 'markdown';

function getStatusIcon(status: TestStatus): string {
  switch (status) {
    case 'ok': return '✓';
    case 'null_content': return '⚠';
    case 'error':
    case 'timeout': return '✗';
  }
}

function formatLatency(latencyMs: number): string {
  return `${latencyMs}ms`;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function groupByCategory(results: TestResult[]): Map<string, TestResult[]> {
  const map = new Map<string, TestResult[]>();
  for (const result of results) {
    const cat = result.category || 'uncategorized';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(result);
  }
  return map;
}

export function printResults(results: TestResult[], format: OutputFormat): void {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(results, null, 2));
      break;
    case 'markdown':
      printMarkdown(results);
      break;
    case 'table':
    default:
      printTable(results);
  }
}

function printTable(results: TestResult[]): void {
  console.log(`OpenRouter Model Probe — ${new Date().toISOString()}`);
  console.log();

  const categories = groupByCategory(results);
  let totalWorking = 0;
  const perCategoryParts: string[] = [];
  const bestPerCategory = new Map<string, string>();

  for (const [category, catResults] of categories) {
    console.log(category.toUpperCase());

    let working = 0;
    for (const result of catResults) {
      const icon = getStatusIcon(result.status);
      const slugPadded = result.slug.padEnd(55);

      if (result.status === 'ok') {
        console.log(`  ${icon}  ${slugPadded} ${formatLatency(result.latencyMs)}`);
        working++;
        if (!bestPerCategory.has(category)) bestPerCategory.set(category, result.slug);
      } else if (result.status === 'error') {
        console.log(`  ${icon}  ${slugPadded} ERROR: ${truncate(result.errorMessage || 'Unknown error', 60)}`);
      } else if (result.status === 'null_content') {
        console.log(`  ${icon}  ${slugPadded} NULL CONTENT`);
      } else {
        console.log(`  ${icon}  ${slugPadded} TIMEOUT`);
      }
    }

    totalWorking += working;
    perCategoryParts.push(`${category}: ${working}/${catResults.length}`);
    console.log();
  }

  console.log(`Summary: ${totalWorking}/${results.length} working  |  ${perCategoryParts.join('  |  ')}`);
  console.log();

  for (const [category, slug] of bestPerCategory) {
    console.log(`Best ${category}: ${slug}`);
  }
}

function printMarkdown(results: TestResult[]): void {
  const categories = groupByCategory(results);
  let totalWorking = 0;
  const perCategoryParts: string[] = [];

  for (const [category, catResults] of categories) {
    console.log(`## ${category}`);
    console.log();
    console.log('| Model | Status | Latency | Note |');
    console.log('|-------|--------|---------|------|');

    let working = 0;
    for (const result of catResults) {
      let note = '';
      if (result.status === 'ok') {
        working++;
      } else if (result.status === 'error') {
        note = result.errorMessage || 'Unknown error';
      } else if (result.status === 'null_content') {
        note = 'NULL CONTENT';
      } else {
        note = 'TIMEOUT';
      }
      console.log(`| ${result.slug} | ${result.status} | ${result.status === 'ok' ? formatLatency(result.latencyMs) : ''} | ${note} |`);
    }

    totalWorking += working;
    perCategoryParts.push(`${category}: ${working}/${catResults.length}`);
    console.log();
  }

  console.log(`Summary: ${totalWorking}/${results.length} working (${perCategoryParts.join(', ')})`);
}
