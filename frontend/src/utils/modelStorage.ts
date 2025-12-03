/**
 * IndexedDB Storage voor 3D Modellen en Structuur Data
 * Gebruikt IndexedDB in plaats van localStorage voor grote modellen
 */

import type { CADElement } from '../types'
import type { StructuurPuzzel } from './structuurPuzzel'

const DB_NAME = 'OntmantelingsplanDB'
const DB_VERSION = 2  // Verhoogd voor nieuwe stores
const MODELS_STORE = 'models'
const PUZZELS_STORE = 'puzzels'
const SETTINGS_STORE = 'settings'

export interface StoredModel {
  id: string
  naam: string
  elementen: CADElement[]
  metadata: {
    aantalPDFs: number
    kolommen: number
    liggers: number
    spanten: number
    overig: number
  }
  createdAt: string
}

export interface StoredPuzzel {
  id: string
  naam: string
  puzzel: StructuurPuzzel
  tekeningToewijzingen: Record<string, string>  // bestandsnaam -> aanzicht
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  laatstGeopendProject?: string
  tekeningToewijzingen?: Record<string, string>
  halConfig?: {
    aantalKolommen: number
    aantalRijen: number
    rasterX: number
    rasterY: number
    hoogte: number
    naam: string
    kolomProfiel: string
    liggerProfiel: string
    spantProfiel: string
  }
}

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Models store
      if (!db.objectStoreNames.contains(MODELS_STORE)) {
        db.createObjectStore(MODELS_STORE, { keyPath: 'id' })
      }
      
      // Puzzels store (nieuw)
      if (!db.objectStoreNames.contains(PUZZELS_STORE)) {
        db.createObjectStore(PUZZELS_STORE, { keyPath: 'id' })
      }
      
      // Settings store (nieuw)
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Sla een 3D model op in IndexedDB
 */
export async function saveModel(model: StoredModel): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MODELS_STORE, 'readwrite')
    const store = transaction.objectStore(MODELS_STORE)
    
    const request = store.put(model)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Laad een 3D model uit IndexedDB
 */
export async function loadModel(id: string): Promise<StoredModel | null> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MODELS_STORE, 'readonly')
    const store = transaction.objectStore(MODELS_STORE)
    
    const request = store.get(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Laad alle opgeslagen modellen
 */
export async function loadAllModels(): Promise<StoredModel[]> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MODELS_STORE, 'readonly')
    const store = transaction.objectStore(MODELS_STORE)
    
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Verwijder een model uit IndexedDB
 */
export async function deleteModel(id: string): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MODELS_STORE, 'readwrite')
    const store = transaction.objectStore(MODELS_STORE)
    
    const request = store.delete(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    transaction.oncomplete = () => db.close()
  })
}

// ============================================
// PUZZEL STORAGE
// ============================================

/**
 * Sla een structuur puzzel op
 */
export async function savePuzzel(puzzel: StoredPuzzel): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PUZZELS_STORE, 'readwrite')
    const store = transaction.objectStore(PUZZELS_STORE)
    
    const request = store.put(puzzel)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Laad een structuur puzzel
 */
export async function loadPuzzel(id: string): Promise<StoredPuzzel | null> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PUZZELS_STORE, 'readonly')
    const store = transaction.objectStore(PUZZELS_STORE)
    
    const request = store.get(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Laad alle opgeslagen puzzels
 */
export async function loadAllPuzzels(): Promise<StoredPuzzel[]> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PUZZELS_STORE, 'readonly')
    const store = transaction.objectStore(PUZZELS_STORE)
    
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
    
    transaction.oncomplete = () => db.close()
  })
}

// ============================================
// SETTINGS STORAGE
// ============================================

/**
 * Sla app instellingen op
 */
export async function saveSettings(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readwrite')
    const store = transaction.objectStore(SETTINGS_STORE)
    
    const request = store.put({ key, value, updatedAt: new Date().toISOString() })
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
    
    transaction.oncomplete = () => db.close()
  })
}

/**
 * Laad app instellingen
 */
export async function loadSettings<T>(key: string): Promise<T | null> {
  const db = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, 'readonly')
    const store = transaction.objectStore(SETTINGS_STORE)
    
    const request = store.get(key)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result?.value || null)
    
    transaction.oncomplete = () => db.close()
  })
}
