import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useFirebaseUser } from "@/hooks/useFirebaseUser";
import { subscribeToProfile, getProfile } from "@/lib/firestore/users";
import type { UserProfile } from "@/types/user";

export function useFriends() {
  const { user } = useUser();
  const fbUser = useFirebaseUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !fbUser) return;
    const unsub = subscribeToProfile(
      user.id,
      (p) => { setProfile(p); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [user?.id, fbUser?.uid]);

  // Load friend profiles whenever the friends list changes
  useEffect(() => {
    if (!profile?.friends?.length) {
      setFriendProfiles([]);
      return;
    }
    let cancelled = false;
    Promise.all(profile.friends.map((id) => getProfile(id))).then((profiles) => {
      if (!cancelled) setFriendProfiles(profiles.filter(Boolean) as UserProfile[]);
    });
    return () => { cancelled = true; };
  }, [profile?.friends?.join(",")]);

  return {
    profile,
    friends: profile?.friends ?? [],
    friendProfiles,
    pendingFrom: profile?.pendingFrom ?? [],
    loading,
  };
}
