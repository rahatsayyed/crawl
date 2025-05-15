import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "up and running" });
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json("not implemented yet");
  } catch (err) {
    console.error("API Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
