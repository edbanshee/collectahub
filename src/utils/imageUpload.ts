import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase/config';

// Maximum allowed raw upload size before client compression: 5 MB
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 5;

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file type and initial size.
 */
export function validateImageFile(file: File, language: 'es' | 'en' = 'es'): ValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error:
        language === 'es'
          ? 'Formato no compatible. Usa JPG, PNG, WEBP o GIF.'
          : 'Unsupported format. Please use JPG, PNG, WEBP, or GIF.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error:
        language === 'es'
          ? `La imagen excede el límite permitido de ${MAX_FILE_SIZE_MB}MB.`
          : `Image exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Scales down large camera photos (e.g., 4000x3000 -> max 1600px)
 * and outputs an optimized WebP blob (reducing file size by up to 90%).
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<Blob> {
  // If it's a GIF, do not compress via canvas to preserve animation frames
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG if browser doesn't support WebP canvas export
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              canvas.toBlob(
                (jpegBlob) => resolve(jpegBlob || file),
                'image/jpeg',
                quality
              );
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a compressed image to Firebase Storage and returns the public download URL.
 */
export async function uploadImageToStorage(
  file: File,
  folder: 'devices' | 'accessories' = 'devices',
  onProgress?: (percent: number) => void,
  language: 'es' | 'en' = 'es'
): Promise<string> {
  const validation = validateImageFile(file, language);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Compress image before upload to conserve storage & bandwidth quotas
  const compressedBlob = await compressImage(file);

  const currentUser = auth.currentUser;
  const userId = currentUser ? currentUser.uid : 'public';
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `users/${userId}/${folder}/${timestamp}_${cleanName}`;

  const storageRef = ref(storage, path);
  const metadata = {
    contentType: compressedBlob.type || 'image/webp',
  };

  const uploadTask = uploadBytesResumable(storageRef, compressedBlob, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error: any) => {
        console.error('Firebase Storage upload error:', error);
        // Translate Firebase storage error codes to friendly explanations
        const code = error?.code || '';
        if (code === 'storage/quota-exceeded') {
          reject(
            new Error(
              language === 'es'
                ? 'Límite de almacenamiento gratuito de Firebase alcanzado. Puedes ingresar una URL externa en su lugar.'
                : 'Firebase free storage quota exceeded. You can use an external image URL instead.'
            )
          );
        } else if (code === 'storage/unauthorized') {
          reject(
            new Error(
              language === 'es'
                ? 'Permiso denegado para subir imágenes. Inicia sesión con Google para almacenar fotos en tu cuenta.'
                : 'Permission denied. Please sign in with Google to store images in your account.'
            )
          );
        } else if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') {
          reject(
            new Error(
              language === 'es'
                ? 'La subida tardó demasiado o fue cancelada. Revisa tu conexión a internet.'
                : 'Upload timed out or was cancelled. Check your network connection.'
            )
          );
        } else {
          reject(
            new Error(
              language === 'es'
                ? `Error al subir la imagen (${code || 'Storage'}). Puedes ingresar una URL directa.`
                : `Failed to upload image (${code || 'Storage'}). You can use a direct image URL.`
            )
          );
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(err);
        }
      }
    );
  });
}
