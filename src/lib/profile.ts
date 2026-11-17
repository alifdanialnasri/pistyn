import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';
import { todayISO } from './utils';

// Creates the user's profile on first sign-in and records the last active day (at most one write a day).
// Never blocks the app: if it fails (offline, rules not published yet) the app carries on without it.
export async function syncProfile(user: User): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const today = todayISO();
    if (!snap.exists()) {
      const profile: Omit<UserProfile, 'id'> = {
        email: (user.email ?? '').slice(0, 200),
        createdAt: new Date().toISOString(),
        lastActiveAt: today,
        plan: 'free',
      };
      if (user.displayName) profile.displayName = user.displayName.slice(0, 100);
      await setDoc(ref, profile);
      return { id: user.uid, ...profile };
    }
    const profile = { id: user.uid, ...snap.data() } as UserProfile;
    if (profile.lastActiveAt !== today && navigator.onLine) {
      await updateDoc(ref, { lastActiveAt: today });
      profile.lastActiveAt = today;
    }
    return profile;
  } catch (err) {
    console.warn('Profile sync skipped:', err);
    return null;
  }
}
