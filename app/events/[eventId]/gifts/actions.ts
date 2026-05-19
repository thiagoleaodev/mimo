"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/services/prisma";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) {
      return true;
    }

    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, "Informe uma URL valida.");

const optionalSupportedProductUrl = optionalUrl.refine((value) => {
  if (!value) {
    return true;
  }

  try {
    return Boolean(getProductStoreFromUrl(new URL(value)));
  } catch {
    return false;
  }
}, "Informe um link do Mercado Livre, Amazon ou Magalu.");

const giftSchema = z.object({
  description: z
    .string()
    .trim()
    .max(500, "Use no maximo 500 caracteres.")
    .optional(),
  eventId: z.string().min(1, "Evento invalido."),
  imageUrl: optionalUrl,
  price: z
    .string()
    .trim()
    .optional()
    .refine((value) => {
      if (!value) {
        return true;
      }

      const normalizedValue = value.replace(",", ".");
      return /^\d+(\.\d{1,2})?$/.test(normalizedValue);
    }, "Informe um valor valido, como 129,90.")
    .refine((value) => {
      if (!value) {
        return true;
      }

      return Number(value.replace(",", ".")) <= 999999.99;
    }, "Informe um valor menor."),
  productUrl: optionalSupportedProductUrl,
  title: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(120, "Use no maximo 120 caracteres."),
});

const productExtractionSchema = z.object({
  productUrl: z
    .string()
    .trim()
    .url("Informe um link valido do produto."),
  store: z.enum(["mercado_livre", "amazon", "magalu"], {
    error: "Escolha uma loja valida.",
  }),
});

export type CreateGiftState = {
  errors?: Partial<Record<keyof z.infer<typeof giftSchema>, string>>;
  message?: string;
  success?: boolean;
};

export type ExtractProductState = {
  data?: {
    imageUrl?: string;
    price?: string;
    productUrl: string;
    title: string;
  };
  errors?: Partial<Record<keyof z.infer<typeof productExtractionSchema>, string>>;
  message?: string;
  success: boolean;
};

function emptyToUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}

function normalizePrice(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(",", ".");
}

function isMercadoLivreUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();

  return (
    hostname === "meli.la" ||
    hostname === "mercadolivre.com" ||
    hostname.endsWith(".mercadolivre.com") ||
    hostname === "mercadolivre.com.br" ||
    hostname.endsWith(".mercadolivre.com.br")
  );
}

function isAmazonUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const amazonDomains = [
    "amazon.com",
    "amazon.com.br",
    "amazon.co.uk",
    "amazon.ca",
    "amazon.de",
    "amazon.es",
    "amazon.fr",
    "amazon.it",
    "amazon.com.mx",
    "amazon.com.au",
    "amazon.co.jp",
    "amazon.in",
  ];

  return (
    hostname === "amzn.to" ||
    amazonDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  );
}

function isMagaluUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();

  return (
    hostname === "magazinevoce.com.br" ||
    hostname.endsWith(".magazinevoce.com.br") ||
    hostname === "magazineluiza.com.br" ||
    hostname.endsWith(".magazineluiza.com.br") ||
    hostname === "magalu.com" ||
    hostname.endsWith(".magalu.com")
  );
}

function getProductStoreFromUrl(url: URL) {
  if (isMercadoLivreUrl(url)) {
    return "mercado_livre" as const;
  }

  if (isAmazonUrl(url)) {
    return "amazon" as const;
  }

  if (isMagaluUrl(url)) {
    return "magalu" as const;
  }

  return null;
}

function getMercadoLivreId(value: string) {
  const match = value.match(/(^|[^a-z0-9])(MLB)-?(\d{6,})([^a-z0-9]|$)/i);

  return match ? `MLB${match[3]}` : null;
}

function getAmazonAsin(url: URL) {
  const pathname = decodeURIComponent(url.pathname);
  const asinMatch =
    pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i) ??
    pathname.match(/\/(?:exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i);

  return asinMatch?.[1]?.toUpperCase();
}

function normalizeExtractedUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

function normalizeExtractedPrice(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return undefined;
  }

  return price.toFixed(2);
}

function normalizeCurrencyPrice(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return undefined;
  }

  if (typeof value === "number") {
    return normalizeExtractedPrice(value);
  }

  const match = value
    .replace(/&nbsp;|\u00a0/g, " ")
    .match(/\d{1,3}(?:(?:[.,]\d{3})+)?(?:[.,]\d{2})|\d+(?:[.,]\d{2})?/);

  if (!match) {
    return undefined;
  }

  const rawValue = match[0];
  const lastComma = rawValue.lastIndexOf(",");
  const lastDot = rawValue.lastIndexOf(".");
  let normalizedValue = rawValue.replace(/[^\d.,]/g, "");

  if (lastComma > -1 && lastDot > -1) {
    normalizedValue =
      lastComma > lastDot
        ? normalizedValue.replace(/\./g, "").replace(",", ".")
        : normalizedValue.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalizedValue = /,\d{2}$/.test(normalizedValue)
      ? normalizedValue.replace(",", ".")
      : normalizedValue.replace(/,/g, "");
  } else if (/\.\d{3}$/.test(normalizedValue)) {
    normalizedValue = normalizedValue.replace(/\./g, "");
  } else if ((normalizedValue.match(/\./g) ?? []).length > 1) {
    normalizedValue = normalizedValue.replace(/\./g, "");
  }

  return normalizeExtractedPrice(normalizedValue);
}

function normalizeExtractedTitle(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const title = value
    .replace(/\s*(?:[-|•]\s*)?R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?.*$/i, "")
    .replace(/\s*(?:[-|•]\s*)?\d+(?:[,.]\d{2})?\s*reais.*$/i, "")
    .trim();

  return title.length >= 2 ? title : undefined;
}

function getMercadoLivreAffiliateId() {
  return process.env.MERCADO_LIVRE_AFFILIATE_ID?.trim();
}

function getAmazonAffiliateId() {
  return process.env.AMAZON_AFFILIATE_ID?.trim();
}

function getMagaluAffiliateId() {
  return process.env.MAGALU_AFFILIATE_ID?.trim();
}

function buildMercadoLivreAffiliateUrl(value: string) {
  const url = new URL(value);

  if (!isMercadoLivreUrl(url)) {
    return null;
  }

  const affiliateId = getMercadoLivreAffiliateId();

  if (!affiliateId) {
    return null;
  }

  url.searchParams.set("matt_word", affiliateId);

  return url.toString();
}

function normalizeMagaluAffiliateSlug(value: string) {
  try {
    const url = new URL(value);
    const [slug] = url.pathname.split("/").filter(Boolean);

    return slug;
  } catch {
    return value.replace(/^\/+|\/+$/g, "");
  }
}

function buildAmazonAffiliateUrl(value: string) {
  const url = new URL(value);

  if (!isAmazonUrl(url)) {
    return null;
  }

  const affiliateId = getAmazonAffiliateId();

  if (!affiliateId) {
    return null;
  }

  const asin = getAmazonAsin(url);

  if (asin && url.hostname.toLowerCase() !== "amzn.to") {
    const affiliateUrl = new URL(`${url.origin}/dp/${asin}`);
    affiliateUrl.searchParams.set("tag", affiliateId);

    return affiliateUrl.toString();
  }

  url.searchParams.set("tag", affiliateId);

  return url.toString();
}

function buildMagaluAffiliateUrl(value: string) {
  const url = new URL(value);

  if (!isMagaluUrl(url)) {
    return null;
  }

  const affiliateId = getMagaluAffiliateId();

  if (!affiliateId) {
    return null;
  }

  const affiliateSlug = normalizeMagaluAffiliateSlug(affiliateId);

  if (!affiliateSlug) {
    return null;
  }

  const pathSegments = url.pathname.split("/").filter(Boolean);
  const isMagazineVoceUrl = url.hostname.toLowerCase().includes("magazinevoce");
  const productPathSegments = isMagazineVoceUrl
    ? pathSegments.slice(1)
    : pathSegments;
  const productPath = productPathSegments.join("/");
  const affiliateUrl = new URL(
    `https://www.magazinevoce.com.br/${affiliateSlug}/${
      productPath ? `${productPath}/` : ""
    }`
  );

  for (const [key, parameterValue] of url.searchParams.entries()) {
    affiliateUrl.searchParams.set(key, parameterValue);
  }

  return affiliateUrl.toString();
}

function buildAffiliateProductUrl(value: string) {
  const url = new URL(value);
  const store = getProductStoreFromUrl(url);

  if (store === "mercado_livre") {
    return buildMercadoLivreAffiliateUrl(value);
  }

  if (store === "amazon") {
    return buildAmazonAffiliateUrl(value);
  }

  if (store === "magalu") {
    return buildMagaluAffiliateUrl(value);
  }

  return null;
}

function getAffiliateEnvName(value: string) {
  const store = getProductStoreFromUrl(new URL(value));

  if (store === "mercado_livre") {
    return "MERCADO_LIVRE_AFFILIATE_ID";
  }

  if (store === "amazon") {
    return "AMAZON_AFFILIATE_ID";
  }

  if (store === "magalu") {
    return "MAGALU_AFFILIATE_ID";
  }

  return "a env de afiliado";
}

function parseSetCookieHeader(setCookieHeader: string | null) {
  const cookies = new Map<string, string>();

  if (!setCookieHeader) {
    return cookies;
  }

  for (const match of setCookieHeader.matchAll(
    /(?:^|,\s*)([_a-zA-Z0-9-]+)=([^;]*)/g
  )) {
    cookies.set(match[1], match[2]);
  }

  return cookies;
}

function solveMercadoLivreChallenge(cookies: Map<string, string>) {
  const state = cookies.get("_bmstate");

  if (!state) {
    return undefined;
  }

  const [seed, difficultyValue] = decodeURIComponent(state).split(";");
  const difficulty = Number(difficultyValue);

  if (!seed || !Number.isInteger(difficulty) || difficulty < 0 || difficulty > 6) {
    return undefined;
  }

  const prefix = "0".repeat(difficulty);

  for (let nonce = 0; nonce < 2_000_000; nonce += 1) {
    const hash = createHash("sha256").update(`${seed}${nonce}`).digest("hex");

    if (hash.startsWith(prefix)) {
      return encodeURIComponent(`${seed};${nonce}`);
    }
  }

  return undefined;
}

function serializeCookies(cookies: Map<string, string>) {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function getHtmlMetaContent(html: string, property: string) {
  const escapedProperty = property.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const metaMatch = html.match(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedProperty}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );

  if (metaMatch?.[1]) {
    return metaMatch[1].trim();
  }

  const reversedMetaMatch = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escapedProperty}["'][^>]*>`,
      "i"
    )
  );

  return reversedMetaMatch?.[1]?.trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCharCode(Number(code))
    );
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHtmlElementTextById(html: string, id: string) {
  const escapedId = id.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const elementMatch = html.match(
    new RegExp(`<[^>]+id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i")
  );

  return elementMatch ? stripHtml(elementMatch[1]) : undefined;
}

function getHtmlTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return titleMatch ? stripHtml(titleMatch[1]) : undefined;
}

function getFirstHtmlElementText(html: string, tagName: string) {
  const escapedTagName = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const elementMatch = html.match(
    new RegExp(`<${escapedTagName}[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i")
  );

  return elementMatch ? stripHtml(elementMatch[1]) : undefined;
}

function getHtmlMetaItemPropContent(html: string, itemProp: string) {
  const escapedItemProp = itemProp.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const metaMatch = html.match(
    new RegExp(
      `<meta[^>]+itemprop=["']${escapedItemProp}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );

  return metaMatch?.[1]?.trim();
}

function getHtmlJsonLdPrice(html: string) {
  const offerPriceMatch = html.match(
    /"offers"\s*:\s*\{[^}]*"price"\s*:\s*(?:"([^"]+)"|(\d+(?:\.\d+)?))/i
  );

  return (
    normalizeExtractedPrice(offerPriceMatch?.[1] ?? offerPriceMatch?.[2]) ??
    normalizeCurrencyPrice(offerPriceMatch?.[1] ?? offerPriceMatch?.[2])
  );
}

function getHtmlJsonLdString(html: string, property: string) {
  const escapedProperty = property.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = html.match(
    new RegExp(`"${escapedProperty}"\\s*:\\s*"([^"]+)"`, "i")
  );

  return match?.[1]?.replace(/\\\//g, "/").trim();
}

async function fetchMercadoLivreHtml(url: URL) {
  const headers = {
    accept: "text/html",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  };

  const firstResponse = await fetch(url, {
    cache: "no-store",
    headers,
    redirect: "follow",
  });
  const firstHtml = await firstResponse.text();
  const cookies = parseSetCookieHeader(firstResponse.headers.get("set-cookie"));
  const challenge = solveMercadoLivreChallenge(cookies);

  if (!challenge) {
    return {
      html: firstHtml,
      url: firstResponse.url || url.toString(),
    };
  }

  cookies.set("_bmc", challenge);
  cookies.set("_bm_skipml", "true");

  const secondResponse = await fetch(url, {
    cache: "no-store",
    headers: {
      ...headers,
      cookie: serializeCookies(cookies),
    },
    redirect: "follow",
  });

  return {
    html: await secondResponse.text(),
    url: secondResponse.url || firstResponse.url || url.toString(),
  };
}

async function fetchMercadoLivreResource(
  kind: "items" | "products",
  id: string
) {
  const url = new URL(`https://api.mercadolibre.com/${kind}/${id}`);
  url.searchParams.set(
    "attributes",
    "id,title,name,price,permalink,pictures,thumbnail,secure_thumbnail,buy_box_winner"
  );

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function mapMercadoLivreResource(
  resource: Record<string, unknown>,
  fallbackUrl: string
) {
  const pictures = Array.isArray(resource.pictures)
    ? (resource.pictures as Record<string, unknown>[])
    : [];
  const firstPicture = pictures[0];
  const buyBoxWinner =
    resource.buy_box_winner &&
    typeof resource.buy_box_winner === "object" &&
    !Array.isArray(resource.buy_box_winner)
      ? (resource.buy_box_winner as Record<string, unknown>)
      : undefined;
  const title = normalizeExtractedTitle(resource.title ?? resource.name);

  if (!title) {
    return null;
  }

  return {
    imageUrl:
      normalizeExtractedUrl(firstPicture?.secure_url) ??
      normalizeExtractedUrl(firstPicture?.url) ??
      normalizeExtractedUrl(resource.secure_thumbnail) ??
      normalizeExtractedUrl(resource.thumbnail),
    price:
      normalizeExtractedPrice(resource.price) ??
      normalizeExtractedPrice(buyBoxWinner?.price),
    productUrl: normalizeExtractedUrl(resource.permalink) ?? fallbackUrl,
    title,
  };
}

async function extractMercadoLivreProduct(productUrl: string) {
  const originalUrl = new URL(productUrl);

  if (!isMercadoLivreUrl(originalUrl)) {
    return {
      message: "Informe um link do Mercado Livre.",
      success: false,
    } satisfies ExtractProductState;
  }

  let resolvedUrl = originalUrl.toString();
  let html = "";

  try {
    const page = await fetchMercadoLivreHtml(originalUrl);

    resolvedUrl = page.url;
    html = page.html;
  } catch {
    // The public item API can still work when the product id is already in the URL.
  }

  if (!isMercadoLivreUrl(new URL(resolvedUrl))) {
    return {
      message: "Informe um link do Mercado Livre.",
      success: false,
    } satisfies ExtractProductState;
  }

  const productId = getMercadoLivreId(resolvedUrl) ?? getMercadoLivreId(html);

  if (productId) {
    const resources = await Promise.all([
      fetchMercadoLivreResource("items", productId),
      fetchMercadoLivreResource("products", productId),
    ]);

    for (const resource of resources) {
      if (!resource) {
        continue;
      }

      const product = mapMercadoLivreResource(resource, resolvedUrl);

      if (product) {
        return {
          data: {
            ...product,
            price: product.price ?? getHtmlJsonLdPrice(html),
            productUrl:
              buildMercadoLivreAffiliateUrl(product.productUrl) ??
              product.productUrl,
          },
          message: "Dados preenchidos. Revise antes de salvar.",
          success: true,
        } satisfies ExtractProductState;
      }
    }
  }

  const title = normalizeExtractedTitle(getHtmlMetaContent(html, "og:title"));

  if (title) {
    return {
      data: {
        imageUrl: normalizeExtractedUrl(getHtmlMetaContent(html, "og:image")),
        price: normalizeExtractedPrice(
          getHtmlMetaContent(html, "product:price:amount")
        ) ?? getHtmlJsonLdPrice(html),
        productUrl: buildMercadoLivreAffiliateUrl(resolvedUrl) ?? resolvedUrl,
        title,
      },
      message: "Dados preenchidos. Revise antes de salvar.",
      success: true,
    } satisfies ExtractProductState;
  }

  return {
    message: "Nao foi possivel extrair os dados desse produto.",
    success: false,
  } satisfies ExtractProductState;
}

async function fetchAmazonHtml(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
    redirect: "follow",
  });

  return {
    html: await response.text(),
    url: response.url || url.toString(),
  };
}

function normalizeAmazonTitle(value: unknown) {
  const title = normalizeExtractedTitle(value);

  if (!title) {
    return undefined;
  }

  return title
    .replace(/^Amazon(?:\.com(?:\.br)?|)\s*:\s*/i, "")
    .replace(/\s*:\s*Amazon(?:\.com(?:\.br)?|).*$/i, "")
    .trim();
}

function getAmazonPrice(html: string) {
  const candidates = [
    getHtmlJsonLdPrice(html),
    normalizeCurrencyPrice(getHtmlMetaItemPropContent(html, "price")),
    normalizeCurrencyPrice(getHtmlElementTextById(html, "priceblock_ourprice")),
    normalizeCurrencyPrice(getHtmlElementTextById(html, "priceblock_dealprice")),
    normalizeCurrencyPrice(getHtmlElementTextById(html, "priceblock_saleprice")),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  const offscreenPrices = Array.from(
    html.matchAll(
      /<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi
    )
  );

  for (const match of offscreenPrices) {
    const price = normalizeCurrencyPrice(stripHtml(match[1]));

    if (price) {
      return price;
    }
  }

  return undefined;
}

function getAmazonImageUrl(html: string) {
  const jsonLdImage = getHtmlJsonLdString(html, "image");
  const oldHiresMatch = html.match(/data-old-hires=["']([^"']+)["']/i);
  const dynamicImageMatch = html.match(/data-a-dynamic-image=["']({[^"']+})["']/i);
  const hiResMatch = html.match(/"hiRes"\s*:\s*"([^"]+)"/i);

  if (jsonLdImage) {
    return normalizeExtractedUrl(jsonLdImage);
  }

  if (oldHiresMatch?.[1]) {
    return normalizeExtractedUrl(oldHiresMatch[1]);
  }

  if (dynamicImageMatch?.[1]) {
    const firstImageMatch = decodeHtmlEntities(dynamicImageMatch[1]).match(
      /"([^"]+)"/
    );

    if (firstImageMatch?.[1]) {
      return normalizeExtractedUrl(firstImageMatch[1]);
    }
  }

  if (hiResMatch?.[1]) {
    return normalizeExtractedUrl(hiResMatch[1].replace(/\\\//g, "/"));
  }

  return normalizeExtractedUrl(getHtmlMetaContent(html, "og:image"));
}

async function extractAmazonProduct(productUrl: string) {
  const originalUrl = new URL(productUrl);

  if (!isAmazonUrl(originalUrl)) {
    return {
      message: "Informe um link da Amazon.",
      success: false,
    } satisfies ExtractProductState;
  }

  let resolvedUrl = originalUrl.toString();
  let html = "";

  try {
    const page = await fetchAmazonHtml(originalUrl);

    resolvedUrl = page.url;
    html = page.html;
  } catch {
    // The affiliate URL can still be generated from the original product URL.
  }

  if (!isAmazonUrl(new URL(resolvedUrl))) {
    return {
      message: "Informe um link da Amazon.",
      success: false,
    } satisfies ExtractProductState;
  }

  const title =
    normalizeAmazonTitle(getHtmlElementTextById(html, "productTitle")) ??
    normalizeAmazonTitle(getHtmlMetaContent(html, "og:title")) ??
    normalizeAmazonTitle(getHtmlJsonLdString(html, "name")) ??
    normalizeAmazonTitle(getHtmlTitle(html));

  if (!title) {
    return {
      message: "Nao foi possivel extrair os dados desse produto.",
      success: false,
    } satisfies ExtractProductState;
  }

  return {
    data: {
      imageUrl: getAmazonImageUrl(html),
      price: getAmazonPrice(html),
      productUrl: buildAmazonAffiliateUrl(resolvedUrl) ?? resolvedUrl,
      title,
    },
    message: "Dados preenchidos. Revise antes de salvar.",
    success: true,
  } satisfies ExtractProductState;
}

async function fetchMagaluHtml(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
    redirect: "follow",
  });

  return {
    html: await response.text(),
    url: response.url || url.toString(),
  };
}

function normalizeMagaluTitle(value: unknown) {
  const title = normalizeExtractedTitle(value);

  if (!title) {
    return undefined;
  }

  const normalizedTitle = title
    .replace(/\s*[-|]\s*(?:Magalu|Magazine Luiza|Magazine Você).*$/i, "")
    .trim();

  const searchableTitle = normalizedTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    searchableTitle.includes("nao e possivel acessar a pagina") ||
    searchableTitle.includes("pagina nao encontrada")
  ) {
    return undefined;
  }

  return normalizedTitle.length >= 2 ? normalizedTitle : undefined;
}

function getMagaluPrice(html: string) {
  const candidates = [
    getHtmlJsonLdPrice(html),
    normalizeCurrencyPrice(getHtmlMetaContent(html, "product:price:amount")),
    normalizeCurrencyPrice(getHtmlMetaItemPropContent(html, "price")),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  const priceMatches = Array.from(html.matchAll(/R\$\s*[\d.,]+/gi));

  for (const match of priceMatches) {
    const price = normalizeCurrencyPrice(match[0]);

    if (price) {
      return price;
    }
  }

  return undefined;
}

function getMagaluImageUrl(html: string) {
  return (
    normalizeExtractedUrl(getHtmlMetaContent(html, "og:image")) ??
    normalizeExtractedUrl(getHtmlJsonLdString(html, "image"))
  );
}

async function extractMagaluProduct(productUrl: string) {
  const originalUrl = new URL(productUrl);

  if (!isMagaluUrl(originalUrl)) {
    return {
      message: "Informe um link do Magalu.",
      success: false,
    } satisfies ExtractProductState;
  }

  const affiliateProductUrl = buildMagaluAffiliateUrl(originalUrl.toString());
  const fetchTargets = Array.from(
    new Set([affiliateProductUrl, originalUrl.toString()].filter(Boolean))
  ) as string[];

  for (const target of fetchTargets) {
    let resolvedUrl = target;
    let html = "";

    try {
      const page = await fetchMagaluHtml(new URL(target));

      resolvedUrl = page.url;
      html = page.html;
    } catch {
      continue;
    }

    if (!isMagaluUrl(new URL(resolvedUrl))) {
      continue;
    }

    const title =
      normalizeMagaluTitle(getHtmlMetaContent(html, "og:title")) ??
      normalizeMagaluTitle(getHtmlJsonLdString(html, "name")) ??
      normalizeMagaluTitle(getFirstHtmlElementText(html, "h1")) ??
      normalizeMagaluTitle(getHtmlTitle(html));

    if (!title) {
      continue;
    }

    return {
      data: {
        imageUrl: getMagaluImageUrl(html),
        price: getMagaluPrice(html),
        productUrl:
          buildMagaluAffiliateUrl(resolvedUrl) ??
          affiliateProductUrl ??
          resolvedUrl,
        title,
      },
      message: "Dados preenchidos. Revise antes de salvar.",
      success: true,
    } satisfies ExtractProductState;
  }

  return {
    message: "Nao foi possivel extrair os dados desse produto.",
    success: false,
  } satisfies ExtractProductState;
}

export async function extractProduct(
  formData: FormData
): Promise<ExtractProductState> {
  const parsed = productExtractionSchema.safeParse({
    productUrl: formData.get("productUrl"),
    store: formData.get("store"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error)
        .fieldErrors as ExtractProductState["errors"],
      message: "Revise os campos da extracao.",
      success: false,
    };
  }

  try {
    if (parsed.data.store === "amazon") {
      return await extractAmazonProduct(parsed.data.productUrl);
    }

    if (parsed.data.store === "magalu") {
      return await extractMagaluProduct(parsed.data.productUrl);
    }

    return await extractMercadoLivreProduct(parsed.data.productUrl);
  } catch (error) {
    console.error("Unable to extract product", error);

    return {
      message: "Nao foi possivel consultar a loja agora.",
      success: false,
    };
  }
}

export async function createGift(
  _previousState: CreateGiftState,
  formData: FormData
): Promise<CreateGiftState> {
  const parsed = giftSchema.safeParse({
    description: formData.get("description"),
    eventId: formData.get("eventId"),
    imageUrl: formData.get("imageUrl"),
    price: formData.get("price"),
    productUrl: formData.get("productUrl"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors as CreateGiftState["errors"],
      message: "Revise os campos destacados.",
      success: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      message: "Faca login com Google para adicionar presentes.",
      success: false,
    };
  }

  try {
    const event = await prisma.event.findFirst({
      where: {
        id: parsed.data.eventId,
        owner: {
          email: user.email,
        },
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return {
        message: "Voce nao tem permissao para editar este evento.",
        success: false,
      };
    }

    const productUrl = emptyToUndefined(parsed.data.productUrl);
    const affiliateProductUrl = productUrl
      ? buildAffiliateProductUrl(productUrl)
      : undefined;

    if (productUrl && !affiliateProductUrl) {
      const envName = getAffiliateEnvName(productUrl);

      return {
        errors: {
          productUrl: `Configure ${envName} para salvar o link.`,
        },
        message: "Nao foi possivel gerar o link de afiliado.",
        success: false,
      };
    }

    await prisma.gift.create({
      data: {
        description: emptyToUndefined(parsed.data.description),
        eventId: event.id,
        imageUrl: emptyToUndefined(parsed.data.imageUrl),
        price: normalizePrice(parsed.data.price),
        productUrl: affiliateProductUrl,
        title: parsed.data.title,
      },
    });
  } catch (error) {
    console.error("Unable to create gift", error);

    return {
      message:
        "Nao foi possivel conectar ao banco de dados. Verifique a DATABASE_URL.",
      success: false,
    };
  }

  revalidatePath(`/events/${parsed.data.eventId}/gifts`);

  return {
    message: "Presente adicionado com sucesso.",
    success: true,
  };
}

export async function deleteGift(formData: FormData) {
  const giftId = z.string().min(1).safeParse(formData.get("giftId"));

  if (!giftId.success) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return;
  }

  try {
    const gift = await prisma.gift.findFirst({
      where: {
        id: giftId.data,
        event: {
          owner: {
            email: user.email,
          },
        },
      },
      select: {
        eventId: true,
        reservation: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!gift || gift.reservation) {
      return;
    }

    await prisma.gift.delete({
      where: {
        id: giftId.data,
      },
    });

    revalidatePath(`/events/${gift.eventId}/gifts`);
  } catch (error) {
    console.error("Unable to delete gift", error);
  }
}
