import * as cheerio from "cheerio";
import { URL } from "url";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";
import { IGNOREKEYWORDS, MAXDEPTH, MAXPAGESPERPREFIX } from "./constant";

// Utility
const shouldIgnore = (url: string): boolean => {
  return IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
};

const getPathDepth = (pathname: string): number => {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
};

// Main Function
export const getSubURLs = async (mainUrl: string): Promise<string[]> => {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Optimize performance
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
        // Ignore malformed URLs
      }
    });

    return Array.from(subpages);
  } catch (err) {
    console.error(
      "Error fetching subURLs:",
      err instanceof Error ? err.message : err
    );
    return [];
  } finally {
    if (browser) await browser.close();
  }
};
