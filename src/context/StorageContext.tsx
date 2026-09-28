import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  Device,
  Accessory,
  StorageDrive,
  UserSettings,
  StorageExportData,
} from '../types';
import {
  INITIAL_DEVICES,
  INITIAL_DRIVES,
  INITIAL_ACCESSORIES,
  INITIAL_SETTINGS,
  DEFAULT_CLOUD_PROVIDERS,
  DEFAULT_ACCESSORY_CATEGORIES,
} from '../data/initialData';
import { cleanFirestoreData } from '../utils/cleanFirestoreData';
import { getSafeRating } from '../utils/ratingColors';

// Storage keys for guest isolation
const GUEST_DEVICES_KEY = 'storage_tracker_guest_devices';
const GUEST_DRIVES_KEY = 'storage_tracker_guest_drives';
const GUEST_ACCESSORIES_KEY = 'storage_tracker_guest_accessories';
const GUEST_SETTINGS_KEY = 'storage_tracker_guest_settings';
const GUEST_BACKUP_DEVICES_KEY = 'storage_tracker_guest_backup_devices';
const GUEST_BACKUP_DRIVES_KEY = 'storage_tracker_guest_backup_drives';
const GUEST_BACKUP_ACCESSORIES_KEY = 'storage_tracker_guest_backup_accessories';
const GUEST_BACKUP_SETTINGS_KEY = 'storage_tracker_guest_backup_settings';

// Legacy keys for complete cross-version sanitization
const LEGACY_GUEST_KEYS = [
  'collectahub_guest_devices',
  'collectahub_guest_drives',
  'collectahub_guest_accessories',
  'collectahub_guest_settings',
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export type OptionCategoryType = 'category' | 'accessoryCategory' | 'driveType' | 'format' | 'cloudProvider';

interface StorageContextType {
  devices: Device[];
  drives: StorageDrive[];
  accessories: Accessory[];
  settings: UserSettings;
  syncStatus: SyncStatus;
  isLoading: boolean;
  
  // CRUD Device
  saveDevice: (device: Partial<Device> & { name: string; category: string; system: string; cpu?: string; rating?: number }) => Promise<void>;
  deleteDevice: (deviceId: string, cascadeDrives: boolean, cascadeAccessories?: boolean) => Promise<void>;

  // CRUD Accessory
  saveAccessory: (accessory: Partial<Accessory> & { name: string; category: string; rating: number }) => Promise<void>;
  deleteAccessory: (accessoryId: string) => Promise<void>;
  
  // CRUD Drive
  saveDrive: (drive: Partial<StorageDrive> & { drive: string; capacity: number; used: number; free: number; device?: string }) => Promise<void>;
  deleteDrive: (driveId: string) => Promise<void>;
  
  // Emulation matrix score updater
  updateEmulationScore: (deviceId: string, systemId: string, rating: number) => Promise<void>;
  clearEmulationScore: (deviceId: string, systemId: string) => Promise<void>;
  
  // Settings & Option Management
  addOption: (type: OptionCategoryType, value: string) => Promise<void>;
  deleteOption: (type: OptionCategoryType, value: string) => Promise<void>;
  reassignOptionBulk: (type: OptionCategoryType, oldValue: string, newValue: string) => Promise<void>;
  reassignOptionIndividual: (
    type: OptionCategoryType,
    assignments: Record<string, string>,
    oldValueToDelete: string
  ) => Promise<void>;
  cascadeDeleteOption: (type: OptionCategoryType, value: string) => Promise<void>;
  cascadeDeleteOptionDrives: (type: 'driveType' | 'format' | 'cloudProvider', value: string) => Promise<void>;
  
  // Onboarding Cloud
  showOnboardingModal: boolean;
  closeOnboardingModal: () => void;
  confirmCloudImport: () => Promise<void>;
  confirmCloudFresh: () => Promise<void>;
  pendingImportCounts: { devices: number; drives: number; accessories: number };
  
  // Atomic Wipe & Reset
  atomicWipe: (scope: 'all' | 'reset_sample') => Promise<void>;
  
  // Import & Export
  exportBackup: () => StorageExportData;
  importBackup: (data: StorageExportData, mode: 'merge' | 'replace') => Promise<{ addedDevices: number; addedDrives: number; addedAccessories: number; newOptions: number }>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

const sanitizeCategoriesList = (catList: string[]): string[] => {
  const set = new Set<string>();
  catList.forEach((c) => {
    const trimmed = c?.trim();
    if (!trimmed) return;
    if (trimmed === 'Handheld Console' && (catList.includes('Consola Portátil') || set.has('Consola Portátil'))) {
      return;
    }
    set.add(trimmed);
  });
  return Array.from(set);
};

// Helper to guarantee that any category, accessoryCategory, driveType, format, or cloudProvider present in data is included in settings
export const mergeSettingsWithData = (
  currentSettings: UserSettings,
  currentDevices: Device[],
  currentDrives: StorageDrive[],
  currentAccessories: Accessory[] = []
): { updatedSettings: UserSettings; changed: boolean } => {
  let changed = false;
  const rawCats = Array.isArray(currentSettings.deviceCategories) ? currentSettings.deviceCategories : [];
  const sanitizedCats = sanitizeCategoriesList(rawCats);
  if (sanitizedCats.length !== rawCats.length) changed = true;

  const categories = new Set(sanitizedCats);
  const accessoryCategories = new Set(
    Array.isArray(currentSettings.accessoryCategories)
      ? currentSettings.accessoryCategories
      : []
  );
  const driveTypes = new Set(Array.isArray(currentSettings.driveTypes) ? currentSettings.driveTypes : []);
  const formats = new Set(Array.isArray(currentSettings.formatOptions) ? currentSettings.formatOptions : []);
  
  // IMPORTANT: If cloudProviders was explicitly set to empty array (e.g. from atomic wipe), keep it empty!
  const cloudProviders = new Set(
    Array.isArray(currentSettings.cloudProviders)
      ? currentSettings.cloudProviders
      : []
  );

  currentDevices.forEach((dev) => {
    const cat = dev.category?.trim();
    if (cat && !categories.has(cat)) {
      categories.add(cat);
      changed = true;
    }
  });

  currentAccessories.forEach((acc) => {
    const cat = acc.category?.trim();
    if (cat && !accessoryCategories.has(cat)) {
      accessoryCategories.add(cat);
      changed = true;
    }
  });

  currentDrives.forEach((dr) => {
    const dt = dr.driveType?.trim();
    if (dt && !driveTypes.has(dt)) {
      driveTypes.add(dt);
      changed = true;
    }
    const fmt = dr.format?.trim();
    if (fmt && !formats.has(fmt)) {
      formats.add(fmt);
      changed = true;
    }
    const cp = dr.cloudProvider?.trim();
    if (cp && !cloudProviders.has(cp)) {
      cloudProviders.add(cp);
      changed = true;
    }
  });

  return {
    updatedSettings: {
      ...currentSettings,
      deviceCategories: Array.from(categories),
      accessoryCategories: Array.from(accessoryCategories),
      driveTypes: Array.from(driveTypes),
      formatOptions: Array.from(formats),
      cloudProviders: Array.from(cloudProviders),
      updatedAt: changed ? new Date().toISOString() : currentSettings.updatedAt,
    },
    changed,
  };
};

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Active state
  const [devices, setDevices] = useState<Device[]>([]);
  const [drives, setDrives] = useState<StorageDrive[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cloud Onboarding state
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [pendingImportCounts, setPendingImportCounts] = useState<{ devices: number; drives: number; accessories: number }>({
    devices: 0,
    drives: 0,
    accessories: 0,
  });
  const guestSnapshotRef = useRef<{ devices: Device[]; drives: StorageDrive[]; accessories: Accessory[]; settings: UserSettings }>({
    devices: [],
    drives: [],
    accessories: [],
    settings: INITIAL_SETTINGS,
  });

  // Track current user ref to avoid race conditions
  const currentUserIdRef = useRef<string | null>(null);

  // 1. Initial load for Guest Mode or User switch
  useEffect(() => {
    currentUserIdRef.current = user?.uid || null;

    if (!user) {
      // Offline / Guest Mode
      setSyncStatus('local');
      setIsLoading(true);

      const savedDevices = localStorage.getItem(GUEST_DEVICES_KEY);
      const savedDrives = localStorage.getItem(GUEST_DRIVES_KEY);
      const savedAccessories = localStorage.getItem(GUEST_ACCESSORIES_KEY);
      const savedSettings = localStorage.getItem(GUEST_SETTINGS_KEY);

      if (savedDevices !== null && savedDrives !== null) {
        try {
          const rawDevs: Device[] = JSON.parse(savedDevices);
          const sanitizedDevs = rawDevs.map((d) => ({
            ...d,
            rating: getSafeRating(d.rating, 5),
          }));
          setDevices(sanitizedDevs);
          setDrives(JSON.parse(savedDrives));

          let rawAccs: Accessory[] = savedAccessories ? JSON.parse(savedAccessories) : [];
          const sanitizedAccs = rawAccs.map((a) => ({
            ...a,
            rating: getSafeRating(a.rating, 5),
          }));
          setAccessories(sanitizedAccs);

          if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
          }
        } catch (e) {
          console.error('Error parsing guest data, loading defaults:', e);
          setDevices(INITIAL_DEVICES);
          setDrives(INITIAL_DRIVES);
          setAccessories(INITIAL_ACCESSORIES);
          setSettings(INITIAL_SETTINGS);
          localStorage.setItem(GUEST_DEVICES_KEY, JSON.stringify(INITIAL_DEVICES));
          localStorage.setItem(GUEST_DRIVES_KEY, JSON.stringify(INITIAL_DRIVES));
          localStorage.setItem(GUEST_ACCESSORIES_KEY, JSON.stringify(INITIAL_ACCESSORIES));
          localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(INITIAL_SETTINGS));
        }
      } else {
        // Initialize guest with complete rich sample data
        setDevices(INITIAL_DEVICES);
        setDrives(INITIAL_DRIVES);
        setAccessories(INITIAL_ACCESSORIES);
        setSettings(INITIAL_SETTINGS);
        localStorage.setItem(GUEST_DEVICES_KEY, JSON.stringify(INITIAL_DEVICES));
        localStorage.setItem(GUEST_DRIVES_KEY, JSON.stringify(INITIAL_DRIVES));
        localStorage.setItem(GUEST_ACCESSORIES_KEY, JSON.stringify(INITIAL_ACCESSORIES));
        localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(INITIAL_SETTINGS));
      }

      setIsLoading(false);
      return;
    }

    // Authenticated User:
    // A. Backup guest workspace safely
    const currentGuestDevs =
      localStorage.getItem(GUEST_DEVICES_KEY) || localStorage.getItem('collectahub_guest_devices');
    const currentGuestDrives =
      localStorage.getItem(GUEST_DRIVES_KEY) || localStorage.getItem('collectahub_guest_drives');
    const currentGuestAccessories =
      localStorage.getItem(GUEST_ACCESSORIES_KEY) || localStorage.getItem('collectahub_guest_accessories');
    const currentGuestSettings =
      localStorage.getItem(GUEST_SETTINGS_KEY) || localStorage.getItem('collectahub_guest_settings');

    if (currentGuestDevs) localStorage.setItem(GUEST_BACKUP_DEVICES_KEY, currentGuestDevs);
    if (currentGuestDrives) localStorage.setItem(GUEST_BACKUP_DRIVES_KEY, currentGuestDrives);
    if (currentGuestAccessories) localStorage.setItem(GUEST_BACKUP_ACCESSORIES_KEY, currentGuestAccessories);
    if (currentGuestSettings) localStorage.setItem(GUEST_BACKUP_SETTINGS_KEY, currentGuestSettings);

    // Clean up legacy keys so they never cause zombie counts or desyncs
    try {
      LEGACY_GUEST_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}

    try {
      const parsedDevs = currentGuestDevs ? JSON.parse(currentGuestDevs) : [];
      const parsedDrives = currentGuestDrives ? JSON.parse(currentGuestDrives) : [];
      const parsedAccessories = currentGuestAccessories ? JSON.parse(currentGuestAccessories) : [];
      const parsedSettings = currentGuestSettings ? JSON.parse(currentGuestSettings) : INITIAL_SETTINGS;

      guestSnapshotRef.current = {
        devices: (Array.isArray(parsedDevs) ? parsedDevs : []).map((d) => ({
          ...d,
          rating: getSafeRating(d.rating, 5),
        })),
        drives: Array.isArray(parsedDrives) ? parsedDrives : [],
        accessories: (Array.isArray(parsedAccessories) ? parsedAccessories : []).map((a) => ({
          ...a,
          rating: getSafeRating(a.rating, 5),
        })),
        settings: parsedSettings,
      };
      setPendingImportCounts({
        devices: guestSnapshotRef.current.devices.length,
        drives: guestSnapshotRef.current.drives.length,
        accessories: guestSnapshotRef.current.accessories.length,
      });
    } catch {
      guestSnapshotRef.current = {
        devices: [],
        drives: [],
        accessories: [],
        settings: INITIAL_SETTINGS,
      };
      setPendingImportCounts({
        devices: 0,
        drives: 0,
        accessories: 0,
      });
    }

    // B. Subscribe to Firestore private user subcollections:
    setSyncStatus('syncing');
    setIsLoading(true);

    const userId = user.uid;
    const devicesCol = collection(db, 'users', userId, 'devices');
    const drivesCol = collection(db, 'users', userId, 'drives');
    const accessoriesCol = collection(db, 'users', userId, 'accessories');
    const settingsDoc = doc(db, 'users', userId, 'settings', 'config');

    let initialCheckDone = false;

    // Load settings snapshot
    const unsubSettings = onSnapshot(
      settingsDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudSettings = docSnap.data() as UserSettings;
          setSettings({
            driveTypes: Array.isArray(cloudSettings.driveTypes) ? cloudSettings.driveTypes : [],
            formatOptions: Array.isArray(cloudSettings.formatOptions) ? cloudSettings.formatOptions : [],
            deviceCategories: Array.isArray(cloudSettings.deviceCategories) ? cloudSettings.deviceCategories : [],
            accessoryCategories: Array.isArray(cloudSettings.accessoryCategories) ? cloudSettings.accessoryCategories : [],
            cloudProviders: Array.isArray(cloudSettings.cloudProviders) ? cloudSettings.cloudProviders : [],
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/config`)
    );

    // Listen to devices
    const unsubDevices = onSnapshot(
      devicesCol,
      (snapshot) => {
        const loadedDevices: Device[] = snapshot.docs.map((d) => {
          const data = d.data() as Device;
          return {
            ...data,
            id: d.id,
            rating: getSafeRating(data.rating, 5),
          };
        });
        setDevices(loadedDevices);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/devices`);
        setSyncStatus('error');
      }
    );

    // Listen to accessories
    const unsubAccessories = onSnapshot(
      accessoriesCol,
      (snapshot) => {
        const loadedAccessories: Accessory[] = snapshot.docs.map((d) => {
          const data = d.data() as Accessory;
          return {
            ...data,
            id: d.id,
            rating: getSafeRating(data.rating, 5),
          };
        });
        setAccessories(loadedAccessories);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/accessories`);
      }
    );

    // Listen to drives
    const unsubDrives = onSnapshot(
      drivesCol,
      async (snapshot) => {
        const loadedDrives: StorageDrive[] = snapshot.docs.map((d) => ({
          ...(d.data() as StorageDrive),
          id: d.id,
        }));
        setDrives(loadedDrives);
        setSyncStatus('synced');
        setIsLoading(false);

        // Check if first-time cloud onboarding is needed:
        if (!initialCheckDone) {
          initialCheckDone = true;
          const devSnap = await getDocs(devicesCol);
          if (devSnap.empty && loadedDrives.length === 0) {
            const hasLocalData =
              guestSnapshotRef.current.devices.length > 0 ||
              guestSnapshotRef.current.drives.length > 0 ||
              guestSnapshotRef.current.accessories.length > 0;
            if (hasLocalData) {
              setShowOnboardingModal(true);
            } else {
              // Both cloud and local are clean/empty. Initialize default config silently.
              const confRef = doc(db, 'users', userId, 'settings', 'config');
              const confSnap = await getDoc(confRef);
              if (!confSnap.exists()) {
                await setDoc(confRef, cleanFirestoreData(INITIAL_SETTINGS));
              }
            }
          }
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/drives`);
        setSyncStatus('error');
        setIsLoading(false);
      }
    );

    return () => {
      unsubSettings();
      unsubDevices();
      unsubAccessories();
      unsubDrives();
    };
  }, [user]);

  // Persist guest changes to localStorage
  const persistGuest = (
    newDevices: Device[],
    newDrives: StorageDrive[],
    newAccessories?: Accessory[],
    newSettings?: UserSettings
  ) => {
    if (!user) {
      localStorage.setItem(GUEST_DEVICES_KEY, JSON.stringify(newDevices));
      localStorage.setItem(GUEST_DRIVES_KEY, JSON.stringify(newDrives));
      if (newAccessories) {
        localStorage.setItem(GUEST_ACCESSORIES_KEY, JSON.stringify(newAccessories));
      }
      if (newSettings) {
        localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(newSettings));
      }
      try {
        LEGACY_GUEST_KEYS.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  };

  // Continuous auto-sync: Ensure settings always includes all categories from devices, drives & accessories
  useEffect(() => {
    if (devices.length === 0 && drives.length === 0 && accessories.length === 0) return;
    const { updatedSettings, changed } = mergeSettingsWithData(settings, devices, drives, accessories);
    if (changed) {
      setSettings(updatedSettings);
      if (!user) {
        localStorage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(updatedSettings));
      } else {
        const settingsDoc = doc(db, 'users', user.uid, 'settings', 'config');
        setDoc(settingsDoc, cleanFirestoreData(updatedSettings)).catch((err) =>
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/settings/config`)
        );
      }
    }
  }, [devices, drives, accessories, user]);

  // --- CRUD DEVICE ---
  const saveDevice = async (deviceInput: Partial<Device> & { name: string; category: string; system: string; cpu?: string; rating?: number }) => {
    const isEdit = Boolean(deviceInput.id);
    const id = deviceInput.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const deviceData: Device = {
      id,
      name: deviceInput.name.trim(),
      category: deviceInput.category,
      system: deviceInput.system.trim(),
      cpu: deviceInput.cpu?.trim() || undefined,
      imageUrl: deviceInput.imageUrl?.trim() || undefined,
      rating: getSafeRating(deviceInput.rating, 5),
      isGamingDevice: Boolean(deviceInput.isGamingDevice),
      emulationOverview: deviceInput.emulationOverview?.trim() || undefined,
      emulationScores: deviceInput.emulationScores || {},
      notes: deviceInput.notes?.trim() || undefined,
      createdAt: deviceInput.createdAt || now,
      updatedAt: now,
    };

    if (!user) {
      // Offline mode
      let updatedDevs: Device[];
      if (isEdit) {
        const oldName = devices.find((d) => d.id === id)?.name;
        updatedDevs = devices.map((d) => (d.id === id ? deviceData : d));
        // If device name changed, update linked drives & accessories
        let updatedDrives = drives;
        let updatedAccessories = accessories;
        if (oldName && oldName !== deviceData.name) {
          updatedDrives = drives.map((dr) =>
            dr.device === oldName ? { ...dr, device: deviceData.name } : dr
          );
          updatedAccessories = accessories.map((acc) =>
            acc.device === oldName ? { ...acc, device: deviceData.name } : acc
          );
          setDrives(updatedDrives);
          setAccessories(updatedAccessories);
        }
        persistGuest(updatedDevs, updatedDrives, updatedAccessories);
      } else {
        updatedDevs = [deviceData, ...devices];
        persistGuest(updatedDevs, drives, accessories);
      }
      setDevices(updatedDevs);
      return;
    }

    // Cloud mode:
    try {
      setSyncStatus('syncing');
      const sanitized = cleanFirestoreData(deviceData);
      const devRef = doc(db, 'users', user.uid, 'devices', id);
      await setDoc(devRef, sanitized);

      // If name changed, update drives and accessories in Firestore batch
      const oldDev = devices.find((d) => d.id === id);
      if (oldDev && oldDev.name !== deviceData.name) {
        const affectedDrives = drives.filter((dr) => dr.device === oldDev.name);
        const affectedAccs = accessories.filter((acc) => acc.device === oldDev.name);
        if (affectedDrives.length > 0 || affectedAccs.length > 0) {
          const batch = writeBatch(db);
          affectedDrives.forEach((dr) => {
            const drRef = doc(db, 'users', user.uid, 'drives', dr.id);
            batch.update(drRef, { device: deviceData.name, updatedAt: now });
          });
          affectedAccs.forEach((acc) => {
            const accRef = doc(db, 'users', user.uid, 'accessories', acc.id);
            batch.update(accRef, { device: deviceData.name, updatedAt: now });
          });
          await batch.commit();
        }
      }
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/devices/${id}`);
      setSyncStatus('error');
      throw err;
    }
  };

  const deleteDevice = async (deviceId: string, cascadeDrives: boolean, cascadeAccessories: boolean = false) => {
    const target = devices.find((d) => d.id === deviceId);
    if (!target) return;

    if (!user) {
      const updatedDevices = devices.filter((d) => d.id !== deviceId);
      let updatedDrives = drives;
      let updatedAccessories = accessories;

      if (cascadeDrives) {
        updatedDrives = drives.filter((dr) => dr.device !== target.name);
      } else {
        // Unlink drives
        updatedDrives = drives.map((dr) =>
          dr.device === target.name ? { ...dr, device: 'Sin Dispositivo / Unassigned' } : dr
        );
      }

      if (cascadeAccessories) {
        updatedAccessories = accessories.filter((acc) => acc.device !== target.name);
      } else {
        // Unlink accessories
        updatedAccessories = accessories.map((acc) =>
          acc.device === target.name ? { ...acc, device: undefined } : acc
        );
      }

      setDevices(updatedDevices);
      setDrives(updatedDrives);
      setAccessories(updatedAccessories);
      persistGuest(updatedDevices, updatedDrives, updatedAccessories);
      return;
    }

    // Cloud mode:
    try {
      setSyncStatus('syncing');
      const batch = writeBatch(db);
      const devRef = doc(db, 'users', user.uid, 'devices', deviceId);
      batch.delete(devRef);

      const targetDrives = drives.filter((dr) => dr.device === target.name);
      const targetAccs = accessories.filter((acc) => acc.device === target.name);

      if (cascadeDrives) {
        targetDrives.forEach((dr) => {
          batch.delete(doc(db, 'users', user.uid, 'drives', dr.id));
        });
      } else {
        if (targetDrives.length > 0) {
          targetDrives.forEach((dr) => {
            batch.update(doc(db, 'users', user.uid, 'drives', dr.id), {
              device: 'Sin Dispositivo / Unassigned',
              updatedAt: new Date().toISOString(),
            });
          });
        }
      }

      if (cascadeAccessories) {
        targetAccs.forEach((acc) => {
          batch.delete(doc(db, 'users', user.uid, 'accessories', acc.id));
        });
      } else {
        if (targetAccs.length > 0) {
          targetAccs.forEach((acc) => {
            batch.update(doc(db, 'users', user.uid, 'accessories', acc.id), {
              device: '',
              updatedAt: new Date().toISOString(),
            });
          });
        }
      }

      await batch.commit();
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/devices/${deviceId}`);
      setSyncStatus('error');
      throw err;
    }
  };

  // --- CRUD ACCESSORY ---
  const saveAccessory = async (accInput: Partial<Accessory> & { name: string; category: string; rating: number }) => {
    const isEdit = Boolean(accInput.id);
    const id = accInput.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const accessoryData: Accessory = {
      id,
      name: accInput.name.trim(),
      category: accInput.category.trim(),
      description: accInput.description?.trim() || '',
      tags: Array.isArray(accInput.tags) ? accInput.tags : [],
      rating: getSafeRating(accInput.rating, 5),
      imageUrl: accInput.imageUrl?.trim() || undefined,
      device: accInput.device?.trim() || undefined,
      createdAt: accInput.createdAt || now,
      updatedAt: now,
    };

    if (!user) {
      let updated: Accessory[];
      if (isEdit) {
        updated = accessories.map((a) => (a.id === id ? accessoryData : a));
      } else {
        updated = [accessoryData, ...accessories];
      }
      setAccessories(updated);
      persistGuest(devices, drives, updated);
      return;
    }

    try {
      setSyncStatus('syncing');
      const sanitized = cleanFirestoreData(accessoryData);
      const accRef = doc(db, 'users', user.uid, 'accessories', id);
      await setDoc(accRef, sanitized);
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/accessories/${id}`);
      setSyncStatus('error');
      throw err;
    }
  };

  const deleteAccessory = async (accessoryId: string) => {
    if (!user) {
      const updated = accessories.filter((a) => a.id !== accessoryId);
      setAccessories(updated);
      persistGuest(devices, drives, updated);
      return;
    }

    try {
      setSyncStatus('syncing');
      await deleteDoc(doc(db, 'users', user.uid, 'accessories', accessoryId));
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/accessories/${accessoryId}`);
      setSyncStatus('error');
      throw err;
    }
  };

  // --- CRUD DRIVE ---
  const saveDrive = async (driveInput: Partial<StorageDrive> & { drive: string; capacity: number; used: number; free: number; device?: string }) => {
    const isEdit = Boolean(driveInput.id);
    const id = driveInput.id || `drive_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const capacity = Math.max(0, Number(driveInput.capacity) || 0);
    const rawUsed = Number(driveInput.used) || 0;
    const used = Math.min(capacity, Math.max(0, rawUsed));
    const free = Math.min(capacity, Math.max(0, +(capacity - used).toFixed(2)));

    const driveData: StorageDrive = {
      id,
      device: driveInput.device?.trim() || '',
      drive: driveInput.drive.trim(),
      driveType: driveInput.driveType || 'SSD (NVMe/PCIe)',
      label: driveInput.label?.trim() || '',
      capacity,
      used,
      free,
      format: driveInput.format || 'NTFS',
      tags: Array.isArray(driveInput.tags) ? driveInput.tags : [],
      notes: driveInput.notes?.trim() || undefined,
      storageMedium: driveInput.storageMedium || 'physical',
      cloudProvider: driveInput.storageMedium === 'cloud_network' ? driveInput.cloudProvider : undefined,
      mountPoint: driveInput.storageMedium === 'cloud_network' ? driveInput.mountPoint?.trim() || undefined : undefined,
      accountEmail: driveInput.storageMedium === 'cloud_network' ? driveInput.accountEmail?.trim() || undefined : undefined,
      createdAt: driveInput.createdAt || now,
      updatedAt: now,
    };

    if (!user) {
      let updated: StorageDrive[];
      if (isEdit) {
        updated = drives.map((d) => (d.id === id ? driveData : d));
      } else {
        updated = [driveData, ...drives];
      }
      setDrives(updated);
      persistGuest(devices, updated, accessories);
      return;
    }

    try {
      setSyncStatus('syncing');
      const sanitized = cleanFirestoreData(driveData);
      const drRef = doc(db, 'users', user.uid, 'drives', id);
      await setDoc(drRef, sanitized);
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/drives/${id}`);
      setSyncStatus('error');
      throw err;
    }
  };

  const deleteDrive = async (driveId: string) => {
    if (!user) {
      const updated = drives.filter((d) => d.id !== driveId);
      setDrives(updated);
      persistGuest(devices, updated, accessories);
      return;
    }

    try {
      setSyncStatus('syncing');
      await deleteDoc(doc(db, 'users', user.uid, 'drives', driveId));
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/drives/${driveId}`);
      setSyncStatus('error');
      throw err;
    }
  };

  // --- EMULATION MATRIX RATINGS ---
  const updateEmulationScore = async (deviceId: string, systemId: string, rating: number) => {
    const targetDev = devices.find((d) => d.id === deviceId);
    if (!targetDev) return;

    const newScores = {
      ...(targetDev.emulationScores || {}),
      [systemId]: rating,
    };

    await saveDevice({
      ...targetDev,
      emulationScores: newScores,
    });
  };

  const clearEmulationScore = async (deviceId: string, systemId: string) => {
    const targetDev = devices.find((d) => d.id === deviceId);
    if (!targetDev || !targetDev.emulationScores) return;

    const newScores = { ...targetDev.emulationScores };
    delete newScores[systemId];

    await saveDevice({
      ...targetDev,
      emulationScores: newScores,
    });
  };

  // --- OPTIONS / SETTINGS MANAGEMENT ---
  const persistSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (!user) {
      persistGuest(devices, drives, accessories, newSettings);
      return;
    }

    try {
      const configRef = doc(db, 'users', user.uid, 'settings', 'config');
      await setDoc(configRef, cleanFirestoreData({ ...newSettings, updatedAt: new Date().toISOString() }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/settings/config`);
    }
  };

  const addOption = async (type: OptionCategoryType, value: string) => {
    let trimmed = value.trim();
    if (!trimmed) return;
    const maxLen = type === 'format' ? 25 : 40;
    if (trimmed.length > maxLen) {
      trimmed = trimmed.slice(0, maxLen);
    }

    const newSettings = { ...settings };
    if (type === 'category') {
      if (!newSettings.deviceCategories.includes(trimmed)) {
        newSettings.deviceCategories = [...newSettings.deviceCategories, trimmed];
      }
    } else if (type === 'accessoryCategory') {
      const currentList = Array.isArray(newSettings.accessoryCategories) ? newSettings.accessoryCategories : [];
      if (!currentList.includes(trimmed)) {
        newSettings.accessoryCategories = [...currentList, trimmed];
      }
    } else if (type === 'driveType') {
      if (!newSettings.driveTypes.includes(trimmed)) {
        newSettings.driveTypes = [...newSettings.driveTypes, trimmed];
      }
    } else if (type === 'format') {
      if (!newSettings.formatOptions.includes(trimmed)) {
        newSettings.formatOptions = [...newSettings.formatOptions, trimmed];
      }
    } else if (type === 'cloudProvider') {
      const currentList = Array.isArray(newSettings.cloudProviders) ? newSettings.cloudProviders : [];
      if (!currentList.includes(trimmed)) {
        newSettings.cloudProviders = [...currentList, trimmed];
      }
    }

    await persistSettings(newSettings);
  };

  const deleteOption = async (type: OptionCategoryType, value: string) => {
    const newSettings = { ...settings };
    if (type === 'category') {
      newSettings.deviceCategories = newSettings.deviceCategories.filter((c) => c !== value);
    } else if (type === 'accessoryCategory') {
      const currentList = Array.isArray(newSettings.accessoryCategories) ? newSettings.accessoryCategories : [];
      newSettings.accessoryCategories = currentList.filter((c) => c !== value);
    } else if (type === 'driveType') {
      newSettings.driveTypes = newSettings.driveTypes.filter((t) => t !== value);
    } else if (type === 'format') {
      newSettings.formatOptions = newSettings.formatOptions.filter((f) => f !== value);
    } else if (type === 'cloudProvider') {
      const currentList = Array.isArray(newSettings.cloudProviders) ? newSettings.cloudProviders : [];
      newSettings.cloudProviders = currentList.filter((p) => p !== value);
    }
    await persistSettings(newSettings);
  };

  // Option Conflict Resolutions:
  // 1. Bulk Reassignment
  const reassignOptionBulk = async (
    type: OptionCategoryType,
    oldValue: string,
    newValue: string
  ) => {
    const now = new Date().toISOString();

    if (type === 'category') {
      // Reassign devices
      if (!user) {
        const updatedDevs = devices.map((d) => (d.category === oldValue ? { ...d, category: newValue } : d));
        const newSettings = {
          ...settings,
          deviceCategories: settings.deviceCategories.filter((c) => c !== oldValue),
        };
        setDevices(updatedDevs);
        setSettings(newSettings);
        persistGuest(updatedDevs, drives, accessories, newSettings);
      } else {
        const batch = writeBatch(db);
        devices.forEach((d) => {
          if (d.category === oldValue) {
            batch.update(doc(db, 'users', user.uid, 'devices', d.id), { category: newValue, updatedAt: now });
          }
        });
        await batch.commit();
        await deleteOption('category', oldValue);
      }
    } else if (type === 'accessoryCategory') {
      // Reassign accessories
      if (!user) {
        const updatedAccs = accessories.map((a) => (a.category === oldValue ? { ...a, category: newValue } : a));
        const currentAccCats = Array.isArray(settings.accessoryCategories) ? settings.accessoryCategories : [];
        const newSettings = {
          ...settings,
          accessoryCategories: currentAccCats.filter((c) => c !== oldValue),
        };
        setAccessories(updatedAccs);
        setSettings(newSettings);
        persistGuest(devices, drives, updatedAccs, newSettings);
      } else {
        const batch = writeBatch(db);
        accessories.forEach((a) => {
          if (a.category === oldValue) {
            batch.update(doc(db, 'users', user.uid, 'accessories', a.id), { category: newValue, updatedAt: now });
          }
        });
        await batch.commit();
        await deleteOption('accessoryCategory', oldValue);
      }
    } else {
      // DriveType, Format or CloudProvider
      if (!user) {
        const updatedDrives = drives.map((dr) => {
          if (type === 'driveType' && dr.driveType === oldValue) {
            return { ...dr, driveType: newValue };
          }
          if (type === 'format' && dr.format === oldValue) {
            return { ...dr, format: newValue };
          }
          if (type === 'cloudProvider' && dr.cloudProvider === oldValue) {
            return { ...dr, cloudProvider: newValue };
          }
          return dr;
        });
        const currentProviders = Array.isArray(settings.cloudProviders) ? settings.cloudProviders : [];
        const newSettings = {
          ...settings,
          driveTypes: type === 'driveType' ? settings.driveTypes.filter((t) => t !== oldValue) : settings.driveTypes,
          formatOptions: type === 'format' ? settings.formatOptions.filter((f) => f !== oldValue) : settings.formatOptions,
          cloudProviders: type === 'cloudProvider' ? currentProviders.filter((p) => p !== oldValue) : currentProviders,
        };
        setDrives(updatedDrives);
        setSettings(newSettings);
        persistGuest(devices, updatedDrives, accessories, newSettings);
      } else {
        const batch = writeBatch(db);
        drives.forEach((dr) => {
          if (type === 'driveType' && dr.driveType === oldValue) {
            batch.update(doc(db, 'users', user.uid, 'drives', dr.id), { driveType: newValue, updatedAt: now });
          } else if (type === 'format' && dr.format === oldValue) {
            batch.update(doc(db, 'users', user.uid, 'drives', dr.id), { format: newValue, updatedAt: now });
          } else if (type === 'cloudProvider' && dr.cloudProvider === oldValue) {
            batch.update(doc(db, 'users', user.uid, 'drives', dr.id), { cloudProvider: newValue, updatedAt: now });
          }
        });
        await batch.commit();
        await deleteOption(type, oldValue);
      }
    }
  };

  // 2. Individual Reassignment (Supported for ALL: category, accessoryCategory, driveType, format, cloudProvider)
  const reassignOptionIndividual = async (
    type: OptionCategoryType,
    assignments: Record<string, string>, // entityId -> newOptionValue
    oldValueToDelete: string
  ) => {
    const now = new Date().toISOString();

    if (type === 'category') {
      // Individual device reassignment
      if (!user) {
        const updatedDevs = devices.map((d) => {
          if (assignments[d.id]) {
            return { ...d, category: assignments[d.id] };
          }
          return d;
        });
        const newSettings = {
          ...settings,
          deviceCategories: settings.deviceCategories.filter((c) => c !== oldValueToDelete),
        };
        setDevices(updatedDevs);
        setSettings(newSettings);
        persistGuest(updatedDevs, drives, accessories, newSettings);
      } else {
        const batch = writeBatch(db);
        Object.entries(assignments).forEach(([devId, newVal]) => {
          const devRef = doc(db, 'users', user.uid, 'devices', devId);
          batch.update(devRef, { category: newVal, updatedAt: now });
        });
        await batch.commit();
        await deleteOption('category', oldValueToDelete);
      }
    } else if (type === 'accessoryCategory') {
      // Individual accessory reassignment
      if (!user) {
        const updatedAccs = accessories.map((a) => {
          if (assignments[a.id]) {
            return { ...a, category: assignments[a.id] };
          }
          return a;
        });
        const currentAccCats = Array.isArray(settings.accessoryCategories) ? settings.accessoryCategories : [];
        const newSettings = {
          ...settings,
          accessoryCategories: currentAccCats.filter((c) => c !== oldValueToDelete),
        };
        setAccessories(updatedAccs);
        setSettings(newSettings);
        persistGuest(devices, drives, updatedAccs, newSettings);
      } else {
        const batch = writeBatch(db);
        Object.entries(assignments).forEach(([accId, newVal]) => {
          const accRef = doc(db, 'users', user.uid, 'accessories', accId);
          batch.update(accRef, { category: newVal, updatedAt: now });
        });
        await batch.commit();
        await deleteOption('accessoryCategory', oldValueToDelete);
      }
    } else {
      // Drives (driveType, format, cloudProvider)
      if (!user) {
        const updatedDrives = drives.map((dr) => {
          if (assignments[dr.id]) {
            if (type === 'driveType') return { ...dr, driveType: assignments[dr.id] };
            if (type === 'format') return { ...dr, format: assignments[dr.id] };
            if (type === 'cloudProvider') return { ...dr, cloudProvider: assignments[dr.id] };
          }
          return dr;
        });
        const currentProviders = Array.isArray(settings.cloudProviders) ? settings.cloudProviders : [];
        const newSettings = {
          ...settings,
          driveTypes: type === 'driveType' ? settings.driveTypes.filter((t) => t !== oldValueToDelete) : settings.driveTypes,
          formatOptions: type === 'format' ? settings.formatOptions.filter((f) => f !== oldValueToDelete) : settings.formatOptions,
          cloudProviders: type === 'cloudProvider' ? currentProviders.filter((p) => p !== oldValueToDelete) : currentProviders,
        };
        setDrives(updatedDrives);
        setSettings(newSettings);
        persistGuest(devices, updatedDrives, accessories, newSettings);
      } else {
        const batch = writeBatch(db);
        Object.entries(assignments).forEach(([driveId, newVal]) => {
          const drRef = doc(db, 'users', user.uid, 'drives', driveId);
          if (type === 'driveType') {
            batch.update(drRef, { driveType: newVal, updatedAt: now });
          } else if (type === 'format') {
            batch.update(drRef, { format: newVal, updatedAt: now });
          } else if (type === 'cloudProvider') {
            batch.update(drRef, { cloudProvider: newVal, updatedAt: now });
          }
        });
        await batch.commit();
        await deleteOption(type, oldValueToDelete);
      }
    }
  };

  // 3. Cascade Delete Option (Supported for ALL: category, accessoryCategory, driveType, format, cloudProvider)
  const cascadeDeleteOption = async (type: OptionCategoryType, value: string) => {
    if (type === 'category') {
      // Cascade delete devices with this category (and unlink their drives/accessories)
      const targetDevs = devices.filter((d) => d.category === value);
      const targetDevNames = new Set(targetDevs.map((d) => d.name));

      if (!user) {
        const updatedDevs = devices.filter((d) => d.category !== value);
        const updatedDrives = drives.map((dr) =>
          targetDevNames.has(dr.device || '') ? { ...dr, device: 'Sin Dispositivo / Unassigned' } : dr
        );
        const updatedAccs = accessories.map((acc) =>
          targetDevNames.has(acc.device || '') ? { ...acc, device: undefined } : acc
        );
        const newSettings = {
          ...settings,
          deviceCategories: settings.deviceCategories.filter((c) => c !== value),
        };
        setDevices(updatedDevs);
        setDrives(updatedDrives);
        setAccessories(updatedAccs);
        setSettings(newSettings);
        persistGuest(updatedDevs, updatedDrives, updatedAccs, newSettings);
      } else {
        const batch = writeBatch(db);
        targetDevs.forEach((d) => {
          batch.delete(doc(db, 'users', user.uid, 'devices', d.id));
        });
        drives.forEach((dr) => {
          if (targetDevNames.has(dr.device || '')) {
            batch.update(doc(db, 'users', user.uid, 'drives', dr.id), {
              device: 'Sin Dispositivo / Unassigned',
              updatedAt: new Date().toISOString(),
            });
          }
        });
        accessories.forEach((acc) => {
          if (targetDevNames.has(acc.device || '')) {
            batch.update(doc(db, 'users', user.uid, 'accessories', acc.id), {
              device: '',
              updatedAt: new Date().toISOString(),
            });
          }
        });
        await batch.commit();
        await deleteOption('category', value);
      }
    } else if (type === 'accessoryCategory') {
      // Cascade delete accessories with this category
      if (!user) {
        const updatedAccs = accessories.filter((a) => a.category !== value);
        const currentAccCats = Array.isArray(settings.accessoryCategories) ? settings.accessoryCategories : [];
        const newSettings = {
          ...settings,
          accessoryCategories: currentAccCats.filter((c) => c !== value),
        };
        setAccessories(updatedAccs);
        setSettings(newSettings);
        persistGuest(devices, drives, updatedAccs, newSettings);
      } else {
        const batch = writeBatch(db);
        accessories.forEach((a) => {
          if (a.category === value) {
            batch.delete(doc(db, 'users', user.uid, 'accessories', a.id));
          }
        });
        await batch.commit();
        await deleteOption('accessoryCategory', value);
      }
    } else {
      // Drives
      if (!user) {
        const updatedDrives = drives.filter((dr) => {
          if (type === 'driveType') return dr.driveType !== value;
          if (type === 'format') return dr.format !== value;
          if (type === 'cloudProvider') return dr.cloudProvider !== value;
          return true;
        });
        const currentProviders = Array.isArray(settings.cloudProviders) ? settings.cloudProviders : [];
        const newSettings = {
          ...settings,
          driveTypes: type === 'driveType' ? settings.driveTypes.filter((t) => t !== value) : settings.driveTypes,
          formatOptions: type === 'format' ? settings.formatOptions.filter((f) => f !== value) : settings.formatOptions,
          cloudProviders: type === 'cloudProvider' ? currentProviders.filter((p) => p !== value) : currentProviders,
        };
        setDrives(updatedDrives);
        setSettings(newSettings);
        persistGuest(devices, updatedDrives, accessories, newSettings);
      } else {
        const batch = writeBatch(db);
        drives.forEach((dr) => {
          const shouldDelete =
            (type === 'driveType' && dr.driveType === value) ||
            (type === 'format' && dr.format === value) ||
            (type === 'cloudProvider' && dr.cloudProvider === value);
          if (shouldDelete) {
            batch.delete(doc(db, 'users', user.uid, 'drives', dr.id));
          }
        });
        await batch.commit();
        await deleteOption(type, value);
      }
    }
  };

  const cascadeDeleteOptionDrives = async (type: 'driveType' | 'format' | 'cloudProvider', value: string) => {
    return cascadeDeleteOption(type, value);
  };

  // --- CLOUD ONBOARDING ---
  const closeOnboardingModal = () => setShowOnboardingModal(false);

  const confirmCloudImport = async () => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      const batch = writeBatch(db);
      const snapshot = guestSnapshotRef.current;

      // Batch insert devices
      snapshot.devices.forEach((dev) => {
        const ref = doc(db, 'users', user.uid, 'devices', dev.id);
        batch.set(ref, cleanFirestoreData(dev));
      });

      // Batch insert drives
      snapshot.drives.forEach((drive) => {
        const ref = doc(db, 'users', user.uid, 'drives', drive.id);
        batch.set(ref, cleanFirestoreData(drive));
      });

      // Batch insert accessories
      snapshot.accessories.forEach((acc) => {
        const ref = doc(db, 'users', user.uid, 'accessories', acc.id);
        batch.set(ref, cleanFirestoreData(acc));
      });

      // Settings config
      const confRef = doc(db, 'users', user.uid, 'settings', 'config');
      batch.set(confRef, cleanFirestoreData({ ...snapshot.settings, updatedAt: new Date().toISOString() }));

      await batch.commit();
      setShowOnboardingModal(false);
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setSyncStatus('error');
    }
  };

  const confirmCloudFresh = async () => {
    if (!user) return;
    try {
      setSyncStatus('syncing');
      const EMPTY_SETTINGS: UserSettings = {
        driveTypes: [],
        formatOptions: [],
        deviceCategories: [],
        accessoryCategories: [],
        cloudProviders: [],
        updatedAt: new Date().toISOString(),
      };
      // Initialize with completely clean empty config
      const confRef = doc(db, 'users', user.uid, 'settings', 'config');
      await setDoc(confRef, cleanFirestoreData(EMPTY_SETTINGS));
      setDevices([]);
      setDrives([]);
      setAccessories([]);
      setSettings(EMPTY_SETTINGS);
      setShowOnboardingModal(false);
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/settings/config`);
      setSyncStatus('error');
    }
  };

  // --- ATOMIC WIPE & RESET ---
  const atomicWipe = async (scope: 'all' | 'reset_sample') => {
    // Explicitly empty arrays for ALL categories including cloudProviders
    const EMPTY_SETTINGS: UserSettings = {
      driveTypes: [],
      formatOptions: [],
      deviceCategories: [],
      accessoryCategories: [],
      cloudProviders: [],
      updatedAt: new Date().toISOString(),
    };

    if (!user) {
      if (scope === 'reset_sample') {
        setDevices(INITIAL_DEVICES);
        setDrives(INITIAL_DRIVES);
        setAccessories(INITIAL_ACCESSORIES);
        setSettings(INITIAL_SETTINGS);
        persistGuest(INITIAL_DEVICES, INITIAL_DRIVES, INITIAL_ACCESSORIES, INITIAL_SETTINGS);
      } else {
        setDevices([]);
        setDrives([]);
        setAccessories([]);
        setSettings(EMPTY_SETTINGS);
        persistGuest([], [], [], EMPTY_SETTINGS);
        try {
          LEGACY_GUEST_KEYS.forEach((k) => localStorage.removeItem(k));
          localStorage.removeItem(GUEST_BACKUP_DEVICES_KEY);
          localStorage.removeItem(GUEST_BACKUP_DRIVES_KEY);
          localStorage.removeItem(GUEST_BACKUP_ACCESSORIES_KEY);
          localStorage.removeItem(GUEST_BACKUP_SETTINGS_KEY);
        } catch {}
      }
      return;
    }

    try {
      setSyncStatus('syncing');
      const batch = writeBatch(db);

      // Fetch all docs to delete in batches
      const devDocs = await getDocs(collection(db, 'users', user.uid, 'devices'));
      devDocs.forEach((d) => batch.delete(d.ref));

      const driveDocs = await getDocs(collection(db, 'users', user.uid, 'drives'));
      driveDocs.forEach((d) => batch.delete(d.ref));

      const accDocs = await getDocs(collection(db, 'users', user.uid, 'accessories'));
      accDocs.forEach((d) => batch.delete(d.ref));

      if (scope === 'reset_sample') {
        // Seed initial sample data
        INITIAL_DEVICES.forEach((dev) => {
          batch.set(doc(db, 'users', user.uid, 'devices', dev.id), cleanFirestoreData(dev));
        });
        INITIAL_DRIVES.forEach((dr) => {
          batch.set(doc(db, 'users', user.uid, 'drives', dr.id), cleanFirestoreData(dr));
        });
        INITIAL_ACCESSORIES.forEach((acc) => {
          batch.set(doc(db, 'users', user.uid, 'accessories', acc.id), cleanFirestoreData(acc));
        });
        batch.set(
          doc(db, 'users', user.uid, 'settings', 'config'),
          cleanFirestoreData({ ...INITIAL_SETTINGS, updatedAt: new Date().toISOString() })
        );
        setDevices(INITIAL_DEVICES);
        setDrives(INITIAL_DRIVES);
        setAccessories(INITIAL_ACCESSORIES);
        setSettings(INITIAL_SETTINGS);
      } else {
        batch.set(
          doc(db, 'users', user.uid, 'settings', 'config'),
          cleanFirestoreData(EMPTY_SETTINGS)
        );
        setDevices([]);
        setDrives([]);
        setAccessories([]);
        setSettings(EMPTY_SETTINGS);
      }

      await batch.commit();
      setSyncStatus('synced');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setSyncStatus('error');
      throw err;
    }
  };

  // --- EXPORT & IMPORT ---
  const exportBackup = (): StorageExportData => {
    const catSet = new Set(settings.deviceCategories || []);
    const accCatSet = new Set(settings.accessoryCategories || []);
    const typeSet = new Set(settings.driveTypes || []);
    const formatSet = new Set(settings.formatOptions || []);
    const providerSet = new Set(settings.cloudProviders || []);

    devices.forEach((dev) => {
      const c = dev.category?.trim();
      if (c) catSet.add(c);
    });
    accessories.forEach((acc) => {
      const c = acc.category?.trim();
      if (c) accCatSet.add(c);
    });
    drives.forEach((dr) => {
      const dt = dr.driveType?.trim();
      if (dt) typeSet.add(dt);
      const fmt = dr.format?.trim();
      if (fmt) formatSet.add(fmt);
      const cp = dr.cloudProvider?.trim();
      if (cp) providerSet.add(cp);
    });

    return {
      app: 'Storage Tracker',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user: user?.email || user?.displayName || 'Local User',
      totalDevices: devices.length,
      totalDrives: drives.length,
      totalAccessories: accessories.length,
      devices,
      drives,
      accessories,
      settings: {
        driveTypes: Array.from(typeSet),
        formatOptions: Array.from(formatSet),
        deviceCategories: sanitizeCategoriesList(Array.from(catSet)),
        accessoryCategories: Array.from(accCatSet),
        cloudProviders: Array.from(providerSet),
      },
    };
  };

  const importBackup = async (
    data: StorageExportData,
    mode: 'merge' | 'replace'
  ): Promise<{ addedDevices: number; addedDrives: number; addedAccessories: number; newOptions: number }> => {
    let newCategories: Set<string>;
    let newAccCategories: Set<string>;
    let newDriveTypes: Set<string>;
    let newFormats: Set<string>;
    let newCloudProviders: Set<string>;
    let newOptionsCount = 0;

    if (mode === 'replace') {
      newCategories = new Set<string>(data.settings?.deviceCategories || []);
      newAccCategories = new Set<string>(data.settings?.accessoryCategories || []);
      newDriveTypes = new Set<string>(data.settings?.driveTypes || []);
      newFormats = new Set<string>(data.settings?.formatOptions || []);
      newCloudProviders = new Set<string>(
        Array.isArray(data.settings?.cloudProviders)
          ? data.settings!.cloudProviders
          : DEFAULT_CLOUD_PROVIDERS
      );
    } else {
      newCategories = new Set<string>(settings.deviceCategories || []);
      newAccCategories = new Set<string>(settings.accessoryCategories || DEFAULT_ACCESSORY_CATEGORIES);
      newDriveTypes = new Set<string>(settings.driveTypes || []);
      newFormats = new Set<string>(settings.formatOptions || []);
      newCloudProviders = new Set<string>(
        Array.isArray(settings.cloudProviders)
          ? settings.cloudProviders
          : DEFAULT_CLOUD_PROVIDERS
      );

      if (data.settings) {
        data.settings.driveTypes?.forEach((dt) => {
          const val = dt?.trim();
          if (val && !newDriveTypes.has(val)) {
            newDriveTypes.add(val);
            newOptionsCount++;
          }
        });
        data.settings.formatOptions?.forEach((f) => {
          const val = f?.trim();
          if (val && !newFormats.has(val)) {
            newFormats.add(val);
            newOptionsCount++;
          }
        });
        data.settings.deviceCategories?.forEach((c) => {
          const val = c?.trim();
          if (val && !newCategories.has(val)) {
            newCategories.add(val);
            newOptionsCount++;
          }
        });
        data.settings.accessoryCategories?.forEach((ac) => {
          const val = ac?.trim();
          if (val && !newAccCategories.has(val)) {
            newAccCategories.add(val);
            newOptionsCount++;
          }
        });
        data.settings.cloudProviders?.forEach((cp) => {
          const val = cp?.trim();
          if (val && !newCloudProviders.has(val)) {
            newCloudProviders.add(val);
            newOptionsCount++;
          }
        });
      }
    }

    // CRITICAL: Guarantee that EVERY category, driveType, format, and cloudProvider
    // used in imported devices, accessories, and network/cloud drives is automatically added to the catalogs!
    data.devices?.forEach((dev) => {
      const val = dev.category?.trim();
      if (val && !newCategories.has(val)) {
        newCategories.add(val);
        newOptionsCount++;
      }
    });

    data.accessories?.forEach((acc) => {
      const val = acc.category?.trim();
      if (val && !newAccCategories.has(val)) {
        newAccCategories.add(val);
        newOptionsCount++;
      }
    });

    data.drives?.forEach((dr: any) => {
      const typeVal = dr.driveType?.trim();
      if (typeVal && !newDriveTypes.has(typeVal)) {
        newDriveTypes.add(typeVal);
        newOptionsCount++;
      }
      const formatVal = dr.format?.trim();
      if (formatVal && !newFormats.has(formatVal)) {
        newFormats.add(formatVal);
        newOptionsCount++;
      }
      const providerVal = dr.cloudProvider?.trim();
      if (providerVal && !newCloudProviders.has(providerVal)) {
        newCloudProviders.add(providerVal);
        newOptionsCount++;
      }

      // Explicit category inside a network drive or general drive
      if (dr.category) {
        const catVal = String(dr.category).trim();
        if (catVal && !newCategories.has(catVal)) {
          newCategories.add(catVal);
          newOptionsCount++;
        }
      }
      if (Array.isArray(dr.categories)) {
        dr.categories.forEach((c: any) => {
          const catVal = String(c).trim();
          if (catVal && !newCategories.has(catVal)) {
            newCategories.add(catVal);
            newOptionsCount++;
          }
        });
      }

      // Network / Cloud drive category sync
      const isNetworkDrive =
        dr.storageMedium === 'cloud_network' ||
        /network|cloud|nas|smb|nfs|red/i.test(dr.driveType || '') ||
        /network|cloud|nas|smb|nfs|red/i.test(dr.drive || '');

      if (isNetworkDrive) {
        if (providerVal && !newCloudProviders.has(providerVal)) {
          newCloudProviders.add(providerVal);
          newOptionsCount++;
        }
        if (dr.tags && Array.isArray(dr.tags)) {
          dr.tags.forEach((tag: string) => {
            const trimmedTag = tag?.trim();
            if (trimmedTag && /nas|cloud|nube|servidor|server/i.test(trimmedTag)) {
              if (!newCategories.has(trimmedTag) && !newCloudProviders.has(trimmedTag)) {
                newCloudProviders.add(trimmedTag);
                newOptionsCount++;
              }
            }
          });
        }
      }
    });

    const sanitizedCategories = sanitizeCategoriesList(Array.from(newCategories));
    const updatedSettings: UserSettings = {
      driveTypes: Array.from(newDriveTypes),
      formatOptions: Array.from(newFormats),
      deviceCategories: sanitizedCategories,
      accessoryCategories: Array.from(newAccCategories),
      cloudProviders: Array.from(newCloudProviders),
      updatedAt: new Date().toISOString(),
    };

    // 2. Prepare imported entities
    let finalDevices: Device[];
    let finalDrives: StorageDrive[];
    let finalAccessories: Accessory[];

    if (mode === 'replace') {
      finalDevices = (data.devices || []).map((d) => ({
        ...d,
        rating: getSafeRating(d.rating, 5),
      }));
      finalDrives = data.drives || [];
      finalAccessories = (data.accessories || []).map((a) => ({
        ...a,
        rating: getSafeRating(a.rating, 5),
      }));
    } else {
      // Merge
      const existingDevIds = new Set(devices.map((d) => d.id));
      const existingDriveIds = new Set(drives.map((dr) => dr.id));
      const existingAccIds = new Set(accessories.map((a) => a.id));

      const newDevs = (data.devices || []).filter((d) => !existingDevIds.has(d.id)).map((d) => ({
        ...d,
        rating: getSafeRating(d.rating, 5),
      }));
      const newDrivesList = (data.drives || []).filter((dr) => !existingDriveIds.has(dr.id));
      const newAccsList = (data.accessories || []).filter((a) => !existingAccIds.has(a.id)).map((a) => ({
        ...a,
        rating: getSafeRating(a.rating, 5),
      }));

      finalDevices = [...newDevs, ...devices];
      finalDrives = [...newDrivesList, ...drives];
      finalAccessories = [...newAccsList, ...accessories];
    }

    if (!user) {
      setDevices(finalDevices);
      setDrives(finalDrives);
      setAccessories(finalAccessories);
      setSettings(updatedSettings);
      persistGuest(finalDevices, finalDrives, finalAccessories, updatedSettings);
    } else {
      // Cloud batch update
      setSyncStatus('syncing');
      const batch = writeBatch(db);

      if (mode === 'replace') {
        const devDocs = await getDocs(collection(db, 'users', user.uid, 'devices'));
        devDocs.forEach((d) => batch.delete(d.ref));

        const drDocs = await getDocs(collection(db, 'users', user.uid, 'drives'));
        drDocs.forEach((d) => batch.delete(d.ref));

        const accDocs = await getDocs(collection(db, 'users', user.uid, 'accessories'));
        accDocs.forEach((d) => batch.delete(d.ref));
      }

      finalDevices.forEach((dev) => {
        batch.set(doc(db, 'users', user.uid, 'devices', dev.id), cleanFirestoreData(dev));
      });

      finalDrives.forEach((dr) => {
        batch.set(doc(db, 'users', user.uid, 'drives', dr.id), cleanFirestoreData(dr));
      });

      finalAccessories.forEach((acc) => {
        batch.set(doc(db, 'users', user.uid, 'accessories', acc.id), cleanFirestoreData(acc));
      });

      batch.set(doc(db, 'users', user.uid, 'settings', 'config'), cleanFirestoreData(updatedSettings));

      await batch.commit();
      setDevices(finalDevices);
      setDrives(finalDrives);
      setAccessories(finalAccessories);
      setSettings(updatedSettings);
      setSyncStatus('synced');
    }

    return {
      addedDevices: data.devices?.length || 0,
      addedDrives: data.drives?.length || 0,
      addedAccessories: data.accessories?.length || 0,
      newOptions: newOptionsCount,
    };
  };

  return (
    <StorageContext.Provider
      value={{
        devices,
        drives,
        accessories,
        settings,
        syncStatus,
        isLoading,
        saveDevice,
        deleteDevice,
        saveAccessory,
        deleteAccessory,
        saveDrive,
        deleteDrive,
        updateEmulationScore,
        clearEmulationScore,
        addOption,
        deleteOption,
        reassignOptionBulk,
        reassignOptionIndividual,
        cascadeDeleteOption,
        cascadeDeleteOptionDrives,
        showOnboardingModal,
        closeOnboardingModal,
        confirmCloudImport,
        confirmCloudFresh,
        pendingImportCounts,
        atomicWipe,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
