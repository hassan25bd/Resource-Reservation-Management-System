import { prisma } from "@/lib/prisma";
import { z } from "zod";

const availabilitySchema = z.object({
  resourceId: z.string().min(1),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId") ?? "";
  const startAt = searchParams.get("startAt");
  const endAt = searchParams.get("endAt");

  if (!resourceId || !startAt || !endAt) {
    return Response.json({ available: false, message: "Missing reservation data." }, { status: 400 });
  }

  const parsed = availabilitySchema.safeParse({
    resourceId,
    startAt,
    endAt,
  });

  if (!parsed.success) {
    return Response.json({ available: false, message: "Invalid reservation range." }, { status: 400 });
  }

  const { startAt: start, endAt: end } = parsed.data;

  if (start >= end) {
    return Response.json({ available: false, message: "End time must be later than start time." }, { status: 400 });
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { isActive: true },
  });

  if (!resource) {
    return Response.json({ available: false, message: "Resource not found." }, { status: 404 });
  }

  if (!resource.isActive) {
    return Response.json({ available: false, message: "This resource is currently inactive." }, { status: 409 });
  }

  const conflictingReservation = await prisma.reservation.findFirst({
    where: {
      resourceId,
      status: { not: "CANCELLED" },
      AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
    },
    include: { resource: true },
  });

  if (conflictingReservation) {
    return Response.json({
      available: false,
      message: `This resource is already booked from ${new Date(conflictingReservation.startAt).toLocaleString()} to ${new Date(conflictingReservation.endAt).toLocaleString()}.`,
    });
  }

  return Response.json({ available: true, message: "Resource available for this slot." });
}
