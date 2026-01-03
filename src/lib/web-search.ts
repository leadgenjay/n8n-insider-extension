/**
 * Web Search Service
 * Provides web search capabilities using Tavily API
 * Used for looking up API documentation when troubleshooting
 */

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

export interface TavilyResponse {
  results: Array<{
    title: string
    url: string
    content: string
    score: number
  }>
}

/**
 * Search the web using Tavily API
 * Optimized for finding API documentation
 */
export async function searchWeb(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  if (!apiKey) {
    throw new Error('Tavily API key not configured')
  }

  console.log('[web-search] Searching for:', query)

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
        include_domains: [], // Could filter to doc sites if needed
        exclude_domains: [],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[web-search] Tavily API error:', response.status, error)
      throw new Error(`Search failed: ${response.status}`)
    }

    const data: TavilyResponse = await response.json()
    console.log('[web-search] Found', data.results?.length || 0, 'results')

    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }))
  } catch (error) {
    console.error('[web-search] Search error:', error)
    throw error
  }
}

/**
 * Fetch and extract text content from a URL
 * Used when user provides a direct link to documentation
 */
export async function fetchUrl(url: string): Promise<string> {
  console.log('[web-search] Fetching URL:', url)

  // Validate URL format and protocol (SSRF protection)
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('Invalid URL format')
  }

  // Only allow HTTPS/HTTP
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs are allowed')
  }

  // Block localhost and private IP ranges
  const hostname = parsedUrl.hostname.toLowerCase()
  const blockedPatterns = [
    /^localhost$/,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./, // AWS metadata endpoint
    /^0\./,
    /^\[::1\]$/,
    /^\[fe80:/i,
  ]

  if (blockedPatterns.some(pattern => pattern.test(hostname))) {
    throw new Error('Access to internal/private URLs is not allowed')
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; N8NInsider/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()

    // Extract text content from HTML
    const text = extractTextFromHtml(html)

    // Limit content length to avoid overwhelming the AI
    const maxLength = 8000
    if (text.length > maxLength) {
      return text.slice(0, maxLength) + '\n\n[Content truncated...]'
    }

    return text
  } catch (error) {
    console.error('[web-search] Fetch error:', error)
    throw error
  }
}

/**
 * Extract readable text from HTML
 * Removes scripts, styles, and HTML tags
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')

  // Remove HTML tags but preserve some structure
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  return text
}

/**
 * Test if Tavily API key is valid
 */
export async function testTavilyConnection(apiKey: string): Promise<boolean> {
  if (!apiKey) return false

  try {
    await searchWeb('test query', apiKey)
    return true
  } catch {
    return false
  }
}
