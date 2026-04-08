import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: {
        Experience: {
          select: { id: true, company: true, role: true },
        },
        PortfolioImage: {
          orderBy: { order: "asc" },
        },
        Tag: true,
      },
    })
    return NextResponse.json(portfolios)
  } catch (error) {
    console.error("Failed to fetch portfolios:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
