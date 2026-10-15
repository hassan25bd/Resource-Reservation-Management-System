import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid registration data." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(parsed.data.password, salt);

  let user;
  try {
    user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash, passwordSalt: salt },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw error;
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({ user }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}
