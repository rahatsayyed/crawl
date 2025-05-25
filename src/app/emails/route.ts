import { NextRequest, NextResponse } from "next/server";
const isDev = process.env.NODE_ENV === "development";
const baseUrl = isDev
  ? "http://localhost:8888"
  : process.env.NEXT_PUBLIC_SITE_URL;
const NETLIFY_FUNCTIONS_URL = `${baseUrl}/.netlify/functions`;
export async function POST(request: NextRequest) {
  try {
    // Extract URL from the request body
    const body = await request.json();
    const { url, spreadsheetId, sheetName } = body;
    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Call the Netlify Background Function
    const netlifyResponse = await fetch(`${NETLIFY_FUNCTIONS_URL}/emails2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urltoFetch: url, spreadsheetId, sheetName }),
    });

    const data = await netlifyResponse.json();

    if (!netlifyResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to initiate task" },
        { status: netlifyResponse.status }
      );
    }

    return NextResponse.json({ taskId: data.taskId }, { status: 202 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get taskId from query parameters
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId parameter is required" },
        { status: 400 }
      );
    }

    // Call the Netlify get-task-result function
    const netlifyResponse = await fetch(
      `${NETLIFY_FUNCTIONS_URL}/emails?taskId=${taskId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const data = await netlifyResponse.json();
    console.log("Netlify Response:", data);

    if (!netlifyResponse.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch task result" },
        { status: netlifyResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
