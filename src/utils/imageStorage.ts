import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../firebase/config';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_DIMENSION = 1280; // Max width/height in px
export const COMPRESSION_QUALITY = 0.85; // High visual quality with ~90% file size reduction

export interface CompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compresses an image in the browser using HTML5 Canvas.
 * Resizes down to MAX_IMAGE_DIMENSION while keeping aspect ratio and converts to WebP.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('La imagen excede el límite máximo de 5 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no compatible.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
            height = MAX_IMAGE_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el procesador de imágenes.'));
        }

        // Draw image with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fallback to JPEG if browser doesn't support WebP export
        const exportFormat = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Error al comprimir la imagen.'));
            }
            const dataUrl = canvas.toDataURL(exportFormat, COMPRESSION_QUALITY);
            resolve({
              blob,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          exportFormat,
          COMPRESSION_QUALITY
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a compressed image to Firebase Storage under the current authenticated user's path:
 * users/{userId}/{folder}/{timestamp}_{random}.webp
 *
 * If not logged in or storage quota is exhausted, handles error gracefully.
 */
export async function uploadImageToStorage(
  file: File,
  folder: 'devices' | 'accessories',
  language: 'es' | 'en' = 'es',
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error(
      language === 'es'
        ? 'Debes iniciar sesión con Google para subir imágenes a Firebase Storage.'
        : 'Please sign in with Google to upload images to Firebase Storage.'
    );
  }

  // 1. Validate & Compress locally
  const { blob } = await compressImage(file);

  // 2. Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const path = `users/${currentUser.uid}/${folder}/${timestamp}_${randomSuffix}.webp`;
  const storageRef = ref(storage, path);

  // 3. Upload with resumable task
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/webp',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error: any) => {
        console.error('Firebase Storage upload error:', error);
        if (error.code === 'storage/quota-exceeded') {
          reject(
            new Error(
              language === 'es'
                ? 'Se ha alcanzado el límite de almacenamiento gratuito de Firebase Storage (5 GB). Puedes ingresar una URL de imagen externa mientras tanto.'
                : 'Firebase Storage free tier quota reached (5 GB). You can use an external image URL in the meantime.'
            )
          );
        } else if (error.code === 'storage/unauthorized') {
          reject(
            new Error(
              language === 'es'
                ? 'Permiso denegado por las reglas de Firebase Storage. Verifica que hayas iniciado sesión.'
                : 'Permission denied by Firebase Storage rules. Please ensure you are signed in.'
            )
          );
        } else {
          reject(
            new Error(
              language === 'es'
                ? `Error al subir la imagen: ${error.message || 'Error de red'}`
                : `Failed to upload image: ${error.message || 'Network error'}`
            )
          );
        }
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Error al obtener URL de descarga.'));
        }
      }
    );
  });
}
