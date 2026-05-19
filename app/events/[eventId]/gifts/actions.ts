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

const optionalMercadoLivreUrl = optionalUrl.refine((value) => {
  if (!value) {
    return true;
  }

  try {
    return isMercadoLivreUrl(new URL(value));
  } catch {
    return false;
  }
}, "Informe um link do Mercado Livre.");

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
  productUrl: optionalMercadoLivreUrl,
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
  store: z.literal("mercado_livre", {
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

function getMercadoLivreId(value: string) {
  const match = value.match(/(^|[^a-z0-9])(MLB)-?(\d{6,})([^a-z0-9]|$)/i);

  return match ? `MLB${match[3]}` : null;
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

  return metaMatch?.[1]?.trim();
}

function getHtmlJsonLdPrice(html: string) {
  const offerPriceMatch = html.match(
    /"offers"\s*:\s*\{[^}]*"price"\s*:\s*(?:"([^"]+)"|(\d+(?:\.\d+)?))/i
  );

  return normalizeExtractedPrice(offerPriceMatch?.[1] ?? offerPriceMatch?.[2]);
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
      ? buildMercadoLivreAffiliateUrl(productUrl)
      : undefined;

    if (productUrl && !affiliateProductUrl) {
      return {
        errors: {
          productUrl: "Configure MERCADO_LIVRE_AFFILIATE_ID para salvar o link.",
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
