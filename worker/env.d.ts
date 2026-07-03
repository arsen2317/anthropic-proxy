// Secrets configured via `wrangler secret put` or Cloudflare dashboard
interface Env {
  PROXY_SECRET: string;
  ANTHROPIC_API_KEY: string;
  BRAVE_SEARCH_API_KEY: string;
}
