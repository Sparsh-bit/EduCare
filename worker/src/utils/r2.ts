import { Env } from '../types'

// Max file size accepted for upload: 10 MB
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

/**
 * Upload a file to R2.
 * Returns the relative key (not a full URL).
 * Files are served through the Worker's authenticated /api/files/:key* route.
 * R2 buckets are private — never expose keys as public URLs.
 */
export async function uploadToR2(
  env: Env,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<string> {
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE')
  }
  if (!isAllowedMimeType(contentType)) {
    throw new Error('MIME_NOT_ALLOWED')
  }

  await env.BUCKET.put(key, data, {
    httpMetadata: { contentType },
  })

  // Return the relative key — served via /api/files/:key* in index.ts
  return key
}

/**
 * Build a namespaced R2 key for a school's file.
 * Sanitises the filename to prevent path traversal.
 */
export function buildR2Key(schoolId: number, folder: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  return `schools/${schoolId}/${folder}/${Date.now()}-${safe}`
}

/** Retrieve an object from R2. Returns null if the key doesn't exist. */
export async function getFromR2(env: Env, key: string): Promise<R2Object | null> {
  return env.BUCKET.get(key)
}

/** Delete a file from R2. */
export async function deleteFromR2(env: Env, key: string): Promise<void> {
  await env.BUCKET.delete(key)
}
