
import https from 'https';

export type TestStatus = 'ok' | 'error' | 'null_content' | 'timeout';

export interface TestResult {
  slug: string;
  category: string;
  status: TestStatus;
  latencyMs: number;
  errorMessage: string | null;
  responsePreview: string | null;
  checkedAt: string;
}

export interface ProbeOptions {
  endpoint: string;
  apiKey: string;
  authHeader?: string;
  authPrefix?: string;
  testPrompt?: string;
  timeoutMs?: number;
  concurrency?: number;
  extraHeaders?: Record<string, string>;
}

export async function runProbe(
  models: Array<{ slug: string; category: string }>,
  options: ProbeOptions
): Promise<TestResult[]> {
  const {
    endpoint,
    apiKey,
    authHeader = 'Authorization',
    authPrefix = 'Bearer',
    testPrompt = 'Reply with exactly the word: PONG',
    timeoutMs = 30000,
    concurrency = 3,
    extraHeaders = {}
  } = options;

  const results: TestResult[] = [];

  for (let i = 0; i < models.length; i += concurrency) {
    const batch = models.slice(i, i + concurrency);
    const batchPromises = batch.map(model =>
      testModel(model, {
        endpoint,
        apiKey,
        authHeader,
        authPrefix,
        testPrompt,
        timeoutMs,
        extraHeaders
      })
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}

async function testModel(
  model: { slug: string; category: string },
  opts: {
    endpoint: string;
    apiKey: string;
    authHeader: string;
    authPrefix: string;
    testPrompt: string;
    timeoutMs: number;
    extraHeaders: Record<string, string>;
  }
): Promise<TestResult> {
  const { slug, category } = model;
  const { endpoint, apiKey, authHeader, authPrefix, testPrompt, timeoutMs, extraHeaders } = opts;
  const checkedAt = new Date().toISOString();
  const startTime = Date.now();

  try {
    const response = await makeHttpsRequest({
      endpoint,
      apiKey,
      authHeader,
      authPrefix,
      testPrompt,
      timeoutMs,
      extraHeaders,
      modelSlug: slug
    });

    const latencyMs = Date.now() - startTime;

    if (response.status >= 400) {
      return {
        slug,
        category,
        status: 'error',
        latencyMs,
        errorMessage: `HTTP ${response.status}: ${response.statusMessage}`,
        responsePreview: null,
        checkedAt
      };
    }

    let data: any;
    try {
      data = JSON.parse(response.data);
    } catch {
      return {
        slug,
        category,
        status: 'error',
        latencyMs,
        errorMessage: 'Failed to parse response JSON',
        responsePreview: null,
        checkedAt
      };
    }

    const content = data?.choices?.[0]?.message?.content;

    if (content === null || content === undefined || content === '') {
      return {
        slug,
        category,
        status: 'null_content',
        latencyMs,
        errorMessage: null,
        responsePreview: null,
        checkedAt
      };
    }

    return {
      slug,
      category,
      status: 'ok',
      latencyMs,
      errorMessage: null,
      responsePreview: String(content).slice(0, 80),
      checkedAt
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    if (error.name === 'TimeoutError') {
      return {
        slug,
        category,
        status: 'timeout',
        latencyMs,
        errorMessage: 'Request timed out',
        responsePreview: null,
        checkedAt
      };
    }

    return {
      slug,
      category,
      status: 'error',
      latencyMs,
      errorMessage: error.message || 'Network error',
      responsePreview: null,
      checkedAt
    };
  }
}

interface HttpsResponse {
  status: number;
  statusMessage: string;
  data: string;
}

function makeHttpsRequest(opts: {
  endpoint: string;
  apiKey: string;
  authHeader: string;
  authPrefix: string;
  testPrompt: string;
  timeoutMs: number;
  extraHeaders: Record<string, string>;
  modelSlug: string;
}): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.endpoint);

    const body = JSON.stringify({
      model: opts.modelSlug,
      messages: [{ role: 'user', content: opts.testPrompt }],
      max_tokens: 10,
      temperature: 0
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString(),
      [opts.authHeader]: `${opts.authPrefix} ${opts.apiKey}`,
      ...opts.extraHeaders
    };

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers
    };

    const timeout = setTimeout(() => {
      req.destroy();
      const error = new Error('Request timed out');
      error.name = 'TimeoutError';
      reject(error);
    }, opts.timeoutMs);

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);
        resolve({
          status: res.statusCode || 0,
          statusMessage: res.statusMessage || '',
          data
        });
      });

      res.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    req.write(body);
    req.end();
  });
}
