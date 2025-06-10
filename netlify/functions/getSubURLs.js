// netlify/functions/extract-suburls.ts
import { Handler } from "@netlify/functions";
import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import https from "https";

const MAXDEPTH = 3;
const MAXPAGESPERPREFIX = 5;

const shouldIgnore = (url, IGNOREKEYWORDS) =>
  IGNOREKEYWORDS.some((keyword) => url.toLowerCase().includes(keyword));

const getPathDepth = (pathname) =>
  pathname.replace(/\/$/, "").split("/").filter(Boolean).length;

const getSubURLs = async (mainUrl, IGNOREKEYWORDS) => {
  const response = await axios.get(mainUrl, {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  const $ = cheerio.load(response.data);
  const subpages = new Set();
  const prefixCounter = {};

  let prioritySections = $("header, nav, footer, main, section");
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
      // Skip bad URLs
    }
  });

  subpages.add(mainUrl);
  return Array.from(subpages);
};

const handler = async (event) => {
  try {
    const { url, ignoreKeywords } = JSON.parse(event.body || "{}");
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing URL" }),
      };
    }

    const data = await getSubURLs(url, ignoreKeywords || []);
    return {
      statusCode: 200,
      body: JSON.stringify({ urls: data }),
    };
  } catch (error) {
    console.error(error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
