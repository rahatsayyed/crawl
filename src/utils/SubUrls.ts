import { MAXDEPTH, MAXPAGESPERPREFIX } from "@/constants/constant";
import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import https from "https";
// Utility functions
const shouldIgnore = (url: string, IGNOREKEYWORDS: string[]): boolean => {
  return IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
};

const getPathDepth = (pathname: string): number => {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
};

// Extract subpages
export const getSubURLs = async (
  mainUrl: string,
  IGNOREKEYWORDS: string[]
): Promise<string[]> => {
  try {
    const response = await axios.get(mainUrl, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Bypass SSL verification
      }),
    });
    const $: cheerio.CheerioAPI = cheerio.load(response.data);
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
          shouldIgnore(fullHref, IGNOREKEYWORDS)
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
    subpages.add(mainUrl);
    console.log(`Subpages found: ${subpages.size}`);
    return Array.from(subpages);
  } catch (error: any) {
    console.error(`Error fetching subURLs: ${error.message}`);
    throw new Error(`Error fetching subURLs: ${error.message}`);
  }
};
