import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reservationSchema = z.object({
  resourceId: z.string().min(1, "Resource is required."),
  userName: z.string().min(2, "Name is required."),
  email: z.string().email("Please use a valid email."),
  title: z.string().min(3, "Booking title is required."),
  note: z.string().optional().or(z.literal("")),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { startAt: "asc" },
    include: { resource: true },
    where: { status: { not: "CANCELLED" } },
  });

  return Response.json(reservations);
}

export async function POST(request: Request) {
  const body = await request.json();
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

  const reservation = await prisma.reservation.create({
    data: {
      resourceId,
      userName: parsed.data.userName,
      email: parsed.data.email,
      title: parsed.data.title,
      note: parsed.data.note || null,
      startAt,
      endAt,
      status: "CONFIRMED",
    },
    include: { resource: true },
  });

  return Response.json(reservation, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const reservationId = z.string().min(1).safeParse(body?.id);

  if (!reservationId.success) {
    return Response.json({ error: "A valid reservation ID is required." }, { status: 400 });
  }

  const reservation = await prisma.reservation.update({
    where: { id: reservationId.data },
    data: { status: "CANCELLED" },
    include: { resource: true },
  });

  return Response.json({ message: "Reservation cancelled.", reservation });
}
