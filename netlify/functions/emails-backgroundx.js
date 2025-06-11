const fetch = require("node-fetch");
const { google } = require("googleapis");

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
  (text.match(emailRegex) || []).forEach((email) => emails.add(email.trim()));
  (text.match(phoneRegex) || [])
    .map((phone) => phone.trim())
    .filter((num) => num.replace(/\D/g, "").length >= 8)
    .forEach((phone) => phones.add(phone));

  return { emails: [...emails], phones: [...phones] };
};

exports.handler = async function (event, context) {
  console.log("Running emails function");
  const { urlstoFetch, spreadsheetId, sheetName, taskId } = JSON.parse(
    event.body
  );
  try {
    if (
      !Array.isArray(urlstoFetch) ||
      !spreadsheetId ||
      !sheetName ||
      !taskId ||
      urlstoFetch.length === 0
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "urlstoFetch (array), spreadsheetId, sheetName, and taskId are required",
        }),
      };
    }

    const emails = new Set();
    const phones = new Set();
    const errors = [];

    // Append taskId to column J
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!J:J`,
      valueInputOption: "RAW",
      resource: { values: [[taskId]] },
    });

    for (const url of urlstoFetch) {
      try {
        console.log(`Fetching URL: ${url}`);
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

    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!J:J`,
    });
    const rows = sheetData.data.values || [];
    const rowIndex =
      rows.findIndex((row, index) => row[0] === taskId && index >= 1) + 1;

    if (rowIndex === 0) {
      console.error("Task ID not found in sheet");
      throw new Error("Task ID not found in sheet");
    }

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        taskId,
        emails: [...emails],
        phones: [...phones],
        errors,
      }),
    };
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
      return "Task ID not found in sheet";
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!I${rowIndex}`,
      valueInputOption: "RAW",
      resource: {
        values: [[error.message]],
      },
    });
    return error.message;
  }
};
