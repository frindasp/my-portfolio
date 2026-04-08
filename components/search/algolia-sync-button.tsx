"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { syncToAlgolia } from "@/app/actions/algolia-sync"
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function AlgoliaSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await syncToAlgolia()
      if (result.success) {
        toast.success(`Successfully synced ${result.count} records to Algolia`)
      } else {
        toast.error(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      toast.error("An unexpected error occurred during sync")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      className="w-full h-11 sm:h-12 rounded-2xl font-bold border-primary/20 hover:bg-primary/5 transition-all gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing to Algolia..." : "Sync Search Index"}
    </Button>
  )
}
