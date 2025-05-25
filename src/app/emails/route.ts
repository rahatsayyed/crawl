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
    const netlifyResponse = await fetch(`${NETLIFY_FUNCTIONS_URL}/emails`, {
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

export async function GET() {
  return NextResponse.json("up and running");
}
