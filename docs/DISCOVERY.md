# Search and assistant discovery

Public indexing was explicitly enabled on September 6, 2026 for [quiefx.dev](https://quiefx.dev). Production serves crawlable static HTML with unique titles, descriptions and canonical URLs for `/` and `/studio`.

## Published surfaces

- `/robots.txt` allows general crawlers, OpenAI search/retrieval and Claude search/retrieval, and points to `/sitemap.xml`.
- `/sitemap.xml` lists the two canonical HTML routes.
- Each page includes Open Graph and Twitter metadata, a 1200 × 630 brand preview, and JSON-LD identifying the website, author, source library and free browser studio. No ratings, adoption figures or endorsements are invented.
- `/llms.txt` is a concise documentation index. `/llm.txt` is an identical compatibility copy, and `/llms-full.txt` combines the full guide and sound catalog.
- `/docs/index.md` documents installation, API examples, suitable use cases, playback requirements, exports and licensing.
- `/docs/sounds.md` and `/sounds.json` expose every sound's actual ID, name, category, description and intended use, plus supported settings and defaults in JSON.
- HTML and HTTP `Link` discovery point to `/llms.txt`.
- The original public Vercel hostname redirects permanently to the custom domain; its paths and query strings remain usable.

`npm run build:discovery` generates documentation from the prepared engine package. `npm run build:static` regenerates it before export. Keep `build:package` first so the inventory matches the authoritative catalog. `npm run test:discovery` validates the exported metadata and files; CI runs it after the static build.

## What this establishes

The site is available for crawling and has factual machine-readable documentation. It does not establish that a provider has indexed it or will recommend it. The install command remains a pinned GitHub dependency; Quiet FX is not published on the npm registry.

Google's AI search features use ordinary search eligibility and require no special AI schema. OpenAI and Anthropic document distinct search, user-retrieval and training crawlers. The `llms.txt` format is a documentation proposal, not a ranking or crawl-permission mechanism.

Sources reviewed September 6, 2026:

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)
- [Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [llms.txt proposal](https://llmstxt.org/)
- [Schema.org SoftwareSourceCode](https://schema.org/SoftwareSourceCode)

After publication, verify public HTTP headers, bot access, canonicals and all discovery endpoints. A future search-indexing review can use the owner's Google Search Console or Bing Webmaster Tools account; sitemap submission or actual index inclusion should only be reported after direct verification.
