import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  userId?: string;
  entityType?: 'devices' | 'accessories';
  entityName?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  userId,
  entityType = 'devices',
  entityName,
}) => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCloudinaryUrl = value.includes('res.cloudinary.com');

  const normalizedImageUrl = value.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`
    : '';

  const handleFileProcess = async (file: File) => {
    if (!userId || userId === 'anonymous') {
      showToast(
        language === 'es'
          ? 'Para subir fotos a la nube debes iniciar sesión con Google. Como invitado, puedes pegar enlaces en la pestaña "URL".'
          : 'Please sign in with Google to upload images to the cloud. As a guest, you can paste links in the "URL" tab.',
        'info'
      );
      setMode('url');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast(
        language === 'es'
          ? 'Por favor selecciona un archivo de imagen (PNG, JPG, WebP, etc.).'
          : 'Please select an image file (PNG, JPG, WebP, etc.).',
        'warning'
      );
      return;
    }

    // Limit to 6MB client-side check
    if (file.size > 6 * 1024 * 1024) {
      showToast(
        language === 'es'
          ? 'La imagen es muy pesada (máximo 6 MB).'
          : 'The image is too large (maximum 6 MB).',
        'warning'
      );
      return;
    }

    try {
      setIsUploading(true);

      // Convert to base64 data URI
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/cloudinary/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          userId,
          entityType,
          language,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        if (response.status === 429) {
          // If quota or rate limit exceeded, advise URL mode
          setMode('url');
        }
        throw new Error(
          errJson?.message ||
            (language === 'es'
              ? 'Error al subir a Cloudinary. Verifica las credenciales en Render.'
              : 'Failed to upload to Cloudinary. Check credentials in Render.')
        );
      }

      const json = await response.json();
      if (!json.success || !json.url) {
        throw new Error('Upload succeeded but no URL returned');
      }

      onChange(json.url);
      setImgError(false);
      showToast(t('imageUploadSuccess'), 'success');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      showToast(err?.message || t('imageUploadError'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setImgError(false);
  };

  return (
    <div className="space-y-2">
      {/* Label and mode toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
          {t('imageUploadTitle')}
        </label>
        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-[#202024] p-0.5 rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              mode === 'upload'
                ? 'bg-white dark:bg-[#2a2a30] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {language === 'es' ? 'Archivo' : 'File'}
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all ${
              mode === 'url'
                ? 'bg-white dark:bg-[#2a2a30] text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            URL
          </button>
        </div>
      </div>

      {/* Input area */}
      {mode === 'upload' ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-3.5 text-center transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-300 dark:border-[#33333a] hover:border-purple-400 dark:hover:border-purple-500/70 bg-slate-50/50 dark:bg-[#1a1a1e]/60'
            } ${isUploading ? 'opacity-70 cursor-wait' : ''}`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {t('imageUploading')}
                  </p>
                </>
              ) : (
                <>
                  <div className="p-2 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('imageUploadFileBtn')}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {t('imageDropzoneHint')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#71717a]" />
          <input
            type="text"
            maxLength={500}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setImgError(false);
            }}
            placeholder={t('deviceFieldImageUrlPlaceholder')}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      )}

      {/* Live Preview card */}
      {normalizedImageUrl && (
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#1f1f23]/70">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 dark:border-[#333338] shrink-0">
              <img
                src={normalizedImageUrl}
                alt={entityName || 'Preview'}
                className={`w-full h-full object-cover transition-opacity ${
                  imgError ? 'opacity-20' : 'opacity-100'
                }`}
                onError={() => setImgError(true)}
              />
            </div>

            <div className="flex-1 min-w-0">
              {imgError ? (
                <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">{t('deviceImgLoadError')}</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {isCloudinaryUrl ? 'Cloudinary (WebP CDN)' : 'URL Directa'}
                    </span>
                    {isCloudinaryUrl && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md font-mono font-medium">
                        CDN
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-mono">
                    {normalizedImageUrl}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
              title={t('imageRemove')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
