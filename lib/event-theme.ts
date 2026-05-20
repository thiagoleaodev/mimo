import type { CSSProperties } from "react";

import type { EventThemeConfig } from "@/services/generated/prisma/client";

export const eventThemeOptions = [
  {
    accentColor: "#f59e0b",
    label: "Minimal",
    primaryColor: "#18181b",
    secondaryColor: "#f4f4f5",
    value: "minimal",
  },
  {
    accentColor: "#d946ef",
    label: "Festivo",
    primaryColor: "#7c3aed",
    secondaryColor: "#f5d0fe",
    value: "festive",
  },
  {
    accentColor: "#14b8a6",
    label: "Natural",
    primaryColor: "#166534",
    secondaryColor: "#dcfce7",
    value: "natural",
  },
  {
    accentColor: "#fb7185",
    label: "Elegante",
    primaryColor: "#9f1239",
    secondaryColor: "#ffe4e6",
    value: "elegant",
  },
] as const;

export const backgroundTypeOptions = [
  { label: "Claro", value: "solid" },
  { label: "Gradiente suave", value: "soft-gradient" },
  { label: "Pontilhado", value: "dotted" },
] as const;

export type EventThemeOption = (typeof eventThemeOptions)[number]["value"];
export type BackgroundTypeOption =
  (typeof backgroundTypeOptions)[number]["value"];

export type EventThemeConfigInput = Pick<
  EventThemeConfig,
  | "accentColor"
  | "backgroundType"
  | "backgroundValue"
  | "coverImageUrl"
  | "primaryColor"
  | "secondaryColor"
  | "theme"
>;

export const defaultEventTheme = eventThemeOptions[0];

export function getThemePreset(theme?: string | null) {
  return (
    eventThemeOptions.find((option) => option.value === theme) ??
    defaultEventTheme
  );
}

export function getThemeFormDefaults(themeConfig?: EventThemeConfigInput | null) {
  const preset = getThemePreset(themeConfig?.theme);

  return {
    accentColor: themeConfig?.accentColor ?? preset.accentColor,
    backgroundType: themeConfig?.backgroundType ?? "solid",
    backgroundValue: themeConfig?.backgroundValue ?? "#ffffff",
    coverImageUrl: themeConfig?.coverImageUrl ?? "",
    primaryColor: themeConfig?.primaryColor ?? preset.primaryColor,
    secondaryColor: themeConfig?.secondaryColor ?? preset.secondaryColor,
    theme: preset.value,
  };
}

function getReadableForeground(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.6 ? "#18181b" : "#ffffff";
}

export function getEventThemeStyles(
  themeConfig?: EventThemeConfigInput | null
): CSSProperties {
  const theme = getThemeFormDefaults(themeConfig);
  const backgroundValue = theme.backgroundValue || "#ffffff";
  const backgroundImage =
    theme.backgroundType === "soft-gradient"
      ? `linear-gradient(135deg, ${backgroundValue} 0%, #ffffff 48%, ${theme.secondaryColor} 100%)`
      : theme.backgroundType === "dotted"
        ? `radial-gradient(${theme.secondaryColor} 1px, transparent 1px)`
        : undefined;

  return {
    "--accent": theme.accentColor,
    "--accent-foreground": getReadableForeground(theme.accentColor),
    "--primary": theme.primaryColor,
    "--primary-foreground": getReadableForeground(theme.primaryColor),
    "--ring": theme.accentColor,
    "--secondary": theme.secondaryColor,
    "--secondary-foreground": getReadableForeground(theme.secondaryColor),
    backgroundColor:
      theme.backgroundType === "solid" ? backgroundValue : undefined,
    backgroundImage,
    backgroundSize: theme.backgroundType === "dotted" ? "18px 18px" : undefined,
  } as CSSProperties;
}
