# 5GPak

5GPak is an independent Pakistan mobile-network platform. It presents provider-published 5G site locations, privacy-preserving community availability signals, and a separately reviewed sample of mobile speed tests sourced from public Reddit posts.

Production canonical URL: `https://www.5gpakistan.app`

## Owner checklist: make Google indexing possible

Complete these steps after Vercel deploys the latest `main` commit. Code can make pages indexable, but only the domain owner can change Vercel security, DNS, and Google Search Console settings.

### 1. Confirm the production deployment

1. Open the project in Vercel.
2. Open **Deployments**.
3. Confirm the latest `main` deployment is marked **Ready** and is assigned to `www.5gpakistan.app`.
4. Open `https://www.5gpakistan.app/robots.txt` and `https://www.5gpakistan.app/sitemap.xml` in a private browser window.

### 2. Check the Vercel Security Checkpoint first

On 30 August 2026, raw non-browser requests to the homepage, map, robots file, and sitemap returned HTTP `429` with a Vercel challenge. A spoofed Googlebot user agent is not a valid Googlebot test because Vercel verifies crawler identity by IP. The Search Console live test in step 5 is the authoritative check.

For the indexing launch, use monitoring instead of a project-wide browser challenge:

1. In Vercel, open the project.
2. Open **Firewall** > **Rules**.
3. Under **Bot Management**, set **Bot Protection** to **Log** instead of **Challenge**.
4. Select **Review Changes**, then **Publish**.
5. Open **Project Settings** > **Security** and disable **Attack Challenge Mode** if it is enabled.
6. Return to **Firewall** > **Rules** and inspect custom rules. Remove or narrow any rule that challenges every path, especially `/`, `/robots.txt`, `/sitemap.xml`, `/map`, and the content pages.
7. Keep abuse protection scoped to submission/API routes with rate limits and server validation. Do not allow a crawler merely because it claims a Googlebot user agent; that header is easy to spoof.

Vercel references:

- [Configure Bot Protection](https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets)
- [Firewall challenge behavior](https://vercel.com/docs/vercel-firewall/firewall-concepts)
- [Project security settings](https://vercel.com/docs/project-configuration/project-settings)

### 3. Make `www` the only canonical host

1. In Vercel, open **Project Settings** > **Domains**.
2. Keep both `5gpakistan.app` and `www.5gpakistan.app` assigned to this project.
3. Set `www.5gpakistan.app` as the production domain.
4. Edit `5gpakistan.app` and set **Redirect to** `www.5gpakistan.app`.
5. Confirm that `https://5gpakistan.app/anything` permanently redirects to the matching `https://www.5gpakistan.app/anything` URL.

The application metadata, sitemap, structured data, and README all use the `www` origin. Do not switch the preferred host in only one place.

Vercel recommends a `www` primary domain with the apex redirect: [Deploying and redirecting domains](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).

### 4. Add the Search Console Domain property

1. Open [Google Search Console](https://search.google.com/search-console/).
2. Select **Add property**.
3. Choose **Domain**, not URL prefix.
4. Enter `5gpakistan.app` without `https://` or `www`.
5. Copy the TXT verification record Google provides.
6. Add that TXT record at the DNS provider that controls `5gpakistan.app`.
7. Wait for DNS propagation, then select **Verify** in Search Console.
8. Leave the TXT record in DNS permanently.

A Domain property includes the apex domain, `www`, HTTP, HTTPS, and any future subdomains. Google documents the distinction in [Add a website property](https://support.google.com/webmasters/answer/34592).

### 5. Test whether the real Google crawler can fetch the site

In Search Console, inspect each priority URL below. Start with the homepage.

1. Paste the complete URL into **URL inspection**.
2. Select **Test live URL**.
3. Confirm **Page availability** says the URL is available to Google.
4. Confirm the page fetch succeeded, crawling is allowed, and indexing is allowed.
5. Open **View tested page** and check the rendered screenshot and HTML.
6. Confirm the declared canonical uses `https://www.5gpakistan.app/...`.

If the live test reports `429`, a security checkpoint, or an unsuccessful page fetch, return to step 2 and inspect Vercel Firewall events for that request. Do not submit the sitemap until the live test succeeds.

Google reference: [URL Inspection tool](https://support.google.com/webmasters/answer/9012289).

### 6. Submit the sitemap

1. In the Search Console property, open **Sitemaps**.
2. Enter `sitemap.xml` under **Add a new sitemap**.
3. Select **Submit**.
4. Confirm the status becomes **Success** and Google can read the canonical URLs.
5. Recheck the report after several days for fetch or discovered-URL errors.

The sitemap is generated at `https://www.5gpakistan.app/sitemap.xml`. Google recommends absolute canonical URLs and including only pages intended for search results: [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

### 7. Request indexing for the priority pages

After the live test succeeds, use **Request indexing** for these pages in order:

1. `https://www.5gpakistan.app/`
2. `https://www.5gpakistan.app/coverage`
3. `https://www.5gpakistan.app/5g-coverage-map-pakistan`
4. `https://www.5gpakistan.app/reports/pakistan-5g-rollout-august-2026`
5. `https://www.5gpakistan.app/coverage/karachi`
6. `https://www.5gpakistan.app/coverage/lahore`
7. `https://www.5gpakistan.app/coverage/islamabad`
8. `https://www.5gpakistan.app/guides/how-to-check-5g-coverage-pakistan`
9. `https://www.5gpakistan.app/map`
10. `https://www.5gpakistan.app/methodology`

Do not request indexing for `/bug-report`, `/suggestions`, `/api/*`, or individual Reddit evidence records. Those routes intentionally use `noindex` or an `X-Robots-Tag`.

Indexing is not immediate or guaranteed. Google says changes may take days to months, and a request does not guarantee inclusion.

### 8. Validate search appearance

1. Test the homepage and coverage dataset page in the [Rich Results Test](https://search.google.com/test/rich-results).
2. Confirm the homepage exposes `WebSite` and `Organization` data.
3. Confirm the coverage page exposes factual `Dataset` data matching the visible 932-record summary.
4. Confirm the Reddit dataset markup matches the visible 83-post review ledger.
5. Check that page titles, descriptions, canonical URLs, favicon, and social preview image are present in the tested HTML.

Structured data helps Google understand a page but does not guarantee a rich result. It must remain consistent with visible content.

### 9. Monitor weekly for the first two months

In Search Console, review:

- **Page indexing:** server errors, blocked pages, duplicates, and Google-selected canonicals.
- **Performance:** Pakistan impressions, clicks, click-through rate, and queries by page.
- **Core Web Vitals:** mobile failures first, because Google primarily uses mobile-first indexing.
- **Enhancements:** structured-data warnings or errors.
- **Security & Manual Actions:** unexpected issues.

Record a baseline when Search Console begins reporting data. Evaluate changes over weeks, not hours. Google does not guarantee rankings, and this project should not create mass-generated city pages without unique, verified content.

## SEO implementation

The repository includes:

- Canonical metadata and unique titles/descriptions for public routes.
- `robots.txt` and a canonical-only XML sitemap.
- `WebSite`, `Organization`, `AboutPage`, breadcrumb, and factual `Dataset` JSON-LD.
- A generated 1200 x 630 social preview image and existing app icons.
- Server-rendered coverage, methodology, and About pages with crawlable internal links.
- Reusable, server-rendered city, operator, comparison, guide, and dated report pages backed by the published GeoJSON release.
- `noindex` controls for utility forms, API routes, and low-value individual evidence records.
- Regression tests that compare published provider counts and sources with `public/data/sites.geojson`.

### Publishing a coverage update

Do not change counts or create a city page from an unreviewed claim. Use this workflow:

1. Run `npm.cmd run data:providers:audit` while online. It compares Jazz KML and Zong LOCS record counts with the release and reports the Ufone source status.
2. Run `npm.cmd run test`; the release regression tests validate all published GeoJSON counts and source URLs. If the separate parent `maps_data/pakistan_5g_sites_master.geojson` source workspace is available, also run `npm.cmd run data:validate`.
3. If an official source count changed, retain the old release until the new records have been parsed, reviewed, and rebuilt. Update `src/data/siteDataset.ts` only with a new retrieval date and a factual source-review note.
4. Add a city to `CITY_DEFINITIONS` in `src/server/coverage/catalog.ts` only when the dataset can derive a non-zero, reviewable city group. Do not generate hundreds of thin location pages.
5. Run `npm.cmd run test`, `npm.cmd run typecheck`, and `npm.cmd run build` before pushing.
6. After deployment, run Search Console **Test live URL** on `/coverage` and the dated report, then resubmit `sitemap.xml` if its URL set changed.
7. In Search Console Performance, filter **Country: Pakistan** and compare city, operator, English, and Roman Urdu queries over 28-day periods. Improve pages that earn impressions but have weak click-through rate; do not stuff alternate spellings into copy.

The August 2026 review found 538 Jazz KML Point placemarks and 301 Zong LOCS records. Zong's visible banner stated 304 sites, so 5GPak uses the auditable array count. The original Ufone source URL returned 404; its dated 93-record snapshot stays available with that limitation visible until an official replacement is verified.

Google implementation references:

- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Title link guidance](https://developers.google.com/search/docs/appearance/title-link)
- [Mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
- [Dataset structured data](https://developers.google.com/search/docs/appearance/structured-data/dataset)

## Local development

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

The application also requires the project Supabase environment variables for live report, status, and Reddit data. The legal contact address can be overridden with `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL`.

## Verification

Run before deployment:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

After deployment, verify response status and discovery files:

```powershell
curl.exe -I https://www.5gpakistan.app/
curl.exe -I https://www.5gpakistan.app/robots.txt
curl.exe -I https://www.5gpakistan.app/sitemap.xml
curl.exe https://www.5gpakistan.app/robots.txt
curl.exe https://www.5gpakistan.app/sitemap.xml
```

These raw commands may still be challenged if broad Vercel Bot Protection is active. Search Console **Test live URL** remains the decisive Google accessibility test because Vercel verifies legitimate crawlers by more than their user-agent text.
