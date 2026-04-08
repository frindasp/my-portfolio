import { Metadata } from "next"
import { PortfolioDetail } from "@/components/portfolio/portfolio-detail"

export const metadata: Metadata = {
  title: "Portfolio Project",
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PortfolioDetail id={id} />
}
