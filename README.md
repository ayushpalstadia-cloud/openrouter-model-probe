# openrouter-model-probe

CLI tool to test which LLM models are currently working on OpenRouter (or any OpenAI-compatible API).

OpenRouter's free model list changes frequently — models get added, removed, or start returning null content. This tool pings each model and reports what's actually working right now.

## Install

```bash
npm install -g openrouter-model-probe
```

Or run directly without installing:

```bash
npx openrouter-model-probe --help
```

## Two CLIs

### `probe-openrouter` — Test OpenRouter free models

Uses a built-in curated list of 15 free models grouped into three categories: fast, reasoning, and coding.

```bash
OPENROUTER_API_KEY=sk-... probe-openrouter
```

**Options:**

```
--category <fast|reasoning|coding>   test only one category (default: all)
--concurrency <n>                    parallel requests (default: 3)
--timeout <s>                        per-model timeout in seconds (default: 30)
--output <table|json|markdown>       output format (default: table)
--json                               shorthand for --output json
--help                               show this help
```

**Example output:**

```
OpenRouter Model Probe — 2026-05-21T14:30:00.000Z

FAST
  ✓  openai/gpt-oss-20b:free                                 1321ms
  ⚠  nvidia/nemotron-nano-9b-v2:free                         NULL CONTENT
  ✗  google/gemma-2-9b-it:free                               ERROR: HTTP 404: Not Found

REASONING
  ✓  openai/gpt-oss-120b:free                                2840ms
  ✗  deepseek/deepseek-r1:free                               ERROR: HTTP 429: Too Many Requests

CODING
  ✓  poolside/laguna-m.1:free                                1950ms
  ✓  poolside/laguna-xs.2:free                               1120ms

Summary: 4/15 working  |  fast: 1/5  |  reasoning: 1/5  |  coding: 2/5

Best fast: openai/gpt-oss-20b:free
Best reasoning: openai/gpt-oss-120b:free
Best coding: poolside/laguna-m.1:free
```

---

### `probe-llm` — Test any OpenAI-compatible API

Works with OpenRouter, Groq, Together AI, Ollama, OpenAI, or any API that follows the `/v1/chat/completions` format.

```bash
# Test specific OpenRouter models
LLM_API_KEY=sk-... probe-llm --models openai/gpt-4o-mini,anthropic/claude-3-haiku

# Test Groq models
probe-llm --endpoint https://api.groq.com/openai/v1/chat/completions \
  --key gsk_... --models llama3-8b-8192,mixtral-8x7b-32768

# Test local Ollama
probe-llm --endpoint http://localhost:11434/v1/chat/completions \
  --key ollama --models llama3.2,mistral

# Load model list from file
probe-llm --models-file my-models.json --key sk-...
```

**Options:**

```
--endpoint <url>                 API endpoint (default: OpenRouter)
--key <api_key>                  API key (or set LLM_API_KEY env)
--auth-header <name>             auth header name (default: Authorization)
--auth-prefix <prefix>           value prefix (default: Bearer)
--models <m1,m2,...>             comma-separated model slugs
--models-file <path>             JSON file: string[] or {slug,category}[]
--prompt <text>                  test prompt (default: PONG test)
--concurrency <n>                parallel requests (default: 3)
--timeout <s>                    per-model timeout in seconds (default: 30)
--output <table|json|markdown>   output format (default: table)
--json                           shorthand for --output json
--help                           show this help
```

**Models file format** — either a simple array or categorized:

```json
["llama3-8b-8192", "mixtral-8x7b-32768"]
```

```json
[
  { "slug": "llama3-8b-8192", "category": "fast" },
  { "slug": "mixtral-8x7b-32768", "category": "reasoning" }
]
```

**Environment variables:**

| Variable | Description |
|---|---|
| `LLM_API_KEY` | API key (fallback: `OPENROUTER_API_KEY`) |
| `LLM_ENDPOINT` | API endpoint URL |
| `OPENROUTER_API_KEY` | OpenRouter API key (used by `probe-openrouter`) |

Both tools load `.env` and `.env.local` from the current working directory automatically.

## Status codes

| Icon | Status | Meaning |
|---|---|---|
| ✓ | `ok` | Model responded with non-empty content |
| ⚠ | `null_content` | HTTP 200 but response content was null or empty |
| ✗ | `error` | HTTP error (4xx/5xx) or network failure |
| ✗ | `timeout` | No response within the timeout window |

## Exit codes

`probe-openrouter` exits with code `1` if any critical models (`openai/gpt-oss-20b:free` or `openai/gpt-oss-120b:free`) are not working — useful for CI or health-check scripts.

`probe-llm` always exits `0` after printing results.

## JSON output

```bash
probe-openrouter --json | jq '.[] | select(.status == "ok") | .slug'
```

```json
[
  {
    "slug": "openai/gpt-oss-20b:free",
    "category": "fast",
    "status": "ok",
    "latencyMs": 1321,
    "errorMessage": null,
    "responsePreview": "PONG",
    "checkedAt": "2026-05-21T14:30:01.234Z"
  }
]
```

## Development

```bash
git clone https://github.com/your-username/openrouter-model-probe
cd openrouter-model-probe
npm install
npm run build

# Test
OPENROUTER_API_KEY=sk-... node dist/probe-openrouter.js --category fast
```

## License

MIT
