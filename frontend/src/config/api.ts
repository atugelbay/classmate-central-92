const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const isProd = import.meta.env.PROD;

const normalizeApiUrl = (url: string): string => {
  const withoutTrailingSlash = url.replace(/\/+$/, "");
  return /\/api$/i.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
};

// In production, prefer same-origin /api if env is missing.
// This prevents broken bundles pointing to localhost.
const resolvedApiUrl = rawApiUrl
  ? normalizeApiUrl(rawApiUrl)
  : isProd
    ? "/api"
    : "http://localhost:8080/api";

export const API_URL = resolvedApiUrl;
export const API_BASE_URL = API_URL.replace(/\/api\/?$/, "") || "/";
