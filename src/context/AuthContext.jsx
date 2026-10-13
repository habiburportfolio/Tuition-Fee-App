"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("teacher"); // default role
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (authUser) => {
    if (!authUser) {
      setUserRole("teacher");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && data.role) {
        setUserRole(data.role);
      } else if (!data) {
        // Self-heal: Create teacher profile record if it doesn't exist yet
        const defaultName = authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Teacher User";
        const { data: newProfile, error: insertErr } = await supabase
          .from("teachers")
          .upsert([
            {
              id: authUser.id,
              email: authUser.email,
              full_name: defaultName,
              school_name: "বিদ্যালয়ের নাম",
              role: "teacher",
            },
          ], { onConflict: "id" })
          .select("role")
          .maybeSingle();

        if (insertErr) {
          console.error("Error creating teacher profile in self-heal:", insertErr);
          // If auth user was deleted from auth.users (foreign key error):
          if (insertErr.code === "23503") {
            console.warn("User does not exist in auth.users, signing out...");
            await supabase.auth.signOut();
            setUser(null);
          }
          setUserRole("teacher");
        } else if (newProfile && newProfile.role) {
          setUserRole(newProfile.role);
        } else {
          setUserRole("teacher");
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setUserRole("teacher");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setUser(null);
          setUserRole("teacher");
          setLoading(false);
          return;
        }

        // Verify with Supabase Auth whether this user still exists (prevents ghost session after user deletion)
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          console.warn("User does not exist in Supabase auth. Purging stale session:", userError);
          await supabase.auth.signOut();
          setUser(null);
          setUserRole("teacher");
          setLoading(false);
          return;
        }

        const authUser = userData.user;
        setUser(authUser);
        await fetchUserProfile(authUser);
      } catch (err) {
        console.error("fetchUser error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          setUser(null);
          setUserRole("teacher");
          return;
        }

        const authUser = session.user;
        setUser(authUser);
        await fetchUserProfile(authUser);
      }
    );

    // Offline sync logic
    const handleOnline = async () => {
      const { syncOfflinePayments } = await import("@/lib/offlineSync");
      await syncOfflinePayments(supabase);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      subscription?.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Purge local data on logout
    const { purgeAllLocalData } = await import("@/lib/offlineSync");
    purgeAllLocalData();
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
