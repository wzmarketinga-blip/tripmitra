import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const defaultProfile = {
  fullName: "",
  city: "",
  state: "",
  languages: "",
  interests: "",
  travelStyle: "",
  about: "",
  photo: "",
  phoneVerified: false,
  identityVerified: false,
  registrationPaid: false,
};

const ProfileContext = createContext({
  profile: defaultProfile,
  updateProfile: () => {},
  loading: true,
  user: null,
});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(defaultProfile);
      setLoading(false);
      return;
    }

    setUser(authUser);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Profile loading error:",
          error
        );
      }

      if (data) {
        setProfile({
          fullName: data.full_name || "",
          city: data.city || "",
          state: data.state || "",
          languages: data.languages || "",
          interests:
            data.travel_interests ||
            data.interests ||
            "",
          travelStyle:
            data.travel_style || "",
          about: data.about || "",
          photo: data.photo_url || "",
          phoneVerified:
            data.phone_verified || false,
          identityVerified:
            data.identity_verified || false,
          registrationPaid:
            data.registration_paid || false,
        });
      } else {
        setProfile({
          ...defaultProfile,
          fullName:
            authUser.user_metadata?.full_name || "",
          email: authUser.email || "",
        });
      }
    } catch (error) {
      console.error(
        "Profile context error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      await loadProfile(session?.user || null);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        await loadProfile(
          session?.user || null
        );
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (newData) => {
    setProfile((prev) => ({
      ...prev,
      ...newData,
    }));

    if (!user) return;

    try {
      const databaseData = {
        full_name: newData.fullName,
        city: newData.city,
        state: newData.state,
        languages: newData.languages,
        travel_interests: newData.interests,
        travel_style: newData.travelStyle,
        about: newData.about,
      };

      const { error } = await supabase
        .from("profiles")
        .update(databaseData)
        .eq("id", user.id);

      if (error) {
        console.error(
          "Profile update error:",
          error
        );
      }
    } catch (error) {
      console.error(
        "Profile update failed:",
        error
      );
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile,
        loading,
        user,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}