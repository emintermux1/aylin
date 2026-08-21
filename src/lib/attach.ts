/**
 * His photo attachments: downscale + recompress client-side so a frame fits
 * chat history in localStorage as a small JPEG data URL (an object URL would
 * die with the session). ~512px longest edge lands around 30-90KB.
 */

const MAX_EDGE_PX = 512
const JPEG_QUALITY = 0.72

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
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (ctx === null) return null
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}
