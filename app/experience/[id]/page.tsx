import { Metadata } from "next"
import { ExperienceDetail } from "@/components/experience/experience-detail"

export const metadata: Metadata = {
  title: "Experience Detail",
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ExperienceDetail id={id} />
}
