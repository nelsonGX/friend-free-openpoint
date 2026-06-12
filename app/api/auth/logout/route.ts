import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
