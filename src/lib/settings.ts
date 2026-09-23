import { cache } from "react";
import { db } from "./db";

export type FocusArea = { title: string; description: string };

export type SiteSettings = {
  siteName: string;
  tagline: string;
  heroText: string;
  mission: string;
  vision: string;
  familyBio: string;
  focusAreas: FocusArea[];
  monthlyGoalCents: number;
  givingInstructions: string;
  contactEmail: string;
  signalGroupLink: string;
  heroPhotoId: string;
  familyPhotoId: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "The Kovalenkos on Mission",
  tagline: "Serving together, sent by you.",
  heroText:
    "We're a family following God's call. Your prayers and partnership make this work possible — thank you for being part of the team.",
  mission:
    "Write your mission here: what you do, who you serve, and why it matters. Keep it to two or three sentences.",
  vision:
    "Write your vision here: the change you're praying and working toward over the next few years.",
  familyBio:
    "Introduce your family here — who you are, how you got here, and what a normal week looks like.",
  focusAreas: [
    { title: "Focus area one", description: "Describe the first area of work you're investing in." },
    { title: "Focus area two", description: "Describe the second area of work." },
    { title: "Focus area three", description: "Describe the third area of work." },
  ],
  monthlyGoalCents: 500000,
  givingInstructions:
    "Prefer to give by check or bank transfer? Add those instructions here (who to make checks payable to, mailing address, Zelle, etc.).",
  contactEmail: "",
  signalGroupLink: "",
  heroPhotoId: "",
  familyPhotoId: "",
};

const JSON_KEYS = new Set<keyof SiteSettings>(["focusAreas", "monthlyGoalCents"]);

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await db.setting.findMany();
  const settings: SiteSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = row.key as keyof SiteSettings;
    if (!(key in DEFAULT_SETTINGS)) continue;
    try {
      (settings as Record<string, unknown>)[key] = JSON_KEYS.has(key) ? JSON.parse(row.value) : row.value;
    } catch {
      // keep default on malformed value
    }
  }
  return settings;
});

export async function saveSettings(values: Partial<SiteSettings>) {
  await db.$transaction(
    Object.entries(values).map(([key, value]) => {
      const stored = JSON_KEYS.has(key as keyof SiteSettings) ? JSON.stringify(value) : String(value ?? "");
      return db.setting.upsert({ where: { key }, create: { key, value: stored }, update: { value: stored } });
    }),
  );
}
