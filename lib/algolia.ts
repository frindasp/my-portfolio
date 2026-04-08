import { algoliasearch } from "algoliasearch"

const appId = process.env.ALGOLIA_APP_ID || ""
const apiKey = process.env.ALGOLIA_ADMIN_API_KEY || ""

export const algoliaClient = algoliasearch(appId, apiKey)
