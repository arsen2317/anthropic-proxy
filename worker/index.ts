// Only forward headers the upstream API actually needs. Never pass through
// anything from the inbound request that could reveal the true client
// origin (cf-connecting-ip, cf-ipcountry, cf-ray, x-forwarded-for, via, ...) —
// forwarding those defeats the point of proxying and can get the request
// blocked by upstream anti-abuse/geo rules.
const ANTHROPIC_FORWARD_HEADERS = ['content-type', 'accept', 'anthropic-version', 'anthropic-beta'];
const BRAVE_FORWARD_HEADERS = ['accept'];

function pickHeaders(request: Request, allowlist: string[]): Headers {
  const headers = new Headers();
  for (const name of allowlist) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const proxySecret = request.headers.get('x-proxy-secret');
    if (!proxySecret || proxySecret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    // Normalize pathname: collapse multiple leading slashes
    const pathname = '/' + url.pathname.replace(/^\/+/, '');
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

    // Forward to Anthropic API
    // Handles both /anthropic/v1/* (when ANTHROPIC_PROXY_URL ends with /anthropic)
    // and /v1/* (when ANTHROPIC_PROXY_URL is the root URL)
    if (pathname.startsWith('/anthropic/') || pathname.startsWith('/v1/')) {
      const apiPath = pathname.startsWith('/anthropic/') ? pathname.slice('/anthropic'.length) : pathname;
      const target = `https://api.anthropic.com${apiPath}${url.search}`;
      const headers = pickHeaders(request, ANTHROPIC_FORWARD_HEADERS);
      headers.set('x-api-key', env.ANTHROPIC_API_KEY);
      return fetch(target, {
        method: request.method,
        headers,
        body: request.body,
        ...(hasBody ? { duplex: 'half' as const } : {}),
      });
    }

    // Forward to Brave Search
    // Handles both /brave/res/* (when BRAVE_PROXY_URL ends with /brave)
    // and /res/* (when BRAVE_PROXY_URL is the root URL)
    if (pathname.startsWith('/brave/') || pathname.startsWith('/res/')) {
      const apiPath = pathname.startsWith('/brave/') ? pathname.slice('/brave'.length) : pathname;
      const target = `https://api.search.brave.com${apiPath}${url.search}`;
      const headers = pickHeaders(request, BRAVE_FORWARD_HEADERS);
      headers.set('X-Subscription-Token', env.BRAVE_SEARCH_API_KEY);
      return fetch(target, {
        method: request.method,
        headers,
        body: request.body,
        ...(hasBody ? { duplex: 'half' as const } : {}),
      });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
