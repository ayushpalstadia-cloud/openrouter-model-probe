#!/usr/bin/env node

import { MODELS, getModelsByCategory, Category } from './models';
import { runProbe, ProbeOptions } from './runner';
import { printResults, OutputFormat } from './output';
import { loadEnv } from './env';

function printUsage() {
  console.log(`Usage: probe-openrouter [options]

Tests which OpenRouter free models are currently working.

Options:
  --category <fast|reasoning|coding>   test only one category (default: all)
  --concurrency <n>                    parallel requests (default: 3)
  --timeout <s>                        per-model timeout in seconds (default: 30)
  --output <table|json|markdown>       output format (default: table)
  --json                               shorthand for --output json
  --help                               show this help

Environment:
  OPENROUTER_API_KEY   required

Examples:
  OPENROUTER_API_KEY=sk-... probe-openrouter
  OPENROUTER_API_KEY=sk-... probe-openrouter --category fast --json`);
}

function parseArgs(args: string[]) {
  const options: {
    category?: Category;
    concurrency: number;
    timeout: number;
    output: OutputFormat;
  } = {
    concurrency: 3,
    timeout: 30,
    output: 'table',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--category') {
      const val = args[++i];
      if (val === 'fast' || val === 'reasoning' || val === 'coding') {
        options.category = val;
      }
    } else if (arg === '--concurrency') {
      options.concurrency = parseInt(args[++i], 10) || 3;
    } else if (arg === '--timeout') {
      options.timeout = parseInt(args[++i], 10) || 30;
    } else if (arg === '--output') {
      const val = args[++i];
      if (val === 'table' || val === 'json' || val === 'markdown') {
        options.output = val;
      }
    } else if (arg === '--json') {
      options.output = 'json';
    } else if (arg === '--help') {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY not set');
    process.exit(1);
  }

  let models = MODELS;
  if (options.category) {
    models = getModelsByCategory(options.category);
  }

  console.error(`Testing ${models.length} models...`);

  const probeOptions: ProbeOptions = {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY!,
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/ayushpalstadia-cloud/openrouter-model-probe',
      'X-Title': 'openrouter-model-probe',
    },
    concurrency: options.concurrency,
    timeoutMs: options.timeout * 1000,
  };

  const results = await runProbe(models, probeOptions);
  printResults(results, options.output);

  const criticalModels = ['openai/gpt-oss-20b:free', 'openai/gpt-oss-120b:free'];
  const criticalFailed = results.some(
    (r) => criticalModels.includes(r.slug) && r.status !== 'ok'
  );

  if (criticalFailed) {
    process.exit(1);
  }
}

main();
