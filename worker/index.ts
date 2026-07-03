export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const proxySecret = request.headers.get('x-proxy-secret');
    if (!proxySecret || proxySecret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    // Normalize pathname: collapse multiple leading slashes
    const pathname = '/' + url.pathname.replace(/^\/+/, '');

    // Forward to Anthropic API
    // Handles both /anthropic/v1/* (when ANTHROPIC_PROXY_URL ends with /anthropic)
    // and /v1/* (when ANTHROPIC_PROXY_URL is the root URL)
    if (pathname.startsWith('/anthropic/')) {
      const apiPath = pathname.slice('/anthropic'.length);
      const target = `https://api.anthropic.com${apiPath}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete('x-proxy-secret');
      headers.delete('host');
      headers.set('x-api-key', env.ANTHROPIC_API_KEY);
      return fetch(target, { method: request.method, headers, body: request.body });
    }

    if (pathname.startsWith('/v1/')) {
      const target = `https://api.anthropic.com${pathname}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete('x-proxy-secret');
      headers.delete('host');
      headers.set('x-api-key', env.ANTHROPIC_API_KEY);
      return fetch(target, { method: request.method, headers, body: request.body });
    }

    // Forward to Brave Search
    // Handles both /brave/res/* (when BRAVE_PROXY_URL ends with /brave)
    // and /res/* (when BRAVE_PROXY_URL is the root URL)
    if (pathname.startsWith('/brave/')) {
      const apiPath = pathname.slice('/brave'.length);
      const target = `https://api.search.brave.com${apiPath}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete('x-proxy-secret');
      headers.delete('host');
      headers.set('X-Subscription-Token', env.BRAVE_SEARCH_API_KEY);
      return fetch(target, { method: request.method, headers, body: request.body });
    }

    if (pathname.startsWith('/res/')) {
      const target = `https://api.search.brave.com${pathname}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete('x-proxy-secret');
      headers.delete('host');
      headers.set('X-Subscription-Token', env.BRAVE_SEARCH_API_KEY);
      return fetch(target, { method: request.method, headers, body: request.body });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
