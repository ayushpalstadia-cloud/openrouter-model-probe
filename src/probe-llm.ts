#!/usr/bin/env node

import { runProbe } from './runner';
import { printResults, OutputFormat } from './output';
import { loadEnv } from './env';
import * as fs from 'fs';
import * as path from 'path';

function printUsage() {
  console.log(`Usage: probe-llm [options]

Tests models on any OpenAI-compatible LLM API.

Options:
  --endpoint <url>                 API endpoint (default: OpenRouter)
  --key <api_key>                  API key (or set LLM_API_KEY env)
  --auth-header <name>             auth header name (default: Authorization)
  --auth-prefix <prefix>           value prefix (default: Bearer)
  --models <m1,m2,...>             comma-separated model slugs
  --models-file <path>             JSON file with model list (string[] or {slug,category}[])
  --prompt <text>                  test prompt (default: PONG test)
  --concurrency <n>                parallel requests (default: 3)
  --timeout <s>                    per-model timeout in seconds (default: 30)
  --output <table|json|markdown>   output format (default: table)
  --json                           shorthand for --output json
  --help                           show this help

Environment:
  LLM_API_KEY       API key (fallback: OPENROUTER_API_KEY)
  LLM_ENDPOINT      API endpoint URL

Examples:
  # Test specific OpenRouter models
  LLM_API_KEY=sk-... probe-llm --models openai/gpt-4o-mini,anthropic/claude-3-haiku

  # Test Groq models
  probe-llm --endpoint https://api.groq.com/openai/v1/chat/completions --key gsk_... --models llama3-8b-8192,mixtral-8x7b-32768

  # Test local Ollama
  probe-llm --endpoint http://localhost:11434/v1/chat/completions --key ollama --models llama3.2,mistral

  # Load from file
  probe-llm --models-file my-models.json --key sk-...
`);
}

(async () => {
  loadEnv();

  const argv = process.argv.slice(2);

  let endpoint = process.env.LLM_ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions';
  let key: string | undefined;
  let authHeader = 'Authorization';
  let authPrefix = 'Bearer';
  let modelsArg: string | undefined;
  let modelsFile: string | undefined;
  let prompt = 'Reply with exactly the word: PONG';
  let concurrency = 3;
  let timeout = 30;
  let output: OutputFormat = 'table';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--endpoint') { endpoint = argv[++i]; }
    else if (arg === '--key') { key = argv[++i]; }
    else if (arg === '--auth-header') { authHeader = argv[++i]; }
    else if (arg === '--auth-prefix') { authPrefix = argv[++i]; }
    else if (arg === '--models') { modelsArg = argv[++i]; }
    else if (arg === '--models-file') { modelsFile = argv[++i]; }
    else if (arg === '--prompt') { prompt = argv[++i]; }
    else if (arg === '--concurrency') { concurrency = parseInt(argv[++i], 10) || 3; }
    else if (arg === '--timeout') { timeout = parseInt(argv[++i], 10) || 30; }
    else if (arg === '--output') {
      const val = argv[++i];
      if (val === 'table' || val === 'json' || val === 'markdown') output = val;
    }
    else if (arg === '--json') { output = 'json'; }
    else if (arg === '--help') { printUsage(); process.exit(0); }
  }

  let models: { slug: string; category: string }[] = [];

  if (modelsFile) {
    const filePath = path.resolve(modelsFile);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(parsed)) {
      models = parsed.map((m) =>
        typeof m === 'string' ? { slug: m, category: 'custom' } : m
      );
    }
  } else if (modelsArg) {
    models = modelsArg.split(',').map((s) => ({ slug: s.trim(), category: 'custom' }));
  }

  if (models.length === 0) {
    console.error('Error: provide --models or --models-file');
    process.exit(1);
  }

  const apiKey = key || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Error: API key required (--key, LLM_API_KEY, or OPENROUTER_API_KEY)');
    process.exit(1);
  }

  const results = await runProbe(models, {
    endpoint,
    apiKey,
    authHeader,
    authPrefix,
    testPrompt: prompt,
    concurrency,
    timeoutMs: timeout * 1000,
  });

  printResults(results, output);
  process.exit(0);
})();
