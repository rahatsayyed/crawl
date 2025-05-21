import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    // Parse request body to get the URL
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 }
      );
    }

    // Forward request to Netlify function
    const netlifyFunctionUrl = "/.netlify/functions/emails";
    const response = await axios.post(
      netlifyFunctionUrl,
      { url },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // Return the Netlify function's response
    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error("Error calling Netlify function:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
