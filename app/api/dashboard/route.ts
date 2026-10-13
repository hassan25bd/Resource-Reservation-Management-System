import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [totalResources, activeResources, totalReservations, todayReservations, busyReservations] =
    await Promise.all([
      prisma.resource.count(),
      prisma.resource.count({ where: { isActive: true } }),
      prisma.reservation.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.reservation.count({
        where: {
          status: { not: "CANCELLED" },
          startAt: { lte: endOfDay },
          endAt: { gte: startOfDay },
        },
      }),
      prisma.reservation.findMany({
        where: {
          status: { not: "CANCELLED" },
          startAt: { lte: now },
          endAt: { gt: now },
          resource: { isActive: true },
        },
        select: { resourceId: true },
      }),
    ]);
  const busyResourceIds = [...new Set(busyReservations.map(({ resourceId }) => resourceId))];

  return Response.json({
    stats: {
      totalResources,
      activeResources,
      totalReservations,
      todayReservations,
      busyResources: busyResourceIds.length,
      availableResources: Math.max(activeResources - busyResourceIds.length, 0),
    },
    busyResourceIds,
  });
}
