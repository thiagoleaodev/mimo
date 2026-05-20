import {
  getThemeFormDefaults,
  type EventThemeConfigInput,
} from "@/lib/event-theme";
import { cn } from "@/lib/utils";

export function EventThemePreview({
  className,
  themeConfig,
}: {
  className?: string;
  themeConfig?: EventThemeConfigInput | null;
}) {
  const theme = getThemeFormDefaults(themeConfig);
  const backgroundImage =
    theme.backgroundType === "soft-gradient"
      ? `linear-gradient(135deg, ${theme.backgroundValue} 0%, #ffffff 48%, ${theme.secondaryColor} 100%)`
      : theme.backgroundType === "dotted"
        ? `radial-gradient(${theme.secondaryColor} 1px, transparent 1px)`
        : undefined;

  return (
    <div
      aria-label={`Preview do tema ${theme.theme}`}
      className={cn(
        "relative h-14 w-full overflow-hidden rounded-lg border bg-background sm:w-20",
        className
      )}
      style={{
        backgroundColor: theme.backgroundValue,
        backgroundImage,
        backgroundSize:
          theme.backgroundType === "dotted" ? "10px 10px" : undefined,
      }}
    >
      {theme.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          src={theme.coverImageUrl}
        />
      ) : null}
      <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-md bg-background/85 p-1 shadow-sm backdrop-blur">
        <span
          className="size-3 rounded-full border"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <span
          className="size-3 rounded-full border"
          style={{ backgroundColor: theme.secondaryColor }}
        />
        <span
          className="size-3 rounded-full border"
          style={{ backgroundColor: theme.accentColor }}
        />
      </div>
    </div>
  );
}
