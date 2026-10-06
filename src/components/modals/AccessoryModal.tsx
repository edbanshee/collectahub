import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Sparkles,
  Image,
  Tag,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Accessory } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_ACCESSORY_CATEGORIES } from '../../data/initialData';
import { StarRatingInput } from '../common/StarRatingInput';
import { getSafeRating } from '../../utils/ratingColors';

interface AccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessoryToEdit?: Accessory | null;
  preselectedDeviceName?: string;
}

export const AccessoryModal: React.FC<AccessoryModalProps> = ({
  isOpen,
  onClose,
  accessoryToEdit,
  preselectedDeviceName,
}) => {
  const { devices, accessories, settings, saveAccessory, addOption } = useStorage();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [device, setDevice] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Available categories merged from settings + existing accessories
  const availableCategories = useMemo(() => {
    const list = Array.isArray(settings.accessoryCategories)
      ? settings.accessoryCategories
      : [];
    return Array.from(new Set([...list, ...accessories.map((a) => a.category), category].filter(Boolean)));
  }, [settings.accessoryCategories, accessories, category]);

  const hasInitializedRef = useRef(false);
  const lastEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      lastEditIdRef.current = null;
      return;
    }

    const currentEditId = accessoryToEdit?.id || null;
    if (hasInitializedRef.current && lastEditIdRef.current === currentEditId) {
      // Form already initialized for this modal session; keep user input intact
      return;
    }

    hasInitializedRef.current = true;
    lastEditIdRef.current = currentEditId;

    if (accessoryToEdit) {
      setName(accessoryToEdit.name);
      setCategory(accessoryToEdit.category || availableCategories[0] || 'Fundas');
      setDevice(accessoryToEdit.device || '');
      setRating(getSafeRating(accessoryToEdit.rating, 5));
      setDescription(accessoryToEdit.description || '');
      setTags(accessoryToEdit.tags || []);
      setImageUrl(accessoryToEdit.imageUrl || '');
      setImgError(false);
    } else {
      setName('');
      setCategory(availableCategories[0] || 'Fundas');
      setDevice(preselectedDeviceName || '');
      setRating(5);
      setDescription('');
      setTags([]);
      setImageUrl('');
      setImgError(false);
    }
    setIsAddingNewCat(false);
    setNewCatName('');
    setTagInput('');
  }, [isOpen, accessoryToEdit, preselectedDeviceName, availableCategories]);

  if (!isOpen) return null;

  const handleAddNewCategory = async () => {
    const clean = newCatName.trim();
    if (!clean) return;
    try {
      await addOption('accessoryCategory', clean);
      setCategory(clean);
      setNewCatName('');
      setIsAddingNewCat(false);
      showToast(`Categoría "${clean}" añadida.`, 'success');
    } catch {
      showToast('Error al añadir categoría', 'error');
    }
  };

  const handleAiAutofill = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast(t('aiSuggestPromptAccessoryName'), 'warning');
      return;
    }

    try {
      setIsAiLoading(true);
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/gemini/suggest-accessory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          availableCategories,
          language,
        }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            language === 'es'
              ? 'Backend no encontrado (GitHub Pages es estático). Despliega el backend en Vercel o Render para habilitar la IA.'
              : 'Backend not found (GitHub Pages is static). Deploy the backend to Vercel or Render to enable AI.'
          );
        }
        throw new Error('API request failed');
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error('No suggestions found');
      }

      const d = json.data;
      if (d.category) {
        const match = availableCategories.find(
          (c) => c.toLowerCase() === d.category.toLowerCase()
        );
        if (match) {
          setCategory(match);
        } else if (d.category.trim()) {
          try {
            await addOption('accessoryCategory', d.category.trim());
            setCategory(d.category.trim());
          } catch {
            // keep existing category
          }
        }
      }

      if (d.description) {
        setDescription(d.description.slice(0, 300));
      }

      if (Array.isArray(d.tags) && d.tags.length > 0) {
        const mergedTags = Array.from(
          new Set([...tags, ...d.tags.map((t: string) => String(t).trim().toLowerCase())].filter(Boolean))
        );
        setTags(mergedTags);
      }

      showToast(t('aiSuggestSuccessAccessory'), 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t('aiSuggestError'), 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tg) => tg !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast('Por favor escribe el nombre del accesorio.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveAccessory({
        id: accessoryToEdit ? accessoryToEdit.id : undefined,
        name: cleanName,
        category: category.trim() || 'Fundas',
        device: device.trim() || undefined,
        rating: getSafeRating(rating, 5),
        description: description.trim(),
        tags,
        imageUrl: imageUrl.trim() || undefined,
      });

      showToast(t('toastAccessorySaved'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Error al guardar accesorio', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedImageUrl = imageUrl.trim()
    ? /^(https?:\/\/|data:|\/)/i.test(imageUrl.trim())
      ? imageUrl.trim()
      : `https://${imageUrl.trim()}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#18181c] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272b] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f4f4f5]">
                {accessoryToEdit ? t('accessoryModalTitleEdit') : t('accessoryModalTitleNew')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#a1a1aa]">
                {device ? `Asignado a: ${device}` : t('accessoryUnassigned')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#f4f4f5] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('accessoryFieldName')} <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiAutofill}
                  disabled={isAiLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800/60 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs group"
                  title={t('aiSuggestTooltip')}
                >
                  <Sparkles className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isAiLoading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                  <span>{isAiLoading ? t('aiSuggesting') : t('aiSuggestBtn')}</span>
                </button>
                <span className={`text-[10px] font-mono ${name.length >= 60 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {name.length}/60
                </span>
              </div>
            </div>
            <input
              type="text"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('accessoryFieldNamePlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Category & Device in 2 Cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                  {t('accessoryFieldCategory')}
                </label>
                {!isAddingNewCat ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('accessoryNewCategory')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {t('accessoryCancelCategory')}
                  </button>
                )}
              </div>

              {!isAddingNewCat ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={40}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t('accessoryNewCatPlaceholder')}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-purple-400 rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            {/* Assigned Device */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1.5">
                {t('accessoryFieldDevice')}
              </label>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="">{t('accessoryUnassigned')}</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Physical Condition Star Rating (Interactive stars, single line meaning in top right) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/60 dark:bg-[#202024]/40">
            <StarRatingInput
              value={rating}
              onChange={setRating}
              label={t('accessoryFieldRating')}
              size="md"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('accessoryFieldDescription')}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiAutofill}
                  disabled={isAiLoading || !name.trim()}
                  className="text-[11px] font-semibold text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-100 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={t('aiSuggestTooltip')}
                >
                  <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span>{t('aiSuggestBtn')}</span>
                </button>
                <span className={`text-[10px] font-mono ${description.length >= 300 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {description.length}/300
                </span>
              </div>
            </div>
            <textarea
              rows={2}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('accessoryFieldDescriptionPlaceholder')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Image URL */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8]">
                {t('accessoryFieldImageUrl')}
              </label>
              {imageUrl.length > 0 && (
                <span className={`text-[10px] font-mono ${imageUrl.length >= 500 ? 'text-amber-500 font-bold' : 'text-slate-400 dark:text-[#71717a]'}`}>
                  {imageUrl.length}/500
                </span>
              )}
            </div>
            <div className="relative">
              <Image className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-[#71717a]" />
              <input
                type="text"
                maxLength={500}
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImgError(false);
                }}
                placeholder={t('accessoryFieldImageUrlPlaceholder')}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-sm text-slate-900 dark:text-[#f4f4f5] focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Preview */}
            {normalizedImageUrl && (
              <div className="mt-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#27272b] bg-slate-50/50 dark:bg-[#202024]/60">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 dark:border-[#333338] shrink-0">
                    <img
                      src={normalizedImageUrl}
                      alt={name || 'Accessory'}
                      className={`w-full h-full object-cover transition-opacity ${
                        imgError ? 'opacity-20' : 'opacity-100'
                      }`}
                      onError={() => setImgError(true)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {imgError ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>No se pudo cargar la imagen</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Vista previa disponible</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#d4d4d8] mb-1.5">
              {t('accessoryFieldTags')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={25}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder={t('accessoryFieldTagsPlaceholder')}
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-[#202024] border border-slate-300 dark:border-[#27272b] rounded-xl text-xs text-slate-900 dark:text-[#f4f4f5] focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-100 dark:bg-[#27272b] hover:bg-slate-200 dark:hover:bg-[#323238] text-slate-700 dark:text-[#d4d4d8] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tg) => (
                  <span
                    key={tg}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <span>#{tg}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tg)}
                      className="hover:text-rose-500 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#27272b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#a1a1aa] hover:bg-slate-100 dark:hover:bg-[#222226] rounded-xl transition-colors cursor-pointer"
            >
              {t('accessoryBtnCancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? t('accessoryBtnSaving') : t('accessoryBtnSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
