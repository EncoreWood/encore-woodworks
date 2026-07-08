import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth check — allows manual admin triggers and platform-scheduled runs
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      // No user context (scheduled trigger) — proceed with service role
    }
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = body.limit || 25;

    // Get inventory items that have at least one supplier link
    const items = await base44.asServiceRole.entities.Inventory.list('-created_date', 500);
    const itemsWithLinks = items.filter(
      (item) => Array.isArray(item.suppliers) && item.suppliers.some((s) => s.link)
    );

    const toProcess = itemsWithLinks.slice(0, limit);

    const results = {
      checked: 0,
      updated: 0,
      failed: 0,
      unchanged: 0,
      details: [],
    };

    for (const item of toProcess) {
      results.checked++;
      try {
        const supplier = item.suppliers.find((s) => s.link);
        if (!supplier) continue;

        // Fetch the page with a 10s timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(supplier.link, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          results.failed++;
          results.details.push({ item: item.name, error: `HTTP ${response.status}` });
          continue;
        }

        const html = await response.text();

        // Try structured data extraction first (free)
        let price = extractPriceFromHTML(html);

        // Fall back to LLM-based extraction if structured data not found
        if (price === null) {
          price = await extractPriceWithLLM(base44, html, item.name, supplier.link);
        }

        if (price !== null && price > 0) {
          const currentPrice = item.price_per_unit ?? 0;
          if (Math.abs(price - currentPrice) > 0.001) {
            await base44.asServiceRole.entities.Inventory.update(item.id, {
              price_per_unit: price,
            });
            results.updated++;
            results.details.push({
              item: item.name,
              old: currentPrice,
              new: price,
              supplier: supplier.name,
            });
          } else {
            results.unchanged++;
          }
        } else {
          results.failed++;
          results.details.push({ item: item.name, error: 'Price not found' });
        }
      } catch (err) {
        results.failed++;
        results.details.push({ item: item.name, error: err.message });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractPriceFromHTML(html) {
  // 1. OpenGraph product:price:amount meta tag
  const ogMatch =
    html.match(/<meta[^>]+(?:property|name)=["']product:price:amount["'][^>]+content=["']([\d.,]+)["']/i) ||
    html.match(/<meta[^>]+content=["']([\d.,]+)["'][^>]+(?:property|name)=["']product:price:amount["']/i);
  if (ogMatch) {
    const price = parseFloat(ogMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) return price;
  }

  // 2. JSON-LD structured data (schema.org Product)
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        const types = Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']];
        if (types.includes('Product')) {
          const offers = entry.offers;
          if (offers) {
            const offerList = Array.isArray(offers) ? offers : [offers];
            for (const offer of offerList) {
              if (offer.price) {
                const price = parseFloat(String(offer.price).replace(/[^0-9.]/g, ''));
                if (!isNaN(price) && price > 0) return price;
              }
              if (offer.priceSpecification?.price) {
                const price = parseFloat(
                  String(offer.priceSpecification.price).replace(/[^0-9.]/g, '')
                );
                if (!isNaN(price) && price > 0) return price;
              }
            }
          }
        }
      }
    } catch (_) {
      // ignore parse errors
    }
  }

  // 3. itemprop="price" with content attribute
  const itempropMatch =
    html.match(/itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i) ||
    html.match(/content=["']([\d.,]+)["'][^>]*itemprop=["']price["']/i);
  if (itempropMatch) {
    const price = parseFloat(itempropMatch[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) return price;
  }

  return null;
}

async function extractPriceWithLLM(base44, html, itemName, url) {
  try {
    const truncated = html.substring(0, 15000);

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract the product price from this HTML content for "${itemName}" (URL: ${url}).

Return the unit price as a number (no currency symbols or commas). If no price is found, set "found" to false and "price" to 0.

HTML content (truncated):
${truncated}`,
      response_json_schema: {
        type: 'object',
        properties: {
          price: { type: 'number' },
          found: { type: 'boolean' },
        },
      },
    });

    if (response.found && response.price > 0) {
      return response.price;
    }
    return null;
  } catch (_) {
    return null;
  }
}