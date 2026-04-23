import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            id: true,
            company: true,
            role: true,
            type: true,
            startDate: true,
            endDate: true,
            location: true,
            skills: { select: { id: true, name: true } },
          },
        },
        images: {
          orderBy: { order: "asc" },
        },
        tags: true,
      },
    })
    if (!portfolio || !portfolio.isPublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(portfolio)
  } catch (error) {
    console.error("Failed to fetch portfolio:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
