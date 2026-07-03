export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const proxySecret = request.headers.get('x-proxy-secret');
    if (!proxySecret || proxySecret !== env.PROXY_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    // Normalize pathname: collapse multiple leading slashes (e.g. //v1/ → /v1/)
    // This handles the case where ANTHROPIC_PROXY_URL has a trailing slash.
    const pathname = '/' + url.pathname.replace(/^\/+/, '');

    // Forward to Anthropic API
    if (pathname.startsWith('/v1/')) {
      const target = `https://api.anthropic.com${pathname}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete('x-proxy-secret');
      headers.delete('host');
      headers.set('x-api-key', env.ANTHROPIC_API_KEY);
      return fetch(target, { method: request.method, headers, body: request.body });
    }

    // Forward to Brave Search
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
