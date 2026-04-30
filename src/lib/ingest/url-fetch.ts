// Fetch a URL and extract its readable article body using Mozilla Readability.
// Same library Firefox uses for Reader View. Strips boilerplate (nav, ads,
// cookie banners, related-posts) and returns clean article text.
//
// Hard limits: 10s fetch timeout, 5MB max body, must be http(s).

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;

export type FetchedArticle = {
  url: string;
  title: string;
  text: string;
  byline: string | null;
  excerpt: string | null;
  site_name: string | null;
};

export async function fetchAndExtract(url: string): Promise<FetchedArticle> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PremiseBot/0.1; +https://github.com/aaronalm-ops/premise)",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Source returned ${res.status} ${res.statusText}`);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new Error(
        `Page too large (${buf.byteLength} bytes; limit ${MAX_BYTES}).`,
      );
    }
    html = new TextDecoder("utf-8").decode(buf);
  } finally {
    clearTimeout(timer);
  }

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    throw new Error(
      "Could not extract readable content. The page may be paywalled, JS-rendered, or empty.",
    );
  }

  return {
    url,
    title: article.title || url,
    text: article.textContent.trim(),
    byline: article.byline ?? null,
    excerpt: article.excerpt ?? null,
    site_name: article.siteName ?? null,
  };
}
