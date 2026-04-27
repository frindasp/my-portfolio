import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const experience = await prisma.experience.findUnique({
      where: { id, isActive: true },
      include: {
        skills: { orderBy: { name: "asc" } },
        images: { orderBy: { order: "asc" } },
        portfolios: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          include: {
            images: { orderBy: { order: "asc" } },
            tags: true,
          },
        },
      },
    })
    if (!experience) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(experience)
  } catch (error) {
    console.error("Failed to fetch experience:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
