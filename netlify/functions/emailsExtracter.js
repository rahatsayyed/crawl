const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const { google } = require("googleapis");

// Initialize Google Sheets API client
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

exports.handler = async function (event, context) {
  try {
    // call sub URLS
    // loop over sub URLS
    // call https://yourgpt.ai/api/extractWebpageText for suburl and extract emails and contact and store in set
    // return the set as array (store in Sheets)

    // Parse the incoming request body
    const { urltoFetch, spreadsheetId, sheetName } = JSON.parse(event.body);

    if (!urltoFetch || !spreadsheetId || !sheetName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "urltoFetch, spreadsheetId, and sheetName are required",
        }),
      };
    }

    // Generate a unique task ID
    const taskId = uuidv4();

    // Define the payload
    const payload = {
      url: urltoFetch,
      options: {
        format: "text",
        textOnly: false,
        ignoreLinks: false,
        includeElements: "",
        excludeElements: "",
      },
    };
    //#region utils
    async function findTaskRowIndex(sheets, spreadsheetId, sheetName, taskId) {
      const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!J:J`,
      });

      const rows = sheetData.data.values || [];
      const rowIndex =
        rows.findIndex((row, index) => row[0] === taskId && index >= 1) + 1;

      if (rowIndex === 0) {
        console.error("Task ID not found in sheet");
        return null;
      }

      return rowIndex;
    }
    //#endregion
    // Perform the POST request in the background
    (async () => {
      try {
        const response = await fetch(
          "https://yourgpt.ai/api/extractWebpageText",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        // Find the row where taskId matches in column J
        const rowIndex = await findTaskRowIndex(
          sheets,
          spreadsheetId,
          sheetName,
          taskId
        );
        if (!rowIndex) return;

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!C${rowIndex}:D${rowIndex}`,
          valueInputOption: "RAW",
          resource: {
            values: [["column c updated", JSON.stringify(data).slice(0, 20)]], // D: Result, I: null, J: Task ID
          },
        });
      } catch (error) {
        console.error("Error fetching URL:", error.message);

        // Find the row where taskId matches in column J
        const rowIndex = await findTaskRowIndex(
          sheets,
          spreadsheetId,
          sheetName,
          taskId
        );
        if (!rowIndex) return;

        // Update column I (Error) for failure
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!I${rowIndex}`, // Update D to J
          valueInputOption: "RAW",
          resource: {
            values: [[error.message]], // D: null, I: Error, J: Task ID
          },
        });
      }
    })();

    // Return task ID immediately
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
