/**
 * Cloudinary helper utilities for public_id extraction and automatic deletion.
 */

export function extractCloudinaryPublicId(url?: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  const path = parts[1];

  // Filter out version numbers (v123456) and transformation segments (w_120,c_limit, etc.)
  const segments = path.split('/');
  const cleanSegments = segments.filter(
    (s) => !s.match(/^v\d+$/) && !s.includes(',')
  );

  const fullPath = cleanSegments.join('/');
  // Strip file extension (.webp, .jpg, .png, etc.)
  return fullPath.replace(/\.[a-zA-Z0-9]+$/, '');
}

export async function deleteCloudinaryImage(url?: string, userId?: string): Promise<boolean> {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return false;

  const apiBase = import.meta.env.VITE_API_URL || '';
  try {
    const res = await fetch(`${apiBase}/api/cloudinary/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId, userId }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete image from Cloudinary:', err);
    return false;
  }
}
