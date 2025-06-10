// uses `yourgpt.ai` to extract the data from the website

const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");

// Initialize Google Sheets API client
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const extractEmailsAndPhones = (data) => {
  const emails = new Set();
  const phones = new Set();

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const phoneRegex =
    /(\+\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

  const text = typeof data === "object" ? JSON.stringify(data) : data;

  const emailMatches = text.match(emailRegex) || [];
  emailMatches.forEach((email) => emails.add(email.trim()));

  const phoneMatches = text.match(phoneRegex) || [];
  phoneMatches
    .map((phone) => phone.trim())
    .filter((num) => num.replace(/\D/g, "").length >= 8)
    .forEach((phone) => phones.add(phone));

  return {
    emails: [...emails],
    phones: [...phones],
  };
};
exports.handler = async function (event, context) {
  try {
    const { urlstoFetch, spreadsheetId, sheetName } = JSON.parse(event.body);
    console.log("running emails function");
    if (
      !Array.isArray(urlstoFetch) ||
      !spreadsheetId ||
      !sheetName ||
      urlstoFetch.length === 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "urlstoFetch (array), spreadsheetId, and sheetName are required",
        }),
      };
    }

    const taskId = uuidv4();
    const emails = new Set();
    const phones = new Set();
    const errors = [];

    (async () => {
      try {
        // Loop over each URL
        for (const url of urlstoFetch) {
          try {
            const payload = {
              url,
              options: {
                format: "text",
                textOnly: true,
                ignoreLinks: false,
                includeElements: "",
                excludeElements: "",
              },
            };

            const response = await fetch(
              "https://yourgpt.ai/api/extractWebpageText",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
            if (!response.ok) {
              throw new Error(
                `HTTP error ${response.status}: ${response.statusText}`
              );
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              const text = await response.text();
              throw new Error(
                `Invalid content type: ${contentType}, response: ${text.slice(
                  0,
                  100
                )}`
              );
            }

            const data = await response.json();
            const { emails: extractedEmails, phones: extractedPhones } =
              extractEmailsAndPhones(data.content);

            extractedEmails.forEach((email) => emails.add(email));
            extractedPhones.forEach((phone) => phones.add(phone));
          } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            errors.push(`Error fetching ${url}: ${error.message}`);
          }
        }
        // Find the row where taskId matches in column J
        const sheetData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!J:J`,
        });

        const rows = sheetData.data.values || [];
        const rowIndex =
          rows.findIndex((row, index) => row[0] === taskId && index >= 1) + 1;
        if (rowIndex === 0) {
          console.error("Task ID not found in sheet");
          return;
        }

        // Update sheet with combined emails and phones
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!C${rowIndex}:I${rowIndex}`,
          valueInputOption: "RAW",
          resource: {
            values: [
              [
                [...phones].join(", "),
                [...emails].join(", "),
                ,
                ,
                ,
                ,
                errors.join("; ") || "No errors",
              ],
            ],
          },
        });
        // await sheets.spreadsheets.values.update({
        //   spreadsheetId,
        //   range: `${sheetName}!C${rowIndex}:D${rowIndex}`,
        //   valueInputOption: "RAW",
        //   resource: {
        //     values: [[[...phones].join(", "), [...emails].join(", ")]],
        //   },
        // });
      } catch (error) {
        console.error("Error processing URLs:", error.message);

        const sheetData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!J:J`,
        });

        const rows = sheetData.data.values || [];
        const rowIndex =
          rows.findIndex((row, index) => row[0] === taskId && index >= 1) + 1;

        if (rowIndex === 0) {
          console.error("Task ID not found in sheet");
          return;
        }

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!I${rowIndex}`,
          valueInputOption: "RAW",
          resource: {
            values: [[error.message]],
          },
        });
      }
    })();

    return {
      statusCode: 202,
      body: JSON.stringify({ taskId }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to initiate task",
        details: error.message,
      }),
    };
  }
};
