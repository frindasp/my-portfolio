import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projects = [
  {
    title: "Interior Design Portfolio",
    url: "https://www.behance.net/gallery/237408587/Interior-Design-Portfolio",
    description: "The newest one is up! Interior Design Portofolio of Taufania Frinda Sumino Putri",
    tools: "Enscape, Photoshop, V-Ray, SketchUp",
    tags: ["Interior Design", "Architecture"]
  },
  {
    title: "Westown View Apartment Studio",
    url: "https://www.behance.net/gallery/237173089/Westown-View-Apartment-Studio",
    description: "Interior design project for Westown View Apartment Studio units.",
    tools: "Photoshop, SketchUp, V-Ray",
    tags: ["Interior Design", "3D Rendering"]
  },
  {
    title: "Warm Contemporary Modern",
    url: "https://www.behance.net/gallery/224458197/Warm-Contemporary-Modern",
    description: "Bringing timeless elegance and warmth to a modern-contemporary apartment in Surabaya.",
    tools: "Photoshop, SketchUp, V-Ray",
    tags: ["Residential Design", "Interior Design"]
  },
  {
    title: "Modern Minimalist Living Space",
    url: "https://www.behance.net/gallery/215725183/Modern-Minimalist-Living-Space",
    description: "A design project focused on creating a clean, modern, and minimalist living environment.",
    tools: "Photoshop, SketchUp, V-Ray",
    tags: ["Minimalism", "Interior Design"]
  }
];

async function main() {
  console.log("Start seeding Behance data...");

  for (const project of projects) {
    // 1. Check if project already exists by behanceUrl
    const existing = await prisma.portfolio.findFirst({
      where: { behanceUrl: project.url }
    });

    if (existing) {
      console.log(`Project "${project.title}" already exists, skipping...`);
      continue;
    }

    // 2. Handle Tags
    const tagConnectOrCreate = project.tags.map(tagName => ({
      where: { name: tagName },
      create: { name: tagName }
    }));

    // 3. Create Portfolio
    const newPortfolio = await prisma.portfolio.create({
      data: {
        title: project.title,
        description: project.description,
        behanceUrl: project.url,
        tools: project.tools,
        isPublished: true,
        tags: {
          connectOrCreate: tagConnectOrCreate
        }
      }
    });

    console.log(`Created project: ${newPortfolio.title} (ID: ${newPortfolio.id})`);
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
