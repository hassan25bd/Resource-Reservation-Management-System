import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [totalResources, activeResources, totalReservations, todayReservations] =
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
    ]);

  return Response.json({
    stats: {
      totalResources,
      activeResources,
      totalReservations,
      todayReservations,
    },
  });
}
