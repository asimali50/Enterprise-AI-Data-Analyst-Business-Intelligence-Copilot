"use client";

/**
 * Theme-aware plotly chart colors.
 *
 * Plotly cannot read CSS variables, so chart chrome (font, grid, axis) is
 * resolved from the applied theme tokens at render time. Series colors use the
 * validated categorical palette from the dataviz design system (light/dark
 * selected steps), keeping charts colorblind-safe and consistent.
 */

// Validated categorical palette — 8 hues, light & dark steps.
export const CATEGORICAL_LIGHT = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

function parseHsl(hsl: string): { h: number; s: number; l: number } | null {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) =>
    ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255);
  return `rgb(${to(f(0))}, ${to(f(8))}, ${to(f(4))})`;
}

/** Read a CSS variable (e.g. --foreground) resolved for the current theme. */
export function readToken(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) return null;
  const parsed = parseHsl(value);
  return parsed ? hslToRgb(parsed) : value;
}

export interface ChartTheme {
  isDark: boolean;
  fontColor: string;
  gridColor: string;
  axisColor: string;
  paperColor: string;
  plotColor: string;
  colorway: string[];
}

export function getChartTheme(): ChartTheme {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return {
    isDark,
    fontColor: readToken("--muted-foreground") || (isDark ? "rgb(154, 160, 181)" : "rgb(92, 98, 112)"),
    gridColor: readToken("--border") || (isDark ? "rgb(35, 40, 66)" : "rgb(230, 231, 240)"),
    axisColor: readToken("--muted-foreground") || fontFallback(isDark),
    paperColor: "transparent",
    plotColor: "transparent",
    colorway: isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT,
  };
}

function fontFallback(isDark: boolean): string {
  return isDark ? "rgb(154, 160, 181)" : "rgb(92, 98, 112)";
}
