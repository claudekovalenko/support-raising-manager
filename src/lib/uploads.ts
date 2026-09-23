import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";
import { db } from "./db";

// Photos are stored on local disk in ./uploads. On hosts with ephemeral disks
// (e.g. Vercel), mount a persistent volume or swap this module for S3/R2/Supabase Storage.
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};
const MAX_BYTES = 15 * 1024 * 1024;

export async function savePhoto(file: File, opts: { caption?: string; updateId?: string } = {}) {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
  if (file.size > MAX_BYTES) throw new Error("Photo is larger than 15 MB");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const fileName = `${Date.now()}-${randomToken(8)}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()));
  return db.photo.create({
    data: { fileName, mimeType: file.type, caption: opts.caption ?? "", updateId: opts.updateId },
  });
}

export async function readPhoto(fileName: string) {
  if (!/^[\w-]+\.(jpg|png|webp|gif|heic)$/.test(fileName)) return null;
  const photo = await db.photo.findUnique({ where: { fileName } });
  if (!photo) return null;
  try {
    return { data: await readFile(path.join(UPLOAD_DIR, fileName)), mimeType: photo.mimeType };
  } catch {
    return null;
  }
}

export async function deletePhoto(id: string) {
  const photo = await db.photo.delete({ where: { id } });
  await unlink(path.join(UPLOAD_DIR, photo.fileName)).catch(() => {});
}
