import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

function resolveMockCoachingPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "..", "..", "mock_coaching_data.json"),
    path.join(process.cwd(), "mock_coaching_data.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

export async function GET() {
  const mockPath = resolveMockCoachingPath();
  if (!mockPath) {
    return NextResponse.json(
      { error: "mock_coaching_data.json not found next to the repo root" },
      { status: 404 },
    );
  }
  try {
    const raw = await readFile(mockPath, "utf-8");
    return new NextResponse(raw, {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "failed to read mock file" }, { status: 500 });
  }
}
