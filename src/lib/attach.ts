/**
 * His photo attachments: downscale + recompress client-side so a frame fits
 * chat history in localStorage as a small JPEG data URL (an object URL would
 * die with the session). A shrink ladder keeps the data URL under ~220k chars
 * so the pixels can ride the wire as xAI image_url — the image is never dropped.
 */

const MAX_DATA_URL_CHARS = 220_000

const LADDER: readonly { edge: number; quality: number }[] = [
  { edge: 512, quality: 0.72 },
  { edge: 448, quality: 0.6 },
  { edge: 384, quality: 0.5 },
]

function encodeJpeg(bitmap: ImageBitmap, edge: number, quality: number): string | null {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (ctx === null) return null
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Null when the file is not an image or decoding fails — caller falls back. */
export async function fileToCompressedDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }
  try {
    let last: string | null = null
    for (const step of LADDER) {
      const url = encodeJpeg(bitmap, step.edge, step.quality)
      if (url === null) continue
      last = url
      if (url.length <= MAX_DATA_URL_CHARS) return url
    }
    // Last rung still over the cap — send it anyway. Never drop the frame.
    return last
  } finally {
    bitmap.close()
  }
}
