import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const [about, experiences] = await Promise.all([
      prisma.about.findFirst(),
      prisma.experience.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          skills: { orderBy: { name: "asc" } },
          images: { orderBy: { order: "asc" } },
          portfolios: {
            where: { isPublished: true },
            include: {
              images: { orderBy: { order: "asc" } },
              tags: true,
            },
          },
        },
      }),
    ])
    return NextResponse.json({ about, experiences })
  } catch (error) {
    console.error("Failed to fetch about data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
