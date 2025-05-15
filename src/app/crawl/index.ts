import axios from "axios";
// import cheerio from "cheerio";
import * as cheerio from "cheerio";
import { URL } from "url";
import { ContactData, CrawlResult, PageData } from "./types";
import { IGNOREKEYWORDS, MAXDEPTH, MAXPAGESPERPREFIX } from "./constant";

// Utility functions
const shouldIgnore = (url: string): boolean => {
  return IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));
};

const getPathDepth = (pathname: string): number => {
  return pathname.replace(/\/$/, "").split("/").filter(Boolean).length;
};

// Extract subpages
const getSubURLs = async (mainUrl: string): Promise<string[]> => {
  try {
    const response = await axios.get(mainUrl);
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
      "Error fetching subURLs:",
      err instanceof Error ? err.message : err
    );
    return [];
  }
};

// Extract emails and phones
const extractEmailsAndPhones = (text: string): ContactData => {
  const emails: string[] = [];
  const phones: string[] = [];

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailMatches = text.match(emailRegex);
  if (emailMatches) {
    emails.push(...new Set(emailMatches));
  }

  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?(\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})/g;
  const phoneMatches = text.match(phoneRegex);
  if (phoneMatches) {
    phones.push(
      ...new Set(
        phoneMatches
          .map((p) => p.trim())
          .filter((num) => num.replace(/\D/g, "").length >= 8)
      )
    );
  }

  return { emails, phones };
};

// Extract main text
const extractMainTextFromPage = async (url: string): Promise<PageData> => {
  try {
    const { data } = await axios.get(url);
    const $: cheerio.CheerioAPI = cheerio.load(data);
    $("script, style").remove();
    const text = $("body").text();
    const cleanText = text.replace(/\s+/g, " ").trim();
    const { emails, phones } = extractEmailsAndPhones(cleanText);

    return {
      url,
      text: cleanText,
      emails,
      phones,
    };
  } catch (err) {
    console.error(
      `Failed to fetch or parse ${url}:`,
      err instanceof Error ? err.message : err
    );
    return { url, text: "", emails: [], phones: [] };
  }
};

// Main crawl function
export const crawlWebsite = async (mainUrl: string): Promise<CrawlResult> => {
  try {
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const data: Record<string, string> = {};

    const pages = await getSubURLs(mainUrl);
    const contentPromises = pages.map(
      async (pageUrl) => await extractMainTextFromPage(pageUrl)
    );

    const results = await Promise.all(contentPromises);

    results.forEach(({ url: pageUrl, text, emails, phones }) => {
      data[pageUrl] = text;
      emails.forEach((email) => emailSet.add(email));
      phones.forEach((phone) => phoneSet.add(phone));
    });

    return {
      emails: Array.from(emailSet).join(", "),
      phones: `'${Array.from(phoneSet).join(", ")}`,
      pages: data,
    };
  } catch (err) {
    console.error("Crawl Error:", err instanceof Error ? err.message : err);
    throw new Error("Failed to crawl website");
  }
};
