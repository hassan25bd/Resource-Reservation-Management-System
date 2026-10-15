import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, hashSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  const response = NextResponse.json({ message: "Signed out." });
  clearSessionCookie(response);
  return response;
}
