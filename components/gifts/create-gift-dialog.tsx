"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { Gift, Loader2, Plus, WandSparkles } from "lucide-react";

import {
  createGift,
  extractProduct,
  type CreateGiftState,
  type ExtractProductState,
} from "@/app/events/[eventId]/gifts/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const initialState: CreateGiftState = {};
type ExtractStore = "mercado_livre" | "amazon";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function useCreateGiftAction() {
  const [state, formAction, isPending] = useActionState(
    createGift,
    initialState
  );

  return { formAction, isPending, state };
}

export function CreateGiftDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [extractState, setExtractState] = useState<ExtractProductState | null>(
    null
  );
  const [extractProductUrl, setExtractProductUrl] = useState("");
  const [extractStore, setExtractStore] =
    useState<ExtractStore>("mercado_livre");
  const [isExtracting, setIsExtracting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { formAction, isPending, state } = useCreateGiftAction();

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  function setFormValue(name: string, value?: string) {
    if (!value || !formRef.current) {
      return;
    }

    const field = formRef.current.elements.namedItem(name);

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  }

  function handleExtractProduct() {
    const formData = new FormData();
    formData.set("store", extractStore);
    formData.set("productUrl", extractProductUrl);
    setExtractState(null);
    setIsExtracting(true);

    void (async () => {
      try {
        const result = await extractProduct(formData);
        setExtractState(result);

        if (result.success && result.data) {
          setFormValue("title", result.data.title);
          setFormValue("price", result.data.price);
          setFormValue("productUrl", result.data.productUrl);
          setFormValue("imageUrl", result.data.imageUrl);
        }
      } finally {
        setIsExtracting(false);
      }
    })();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Adicionar presente
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-4" />
            Novo presente
          </DialogTitle>
          <DialogDescription>
            Adicione uma sugestao para os convidados reservarem.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} />

          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                <WandSparkles className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">Extrair produto</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Escolha a loja e cole o link para preencher os campos.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="grid gap-2">
                <Label htmlFor="gift-extract-store">Loja</Label>
                <select
                  className={cn(
                    "h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  )}
                  id="gift-extract-store"
                  onChange={(event) =>
                    setExtractStore(event.target.value as ExtractStore)
                  }
                  value={extractStore}
                >
                  <option value="mercado_livre">Mercado Livre</option>
                  <option value="amazon">Amazon</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gift-extract-url">Link do produto</Label>
                <Input
                  aria-invalid={Boolean(extractState?.errors?.productUrl)}
                  id="gift-extract-url"
                  onChange={(event) => setExtractProductUrl(event.target.value)}
                  placeholder={
                    extractStore === "amazon"
                      ? "https://www.amazon.com.br/dp/..."
                      : "https://www.mercadolivre.com.br/produto"
                  }
                  type="url"
                  value={extractProductUrl}
                />
                <FieldError message={extractState?.errors?.productUrl} />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {extractState?.message ? (
                <p
                  className={
                    extractState.success
                      ? "text-xs text-emerald-700 dark:text-emerald-300"
                      : "text-xs text-destructive"
                  }
                >
                  {extractState.message}
                </p>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Os dados extraidos podem ser ajustados antes de salvar.
                </span>
              )}
              <Button
                disabled={isExtracting}
                onClick={handleExtractProduct}
                type="button"
                variant="outline"
              >
                {isExtracting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <WandSparkles />
                )}
                Extrair
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-title">Nome do presente</Label>
            <Input
              aria-invalid={Boolean(state.errors?.title)}
              autoComplete="off"
              id="gift-title"
              name="title"
              placeholder="Jogo de panelas"
              required
            />
            <FieldError message={state.errors?.title} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-description">Descricao</Label>
            <Textarea
              aria-invalid={Boolean(state.errors?.description)}
              id="gift-description"
              maxLength={500}
              name="description"
              placeholder="Tamanho, cor, modelo ou observacoes importantes."
              rows={3}
            />
            <FieldError message={state.errors?.description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gift-price">Preco estimado</Label>
              <Input
                aria-invalid={Boolean(state.errors?.price)}
                id="gift-price"
                inputMode="decimal"
                name="price"
                placeholder="129,90"
              />
              <FieldError message={state.errors?.price} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gift-product-url">Link do produto</Label>
              <Input
                aria-invalid={Boolean(state.errors?.productUrl)}
                id="gift-product-url"
                name="productUrl"
                placeholder="Mercado Livre ou Amazon"
                type="url"
              />
              <FieldError message={state.errors?.productUrl} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gift-image-url">Imagem</Label>
            <Input
              aria-invalid={Boolean(state.errors?.imageUrl)}
              id="gift-image-url"
              name="imageUrl"
              placeholder="https://loja.com/imagem.jpg"
              type="url"
            />
            <FieldError message={state.errors?.imageUrl} />
          </div>

          {state.message && !state.success ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          {state.message && state.success ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {state.message}
            </p>
          ) : null}

          <DialogFooter className="mt-2">
            <Button disabled={isPending} type="submit">
              {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              Adicionar presente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
