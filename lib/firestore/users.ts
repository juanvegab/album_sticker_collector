import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

const userRef = (userId: string) => doc(db, "users", userId);

export async function createOrUpdateProfile(
  userId: string,
  name: string,
  avatarUrl?: string
): Promise<void> {
  const ref = userRef(userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      userId,
      name,
      avatarUrl: avatarUrl ?? null,
      friends: [],
      pendingFrom: [],
      expoPushToken: null,
      createdAt: Date.now(),
    });
  } else {
    // Keep profile name/avatar in sync with Clerk
    await updateDoc(ref, { name, avatarUrl: avatarUrl ?? null });
  }
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(userId));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeToProfile(
  userId: string,
  onData: (profile: UserProfile | null) => void
): () => void {
  return onSnapshot(userRef(userId), (snap) => {
    onData(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function saveExpoPushToken(userId: string, token: string): Promise<void> {
  await updateDoc(userRef(userId), { expoPushToken: token });
}

/** A sends a friend request to B: adds A's userId to B's pendingFrom */
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
  await updateDoc(userRef(toUserId), { pendingFrom: arrayUnion(fromUserId) });
}

/** B accepts A's request: both become friends, remove from pendingFrom */
export async function acceptFriendRequest(
  myUserId: string,
  requesterId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(userRef(myUserId), {
    friends: arrayUnion(requesterId),
    pendingFrom: arrayRemove(requesterId),
  });
  batch.update(userRef(requesterId), {
    friends: arrayUnion(myUserId),
  });
  await batch.commit();
}

/** B rejects A's request */
export async function rejectFriendRequest(
  myUserId: string,
  requesterId: string
): Promise<void> {
  await updateDoc(userRef(myUserId), { pendingFrom: arrayRemove(requesterId) });
}

/** Remove an existing friendship from both sides */
export async function removeFriend(myUserId: string, friendId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(userRef(myUserId), { friends: arrayRemove(friendId) });
  batch.update(userRef(friendId), { friends: arrayRemove(myUserId) });
  await batch.commit();
}
