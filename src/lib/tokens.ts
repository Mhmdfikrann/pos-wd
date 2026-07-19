/**
 * Wanna Dimsum design tokens (PRD 17.2).
 * Central palette so every screen ports the mockups with identical values.
 */
export const tokens = {
  primary: "#A91F34",
  primaryDark: "#7F1628",
  accent: "#FFD84D",
  cream: "#FFF4D6",
  canvas: "#FFF9F2",
  ink: "#2D2022",
  success: "#2E9D64",
  warning: "#E99A22",
  danger: "#D64545",
  /** Owner "Business Suite" surfaces use a cooler grey background. */
  suite: "#F5F6F8",
  suiteInk: "#23201F",
} as const;

/** Tonal pairs [background, foreground] used by status badges across screens. */
export const tones = {
  ok: ["#E4F4EC", "#238152"],
  low: ["#FCEEDB", "#C67A15"],
  warn: ["#FCEEDB", "#C67A15"],
  out: ["#EFEAEA", "#5A4B4D"],
  info: ["#EEF2FB", "#3A5BB0"],
  danger: ["#FBE7E7", "#B83636"],
  neutral: ["#F1EEEA", "#5A4B4D"],
  gold: ["#FFF4D6", "#A9791F"],
} as const;

export type Tone = keyof typeof tones;
