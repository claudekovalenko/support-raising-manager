"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { parseDollars } from "@/lib/money";
import { getSettings, saveSettings, type FocusArea } from "@/lib/settings";
import { deletePhoto, savePhoto } from "@/lib/uploads";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  const current = await getSettings();

  const focusAreas: FocusArea[] = [];
  for (let i = 0; i < 6; i++) {
    const title = str(formData, `focusTitle${i}`);
    const description = str(formData, `focusDesc${i}`);
    if (title) focusAreas.push({ title, description });
  }

  const photoIds: Record<"heroPhotoId" | "familyPhotoId", string> = {
    heroPhotoId: current.heroPhotoId,
    familyPhotoId: current.familyPhotoId,
  };
  for (const [field, key] of [["heroPhoto", "heroPhotoId"], ["familyPhoto", "familyPhotoId"]] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      try {
        const photo = await savePhoto(file, { caption: field === "heroPhoto" ? "" : "Our family" });
        if (photoIds[key]) await deletePhoto(photoIds[key]).catch(() => {});
        photoIds[key] = photo.id;
      } catch (err) {
        redirect(`/admin/settings?error=${encodeURIComponent((err as Error).message)}`);
      }
    } else if (formData.get(`remove_${field}`) === "on" && photoIds[key]) {
      await deletePhoto(photoIds[key]).catch(() => {});
      photoIds[key] = "";
    }
  }

  const signal = str(formData, "signalGroupLink");
  await saveSettings({
    siteName: str(formData, "siteName") || current.siteName,
    tagline: str(formData, "tagline"),
    heroText: str(formData, "heroText"),
    mission: str(formData, "mission"),
    vision: str(formData, "vision"),
    familyBio: str(formData, "familyBio"),
    focusAreas,
    monthlyGoalCents: parseDollars(formData.get("monthlyGoal")) ?? current.monthlyGoalCents,
    givingInstructions: str(formData, "givingInstructions"),
    contactEmail: str(formData, "contactEmail"),
    signalGroupLink: /^https:\/\//.test(signal) ? signal : "",
    ...photoIds,
  });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
