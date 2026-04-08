"use client"

import { useState, useEffect, useRef } from "react"
import { Search as SearchIcon, X, Tag, Briefcase, FileText, Loader2, ArrowRight } from "lucide-react"
import { searchClient } from "@/lib/algolia-client"
import Link from "next/link"
import { useClickAway } from "react-use"

const INDEX_NAME = "portfolio_search"

export function AlgoliaSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useClickAway(containerRef, () => {
    setIsOpen(false)
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const { results } = await searchClient.search({
          requests: [
            {
              indexName: INDEX_NAME,
              query: query,
              hitsPerPage: 8,
            },
          ],
        })
        setResults((results[0] as any).hits)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-full bg-muted/50 hover:bg-muted hover:text-foreground transition-all duration-200"
      >
        <SearchIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-center pt-[15vh] px-4">
          <div 
            ref={containerRef}
            className="w-full max-w-xl bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
          >
            <div className="p-4 border-b flex items-center gap-3">
              <SearchIcon className="w-5 h-5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, tags, or experience..."
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground"
              />
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[60vh]">
              {isLoading && (
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Searching Algolia...</p>
                </div>
              )}

              {!isLoading && query && results.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Search Results
                  </div>
                  {results.map((hit) => (
                    <Link
                      key={hit.objectID}
                      href={hit.url}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        {hit.type === "portfolio" ? (
                          <Briefcase className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">{hit.title}</h4>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">
                            {hit.type}
                          </span>
                        </div>
                        {hit.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {hit.description}
                          </p>
                        )}
                        {hit.tags && hit.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {hit.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                                <Tag className="w-2 h-2" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground self-center opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}

              {!query && (
                <div className="p-8 text-center text-muted-foreground">
                  <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Search by title, description, tags, company or role...</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {["React", "Interior", "Design", "Product"].map(t => (
                      <button 
                        key={t}
                        onClick={() => setQuery(t)}
                        className="text-[10px] bg-muted px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="border bg-background px-1 rounded">esc</kbd> close
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="border bg-background px-1 rounded">↵</kbd> select
                </span>
              </div>
              <div className="font-semibold italic">Search powered by Algolia</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
