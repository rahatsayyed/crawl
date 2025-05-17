import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { URL } from "url";
import { IGNOREKEYWORDS, MAXDEPTH, MAXPAGESPERPREFIX } from "./constant";

// Utility functions
const shouldIgnore = (url: string): boolean => {
  return IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
};

const getPathDepth = (pathname: string): number => {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
};

export const getSubURLs = async (mainUrl: string): Promise<string[]> => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // Recommended for Puppeteer 20+
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Intercept requests to skip loading unnecessary resources
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(mainUrl, { waitUntil: "networkidle2", timeout: 30000 });

    const html = await page.content();
    const $: cheerio.CheerioAPI = cheerio.load(html);

    const subpages = new Set<string>();
    const prefixCounter: Record<string, number> = {};

    let prioritySections: cheerio.Cheerio<any> = $(
      "header, nav, footer, main, section"
    );
    if (prioritySections.find("a").length === 0) prioritySections = $.root();

    prioritySections.find("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const fullUrl = new URL(href, mainUrl);
        const fullHref = fullUrl.href;

        if (
          fullUrl.hostname !== new URL(mainUrl).hostname ||
          shouldIgnore(fullHref)
        )
          return;

        const pathname = fullUrl.pathname;
        const depth = getPathDepth(pathname);
        if (depth > MAXDEPTH) return;

        const prefix = pathname.split("/")[1] || "";
        prefixCounter[prefix] = (prefixCounter[prefix] || 0) + 1;
        if (prefixCounter[prefix] > MAXPAGESPERPREFIX) return;

        subpages.add(fullHref);
      } catch {
        // Skip invalid URLs
      }
    });

    return Array.from(subpages);
  } catch (err) {
    console.error(
      "Error fetching subURLs with Puppeteer:",
      err instanceof Error ? err.message : err
    );
    return [];
  } finally {
    if (browser) await browser.close();
  }
};
