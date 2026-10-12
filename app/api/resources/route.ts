import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resourceSchema = z.object({
  name: z.string().min(2, "Resource name is required."),
  category: z.string().min(2, "Category is required."),
  location: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

const updateResourceSchema = resourceSchema.extend({
  id: z.string().min(1, "Resource ID is required."),
});

export async function GET() {
  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Response.json(resources);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resourceSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  const resource = await prisma.resource.create({
    data: {
      name: payload.name,
      category: payload.category,
      location: payload.location || null,
      capacity: payload.capacity,
      description: payload.description || null,
      isActive: payload.isActive,
    },
  });

  return Response.json(resource, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = updateResourceSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id, ...payload } = parsed.data;
  const existingResource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingResource) {
    return Response.json({ error: "Resource not found." }, { status: 404 });
  }

  const resource = await prisma.resource.update({
    where: { id },
    data: {
      name: payload.name,
      category: payload.category,
      location: payload.location || null,
      capacity: payload.capacity,
      description: payload.description || null,
      isActive: payload.isActive,
    },
  });

  return Response.json(resource);
}
