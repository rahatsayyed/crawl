const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");

// Mock storage for task results (replace with a real database in production)
const taskStore = new Map();

exports.handler = async function (event, context) {
  try {
    // Parse the incoming request body
    const { urltoFetch } = JSON.parse(event.body);

    if (!urltoFetch) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "URL parameter is required" }),
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

    // Store initial task status
    taskStore.set(taskId, { status: "pending", result: null, error: null });

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
        taskStore.set(taskId, {
          status: "completed",
          result: data,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching URL:", error).message;
        taskStore.set(taskId, {
          status: "failed",
          result: null,
          error: error.message,
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
