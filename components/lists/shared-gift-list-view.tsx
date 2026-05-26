"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Gift, Search, UserRound } from "lucide-react";

import {
  cancelGiftReservation,
  reserveGift,
} from "@/app/lists/[shareSlug]/actions";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SharedGift = {
  description: string | null;
  id: string;
  imageUrl: string | null;
  price: string | null;
  productUrl: string | null;
  reservedByImage: string | null;
  reservedByCurrentUser: boolean;
  reservedByName: string | null;
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

function GiftSubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-11 w-full text-xs sm:text-sm"
      disabled={pending}
      size="lg"
      type="submit"
      variant={variant}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function SharedGiftListView({
  gifts,
  shareSlug,
}: {
  gifts: SharedGift[];
  shareSlug: string;
}) {
  const router = useRouter();
  const confettiRef = useRef<ConfettiRef>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);
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

  async function handleReserveGift(formData: FormData) {
    const result = await reserveGift(formData);
    setFeedback(result);

    if (result.status === "success") {
      const fireConfetti = () => {
        confettiRef.current?.fire({
          colors: ["#26ccff", "#88ff5a", "#fcff42", "#ffa62d", "#ff5e7e"],
          origin: { x: 0.5, y: 0.65 },
          particleCount: 110,
          spread: 80,
          startVelocity: 44,
        });
      };

      fireConfetti();
      window.setTimeout(fireConfetti, 180);
      window.setTimeout(() => router.refresh(), 1200);

      return;
    }

    router.refresh();
  }

  async function handleCancelGiftReservation(formData: FormData) {
    const result = await cancelGiftReservation(formData);
    setFeedback(result);
    router.refresh();
  }

  return (
    <section className="grid gap-4">
      <Confetti
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-[100] h-dvh w-dvw"
        globalOptions={{ resize: true, useWorker: false }}
        manualstart
        options={{
          colors: ["#26ccff", "#88ff5a", "#fcff42", "#ffa62d", "#ff5e7e"],
        }}
      />

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

      {feedback ? (
        <p
          aria-live="polite"
          className={
            feedback.status === "success"
              ? "rounded-lg border border-primary/15 bg-muted px-3 py-2 text-sm font-medium"
              : "rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          }
        >
          {feedback.message}
        </p>
      ) : null}

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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {filteredGifts.map((gift) => {
            const price = formatPrice(gift.price);

            return (
              <div className="flex min-w-0 flex-col gap-2" key={gift.id}>
                <article className="flex h-full min-h-60 flex-col rounded-lg border bg-card">
                  <div className="relative">
                    {gift.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="aspect-square w-full rounded-t-lg border-b object-cover sm:aspect-[4/3]"
                        src={gift.imageUrl}
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-t-lg border-b bg-muted sm:aspect-[4/3]">
                        <Gift className="size-7 text-muted-foreground" />
                      </div>
                    )}

                    <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full border border-background/80 bg-background/90 px-2 py-1 text-xs font-medium shadow-sm backdrop-blur">
                      {gift.reserved ? (
                        gift.reservedByImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={gift.reservedByName ?? "Usuario"}
                            className="size-5 shrink-0 rounded-full border object-cover"
                            src={gift.reservedByImage}
                          />
                        ) : (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted">
                            <UserRound className="size-3" />
                          </span>
                        )
                      ) : null}
                      <span className="truncate">
                        {gift.reserved ? "Reservado" : "Disponivel"}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="truncate text-sm font-medium">
                        {gift.title}
                      </h3>
                      {gift.description ? (
                        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground sm:text-sm">
                          {gift.description}
                        </p>
                      ) : null}
                    </div>

                    {gift.productUrl ? (
                      <Button
                        className="w-full text-xs sm:text-sm"
                        render={<Link href={gift.productUrl} />}
                        size="sm"
                        variant="outline"
                      >
                        Ver produto
                      </Button>
                    ) : null}

                    <span className="text-sm font-medium">
                      {price ?? "Sem preco"}
                    </span>
                  </div>
                </article>

                {gift.reserved ? (
                  gift.reservedByCurrentUser ? (
                    <form action={handleCancelGiftReservation} className="w-full">
                      <input name="giftId" type="hidden" value={gift.id} />
                      <input name="shareSlug" type="hidden" value={shareSlug} />
                      <GiftSubmitButton
                        label="Cancelar reserva"
                        pendingLabel="Cancelando..."
                        variant="destructive"
                      />
                    </form>
                  ) : (
                    <Button
                      className="h-11 w-full text-xs sm:text-sm"
                      disabled
                      size="lg"
                      variant="outline"
                    >
                      Reservado
                    </Button>
                  )
                ) : (
                  <form action={handleReserveGift} className="w-full">
                    <input name="giftId" type="hidden" value={gift.id} />
                    <input name="shareSlug" type="hidden" value={shareSlug} />
                    <GiftSubmitButton
                      label="Reservar"
                      pendingLabel="Reservando..."
                    />
                  </form>
                )}
              </div>
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
