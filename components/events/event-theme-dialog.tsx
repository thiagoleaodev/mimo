"use client";

import { useActionState, useRef, useState } from "react";
import { ImageIcon, Loader2, Palette, Save } from "lucide-react";

import {
  updateEventTheme,
  type UpdateEventThemeState,
} from "@/app/events/actions";
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
import {
  backgroundTypeOptions,
  eventThemeOptions,
  getThemeFormDefaults,
  getThemePreset,
  type EventThemeConfigInput,
} from "@/lib/event-theme";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const initialState: UpdateEventThemeState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function useUpdateEventThemeAction() {
  const [state, formAction, isPending] = useActionState(
    updateEventTheme,
    initialState
  );

  return { formAction, isPending, state };
}

export function EventThemeDialog({
  eventId,
  themeConfig,
}: {
  eventId: string;
  themeConfig?: EventThemeConfigInput | null;
}) {
  const defaults = getThemeFormDefaults(themeConfig);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(defaults.coverImageUrl);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(defaults.theme);
  const { formAction, isPending, state } = useUpdateEventThemeAction();

  async function uploadCoverImage(file: File) {
    setCoverUploadError(null);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      setCoverUploadError("Escolha uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCoverUploadError("Use uma imagem de ate 5 MB.");
      return;
    }

    setIsUploadingCover(true);

    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filePath = `${eventId}/cover-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("events")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        setCoverUploadError(
          "Nao foi possivel enviar a imagem. Verifique as permissoes do bucket events."
        );
        return;
      }

      const { data } = supabase.storage.from("events").getPublicUrl(filePath);
      setCoverImageUrl(data.publicUrl);
    } finally {
      setIsUploadingCover(false);
    }
  }

  function applyThemePreset(theme: string) {
    const preset = getThemePreset(theme);
    setSelectedTheme(preset.value);

    if (!formRef.current) {
      return;
    }

    const values = {
      accentColor: preset.accentColor,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
    };

    for (const [name, value] of Object.entries(values)) {
      const field = formRef.current.elements.namedItem(name);

      if (field instanceof HTMLInputElement) {
        field.value = value;
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Palette />
        Identidade visual
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Identidade visual
          </DialogTitle>
          <DialogDescription>
            Personalize a pagina publica que os convidados vao acessar.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="coverImageUrl" type="hidden" value={coverImageUrl} />

          <div className="grid gap-2">
            <Label htmlFor="event-theme">Tema</Label>
            <select
              aria-invalid={Boolean(state.errors?.theme)}
              className={cn(
                "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
              )}
              id="event-theme"
              name="theme"
              onChange={(event) => applyThemePreset(event.target.value)}
              value={selectedTheme}
            >
              {eventThemeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError message={state.errors?.theme} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {eventThemeOptions.map((option) => (
              <button
                className={cn(
                  "grid gap-2 rounded-lg border p-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedTheme === option.value && "border-primary bg-muted"
                )}
                key={option.value}
                onClick={() => applyThemePreset(option.value)}
                type="button"
              >
                <span className="flex gap-1">
                  <span
                    className="size-5 rounded-full border"
                    style={{ backgroundColor: option.primaryColor }}
                  />
                  <span
                    className="size-5 rounded-full border"
                    style={{ backgroundColor: option.secondaryColor }}
                  />
                  <span
                    className="size-5 rounded-full border"
                    style={{ backgroundColor: option.accentColor }}
                  />
                </span>
                <span className="truncate font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Principal</Label>
              <Input
                aria-invalid={Boolean(state.errors?.primaryColor)}
                defaultValue={defaults.primaryColor}
                id="primaryColor"
                name="primaryColor"
                type="color"
              />
              <FieldError message={state.errors?.primaryColor} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondaryColor">Secundaria</Label>
              <Input
                aria-invalid={Boolean(state.errors?.secondaryColor)}
                defaultValue={defaults.secondaryColor}
                id="secondaryColor"
                name="secondaryColor"
                type="color"
              />
              <FieldError message={state.errors?.secondaryColor} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accentColor">Destaque</Label>
              <Input
                aria-invalid={Boolean(state.errors?.accentColor)}
                defaultValue={defaults.accentColor}
                id="accentColor"
                name="accentColor"
                type="color"
              />
              <FieldError message={state.errors?.accentColor} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="coverImageFile">Imagem de capa</Label>
            {coverImageUrl ? (
              <div className="overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="aspect-[16/7] w-full object-cover"
                  src={coverImageUrl}
                />
              </div>
            ) : null}
            <div className="relative">
              <ImageIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                accept="image/*"
                aria-invalid={Boolean(
                  state.errors?.coverImageUrl ?? coverUploadError
                )}
                className="pl-9"
                disabled={isUploadingCover}
                id="coverImageFile"
                onChange={(event) => {
                  const [file] = Array.from(event.target.files ?? []);

                  if (file) {
                    void uploadCoverImage(file);
                  }
                }}
                type="file"
              />
            </div>
            {isUploadingCover ? (
              <p className="text-xs text-muted-foreground">
                Enviando imagem para o bucket events...
              </p>
            ) : null}
            {coverImageUrl ? (
              <Button
                className="w-fit"
                onClick={() => {
                  setCoverImageUrl("");
                  setCoverUploadError(null);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Remover capa
              </Button>
            ) : null}
            <FieldError message={coverUploadError ?? state.errors?.coverImageUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="grid gap-2">
              <Label htmlFor="backgroundType">Background</Label>
              <select
                aria-invalid={Boolean(state.errors?.backgroundType)}
                className={cn(
                  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
                )}
                defaultValue={defaults.backgroundType}
                id="backgroundType"
                name="backgroundType"
              >
                {backgroundTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors?.backgroundType} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="backgroundValue">Cor base</Label>
              <Input
                aria-invalid={Boolean(state.errors?.backgroundValue)}
                defaultValue={defaults.backgroundValue}
                id="backgroundValue"
                name="backgroundValue"
                type="color"
              />
              <FieldError message={state.errors?.backgroundValue} />
            </div>
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
            <Button disabled={isPending || isUploadingCover} type="submit">
              {isPending || isUploadingCover ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              Salvar identidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
