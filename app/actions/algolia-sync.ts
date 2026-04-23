"use server"

import { PrismaClient } from "@prisma/client"
import { algoliaClient } from "@/lib/algolia"

const prisma = new PrismaClient()
const INDEX_NAME = "portfolio_search"

export async function syncToAlgolia() {
  try {
    // 1. Fetch Porfolios with their Tags and Experience
    const portfolios = await prisma.portfolio.findMany({
      include: {
        tags: true,
        experience: true,
        images: {
          where: { isLogo: true },
          take: 1
        }
      }
    })

    // 2. Fetch Experiences separately (if they want to search experiences directly too)
    const experiences = await prisma.experience.findMany({
      include: {
        skills: true
      }
    })

    const records: any[] = []

    // Map Portfolios to Algolia records
    portfolios.forEach(p => {
      records.push({
        objectID: `portfolio-${p.id}`,
        id: p.id,
        type: "portfolio",
        title: p.title,
        description: p.description,
        tags: p.tags.map(t => t.name),
        company: p.experience?.company || "",
        role: p.experience?.role || "",
        image: p.images[0]?.url || "",
        url: `/portfolio/${p.id}`
      })
    })

    // Map Experiences to Algolia records
    experiences.forEach(e => {
      records.push({
        objectID: `experience-${e.id}`,
        id: e.id,
        type: "experience",
        title: `${e.role} at ${e.company}`,
        description: Array.isArray(e.description) ? e.description.join(" ") : "",
        tags: e.skills.map(s => s.name),
        company: e.company,
        role: e.role,
        url: `/about` // Or /experience/${e.id} if you have that page
      })
    })

    // 3. Save to Algolia
    // Use saveObjects (plural) for batch update
    await algoliaClient.saveObjects({
      indexName: INDEX_NAME,
      objects: records
    })

    return { success: true, count: records.length }
  } catch (error) {
    console.error("Algolia sync error:", error)
    return { success: false, error: String(error) }
  }
}
