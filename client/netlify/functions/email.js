import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export async function handler(event, context) {
  try {
    // Parse request body to get the URL
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url || typeof url !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid "url" field' }),
      };
    }

    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:
        process.env.CHROME_EXECUTABLE_PATH ||
        (await chromium.executablePath(
          "/var/task/node_modules/@sparticuz/chromium/bin"
        )),
    });

    // Open a new page
    const page = await browser.newPage();

    // Navigate to the provided URL
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract email addresses from page content
    const emails = await page.evaluate(() => {
      const textContent = document.body.innerText;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = textContent.match(emailRegex) || [];
      return [...new Set(matches)]; // Return unique emails
    });

    // Close the browser
    await browser.close();

    // Return the extracted emails
    return {
      statusCode: 200,
      body: JSON.stringify({ emails }),
    };
  } catch (error) {
    console.error("Puppeteer Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
}
