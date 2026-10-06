import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Link as LinkIcon, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadImageToStorage, MAX_IMAGE_SIZE_BYTES } from '../../utils/imageStorage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  folder: 'devices' | 'accessories';
  label?: string;
  placeholder?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  folder,
  label,
  placeholder,
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSpanish = language === 'es';

  const normalizedUrl = value.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`
    : '';

  const handleFileSelection = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast(
        isSpanish
          ? 'Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP, etc.).'
          : 'Please select a valid image file (PNG, JPG, WebP, etc.).',
        'warning'
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showToast(
        isSpanish
          ? 'La imagen excede el límite de 5 MB. Elige una imagen más liviana.'
          : 'Image exceeds the 5 MB limit. Please choose a smaller image.',
        'warning'
      );
      return;
    }

    if (!user) {
      showToast(
        isSpanish
          ? 'Inicia sesión con Google para almacenar fotos en Firebase Storage o pega una URL directa.'
          : 'Sign in with Google to store photos in Firebase Storage, or paste a direct image URL.',
        'info'
      );
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setImgError(false);

      const downloadUrl = await uploadImageToStorage(
        file,
        folder,
        language as 'es' | 'en',
        (pct) => setUploadProgress(pct)
      );

      onChange(downloadUrl);
      showToast(
        isSpanish ? '¡Foto subida y optimizada con éxito!' : 'Photo uploaded and optimized successfully!',
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || (isSpanish ? 'Error al subir la imagen' : 'Failed to upload image'), 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      {/* Label and mode toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
          {label || (isSpanish ? 'Imagen / Foto' : 'Image / Photo')}
        </label>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#202024] p-0.5 rounded-lg border border-slate-200 dark:border-[#2b2b30] text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-[#2d2d33] text-purple-600 dark:text-purple-300 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-[#a1a1aa] dark:hover:text-[#f4f4f5]'
            }`}
          >
            <span className="flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>{isSpanish ? 'Subir Foto' : 'Upload File'}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white dark:bg-[#2d2d33] text-purple-600 dark:text-purple-300 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-[#a1a1aa] dark:hover:text-[#f4f4f5]'
            }`}
          >
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              <span>{isSpanish ? 'Enlace URL' : 'Image URL'}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/avif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
          }
        }}
      />

      {/* Tab: Direct Upload / Dropzone */}
      {activeTab === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              if (!isUploading && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
              isDragging
                ? 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 scale-[0.99]'
                : 'border-slate-300 dark:border-[#333338] hover:border-purple-400 dark:hover:border-purple-500/80 bg-slate-50/50 dark:bg-[#202024]/50'
            } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  {isSpanish ? `Optimizando y subiendo (${uploadProgress}%)...` : `Optimizing & uploading (${uploadProgress}%)...`}
                </span>
                <div className="w-44 h-1.5 bg-slate-200 dark:bg-[#333338] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-150 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center py-1">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-[#f4f4f5]">
                  {isSpanish ? 'Haz clic para seleccionar o arrastra una foto' : 'Click to select or drag a photo here'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#a1a1aa] flex items-center gap-1.5">
                  <span>PNG, JPG, WebP</span>
                  <span>•</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {isSpanish ? 'Máx. 5 MB (Auto-optimizado)' : 'Max 5 MB (Auto-optimized)'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: URL Input */}
      {activeTab === 'url' && (
        <div className="relative">
          <ImageIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#71717a]" />
          <input
            type="text"
            maxLength={500}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setImgError(false);
            }}
            placeholder={placeholder || (isSpanish ? 'https://ejemplo.com/foto.jpg' : 'https://example.com/photo.jpg')}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      )}

      {/* Preview with thumbnail and remove button */}
      {normalizedUrl && (
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/70 dark:bg-[#202024]/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 dark:border-[#333338] shrink-0">
              <img
                src={normalizedUrl}
                alt="Preview"
                onError={() => setImgError(true)}
                onLoad={() => setImgError(false)}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {imgError ? (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{isSpanish ? 'No se pudo cargar la vista previa' : 'Could not load preview'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{isSpanish ? 'Imagen vinculada correctamente' : 'Image linked successfully'}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-xs font-mono">
                {normalizedUrl.startsWith('data:')
                  ? (isSpanish ? 'Imagen local en memoria' : 'Local data image')
                  : normalizedUrl}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setImgError(false);
            }}
            className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isSpanish ? 'Quitar imagen' : 'Remove image'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
