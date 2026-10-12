const sampleResources = [
  {
    name: "Boardroom Alpha",
    category: "Meeting Room",
    location: "Floor 2",
    capacity: 12,
    description: "Executive meeting space with 4K display",
  },
  {
    name: "Projector Kit",
    category: "Equipment",
    location: "IT Room",
    capacity: 1,
    description: "Portable projector and screen",
  },
  {
    name: "Innovation Hub",
    category: "Workspace",
    location: "Floor 4",
    capacity: 8,
    description: "Flexible collaboration and workshop space",
  },
];

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    for (const resource of sampleResources) {
      const existingResource = await prisma.resource.findFirst({
        where: { name: resource.name, category: resource.category },
        select: { id: true },
      });

      if (!existingResource) {
        await prisma.resource.create({ data: resource });
      }
    }

    console.log(`Sample resource catalog ready (${sampleResources.length} standard resources).`);
  } catch (error) {
    console.error("Failed to seed sample resources:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
