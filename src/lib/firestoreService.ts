import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { DEMO_MODE } from './demoConfig';
import { Attachment, CollectionName } from '../types';

export const MAX_UPLOAD_MB = 10;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  UPLOAD = 'upload',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') {
    throw new Error('The database refused this change. Make sure the latest Firestore rules are published.');
  }
  if (code === 'unavailable') {
    throw new Error('Cannot reach the database. Check your internet connection.');
  }
  throw new Error(`Could not ${operationType} ${path ?? 'data'}. Please try again.`);
}

function checkDemoMode() {
  if (DEMO_MODE) {
    throw new Error("Firebase blocked in DEMO_MODE");
  }
}

function requireUser() {
  if (!auth.currentUser) throw new Error('Your session has ended. Please sign in again.');
  return auth.currentUser;
}

// Firestore keeps offline writes pending without resolving, which would leave forms stuck on "Saving"
function requireOnline() {
  if (!navigator.onLine) throw new Error("You're offline. Connect to the internet to save changes.");
}

// Firestore rejects undefined values anywhere in a document
function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return value;
}

// On update, a top-level undefined means "clear this field"
function toUpdate(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? deleteField() : stripUndefined(v)])
  );
}

export const FirestoreService = {
  async list<T>(col: CollectionName): Promise<T[]> {
    checkDemoMode();
    const user = auth.currentUser;
    if (!user) return [];
    try {
      // Equality filter only, so no composite index is needed; sorting happens in the app
      const snapshot = await getDocs(query(collection(db, col), where('ownerId', '==', user.uid)));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as T);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, col);
    }
  },

  async add(col: CollectionName, data: Record<string, unknown>): Promise<string> {
    checkDemoMode();
    requireOnline();
    const user = requireUser();
    try {
      const docRef = await addDoc(collection(db, col), stripUndefined({
        ...data,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      }) as Record<string, unknown>);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, col);
    }
  },

  async update(col: CollectionName, id: string, data: Record<string, unknown>) {
    checkDemoMode();
    requireOnline();
    requireUser();
    try {
      await updateDoc(doc(db, col, id), {
        ...toUpdate(data),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${col}/${id}`);
    }
  },

  // Deletes all given documents together: either every one is removed or none are
  async remove(items: { col: CollectionName; id: string }[]) {
    checkDemoMode();
    requireOnline();
    requireUser();
    try {
      for (let i = 0; i < items.length; i += 450) {
        const batch = writeBatch(db);
        items.slice(i, i + 450).forEach(({ col, id }) => batch.delete(doc(db, col, id)));
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, items[0]?.col ?? null);
    }
  },

  async uploadFile(file: File): Promise<Attachment> {
    checkDemoMode();
    requireOnline();
    const user = requireUser();
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      throw new Error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB.`);
    }

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `receipts/${user.uid}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return { name: file.name.slice(0, 100), url, contentType: file.type || undefined };
    } catch (error: any) {
      console.error('Storage Upload Error Detail:', error);
      if (error.code === 'storage/unauthorized') {
        throw new Error('Upload failed: Security rules denied access. Ensure Storage is enabled in Firebase Console.');
      } else if (error.code === 'storage/retry-limit-exceeded') {
        throw new Error('Upload failed: Network timeout. Check your connection.');
      }
      handleFirestoreError(error, OperationType.UPLOAD, 'storage/receipts');
    }
  }
};

export type DataApi = typeof FirestoreService;
