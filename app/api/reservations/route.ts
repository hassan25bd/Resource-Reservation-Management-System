import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const reservationSchema = z.object({
  resourceId: z.string().min(1, "Resource is required."),
  title: z.string().min(3, "Booking title is required."),
  note: z.string().optional().or(z.literal("")),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to view your bookings." }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    orderBy: { startAt: "asc" },
    include: { resource: true },
    where: {
      userId: user.id,
      status: { not: "CANCELLED" },
      endAt: { gte: new Date() },
    },
  });

  return Response.json(reservations);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to create a booking." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const parsed = reservationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { resourceId, startAt, endAt } = parsed.data;

  if (startAt >= endAt) {
    return Response.json({ error: "End time must be after the start time." }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { isActive: true },
  });

  if (!resource) {
    return Response.json({ error: "Resource not found." }, { status: 404 });
  }

  if (!resource.isActive) {
    return Response.json({ error: "This resource is currently inactive." }, { status: 409 });
  }

  const conflictingReservation = await prisma.reservation.findFirst({
    where: {
      resourceId,
      status: { not: "CANCELLED" },
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
  });

  if (conflictingReservation) {
    return Response.json(
      {
        error:
          "This slot overlaps with an existing booking. Please choose a different time.",
      },
      { status: 409 },
    );
  }

  let reservation;
  try {
    reservation = await prisma.reservation.create({
      data: {
        resourceId,
        userId: user.id,
        userName: user.name,
        email: user.email,
        title: parsed.data.title,
        note: parsed.data.note || null,
        startAt,
        endAt,
        status: "CONFIRMED",
      },
      include: { resource: true },
    });
  } catch (error) {
    const isKnownConstraintViolation =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004";
    const isPostgresExclusionViolation =
      error instanceof Error && error.message.includes("23P01");

    if (isKnownConstraintViolation || isPostgresExclusionViolation) {
      return Response.json(
        { error: "This slot was just booked. Please choose another time." },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json(reservation, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to cancel a booking." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must contain valid JSON." }, { status: 400 });
  }
  const reservationId = z.object({ id: z.string().min(1) }).safeParse(body);

  if (!reservationId.success) {
    return Response.json({ error: "A valid reservation ID is required." }, { status: 400 });
  }

  let reservation;
  try {
    reservation = await prisma.reservation.update({
      where: { id: reservationId.data.id, userId: user.id },
      data: { status: "CANCELLED" },
      include: { resource: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return Response.json({ error: "Reservation not found." }, { status: 404 });
    }
    throw error;
  }

  return Response.json({ message: "Reservation cancelled.", reservation });
}
