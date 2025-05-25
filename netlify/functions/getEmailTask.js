// Mock storage (same as in background function; in production, use a shared database)
const taskStore = new Map();

exports.handler = async function (event, context) {
  try {
    // Get taskId from query parameters
    const taskId = event.queryStringParameters.taskId;

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "taskId parameter is required" }),
      };
    }

    const task = taskStore.get(taskId);

    if (!task) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Task not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(task),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch task result",
        details: error.message,
      }),
    };
  }
};
