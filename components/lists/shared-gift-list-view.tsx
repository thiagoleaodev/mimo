"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gift, Search } from "lucide-react";

import { reserveGift } from "@/app/lists/[shareSlug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SharedGift = {
  description: string | null;
  id: string;
  imageUrl: string | null;
  price: string | null;
  productUrl: string | null;
  reservedByCurrentUser: boolean;
  reserved: boolean;
  title: string;
};

function formatPrice(price: string | null) {
  if (!price) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(Number(price));
}

export function SharedGiftListView({
  gifts,
  shareSlug,
}: {
  gifts: SharedGift[];
  shareSlug: string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGifts = useMemo(() => {
    if (!normalizedQuery) {
      return gifts;
    }

    return gifts.filter((gift) => {
      const searchableText = `${gift.title} ${gift.description ?? ""}`.toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [gifts, normalizedQuery]);

  return (
    <section className="grid gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar presente"
          type="search"
          value={query}
        />
      </div>

      {gifts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Gift className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">
            Nenhum presente cadastrado ainda.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Volte depois para ver novas sugestoes.
          </p>
        </div>
      ) : filteredGifts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGifts.map((gift) => {
            const price = formatPrice(gift.price);

            return (
              <article className="flex min-h-72 flex-col rounded-lg border bg-card" key={gift.id}>
                {gift.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="aspect-[4/3] w-full rounded-t-lg border-b object-cover"
                    src={gift.imageUrl}
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded-t-lg border-b bg-muted">
                    <Gift className="size-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-medium">
                        {gift.title}
                      </h3>
                      <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                        {gift.reserved ? "Reservado" : "Disponivel"}
                      </span>
                    </div>
                    {gift.description ? (
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {gift.description}
                      </p>
                    ) : null}
                  </div>

                  {gift.productUrl ? (
                    <Button
                      className="w-full"
                      render={<Link href={gift.productUrl} />}
                      size="sm"
                      variant="outline"
                    >
                      Ver produto
                    </Button>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {price ?? "Sem preco"}
                    </span>
                    {gift.reserved ? (
                      <Button disabled size="sm" variant="outline">
                        {gift.reservedByCurrentUser
                          ? "Reservado por voce"
                          : "Reservado"}
                      </Button>
                    ) : (
                      <form action={reserveGift}>
                        <input name="giftId" type="hidden" value={gift.id} />
                        <input name="shareSlug" type="hidden" value={shareSlug} />
                        <Button size="sm" type="submit">
                          Reservar
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Nenhum presente encontrado.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente buscar por outro nome ou descricao.
          </p>
        </div>
      )}
    </section>
  );
}
