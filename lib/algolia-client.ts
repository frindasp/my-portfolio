import { algoliasearch } from "algoliasearch"
import aa from "search-insights"

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || ""
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY || ""

export const searchClient = algoliasearch(appId, searchKey)

if (typeof window !== "undefined") {
  aa("init", {
    appId: appId,
    apiKey: searchKey,
    useCookie: true
  })
}

export { aa }
