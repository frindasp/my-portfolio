// Shared types for portfolio app — matches Prisma schema
export interface Skill {
  id: string
  name: string
}

export interface ExperienceImage {
  id: string
  url: string
  fileId: string
  caption?: string | null
  order: number
  experienceId: string
  createdAt: string
}

export interface Experience {
  id: string
  company: string
  role: string
  type: string
  startDate: string
  endDate?: string | null
  location: string
  description: string[]
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  ExperienceImage: ExperienceImage[]
  Skill: Skill[]
}

export interface PortfolioExperience {
  id: string
  company: string
  role: string
  type?: string
  startDate?: string
  endDate?: string | null
  location?: string
  Skill?: Skill[]
}

export interface Portfolio {
  id: string
  title: string
  description?: string | null
  images: string[]   // array of image URLs
  tags: string[]
  experienceId?: string | null
  order: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
  Experience?: PortfolioExperience | null
}

export interface AboutData {
  about: {
    id: string
    location: string
    email: string
    content: string
  } | null
  experiences: Experience[]
}
