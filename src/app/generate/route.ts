// not using this
// passes webpage data as prompt
import { NextRequest, NextResponse } from "next/server";
import { coverLetter } from ".";
import { data } from "./data";

export async function GET() {
  return NextResponse.json("UP and RUNNING");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (!body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const result = await coverLetter(body);
    console.log("result", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("API Error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
