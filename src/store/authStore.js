// src/store/authStore.js
import { create } from 'zustand';
import { supabase } from '../supabaseClient';

const useAuthStore = create((set) => ({
  session: null,
  user: null,
  profile: null, // Add profile state
  loading: true, // Start loading until session is checked
  error: null,

  // Check existing session
  checkSession: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        // Fetch profile if user exists
        await useAuthStore.getState().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking session:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Sign Up
  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Note: Supabase might require email confirmation
      set({ session: data.session, user: data.user });
      if (data.user) {
         await useAuthStore.getState().fetchProfile(data.user.id); // Fetch profile on sign up
      }
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      set({ error: error.message });
      return { error };
    } finally {
      set({ loading: false });
    }
  },

  // Log In
  logIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ session: data.session, user: data.user });
       if (data.user) {
         await useAuthStore.getState().fetchProfile(data.user.id); // Fetch profile on login
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      set({ error: error.message });
      return { error };
    } finally {
      set({ loading: false });
    }
  },

  // Log Out
  logOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, profile: null }); // Clear profile on logout
    } catch (error) {
      console.error('Logout error:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch User Profile
  fetchProfile: async (userId) => {
     set({ loading: true }); // Can indicate profile loading specifically if needed
     try {
         if (!userId) {
             set({ profile: null });
             return;
         }
         let { data, error, status } = await supabase
             .from('profiles')
             .select(`name, photo_url, available_equipment`) // Add fields as needed
             .eq('id', userId)
             .single();

         if (error && status !== 406) { // 406 means no row found, which is ok initially
             throw error;
         }

         if (data) {
             set({ profile: data });
         } else {
              set({ profile: {} }); // Set an empty object if profile doesn't exist yet
         }
     } catch (error) {
         console.error('Error fetching profile:', error);
         // Optionally set an error state for profile fetching
     } finally {
        // set({ loading: false }); // Decide if profile loading should affect global loading
     }
  },

   // Update User Profile
  updateProfile: async (updates) => {
      const user = useAuthStore.getState().user;
      if (!user) return { error: { message: 'User not logged in' } };

      set({ loading: true, error: null });
      try {
          const { error } = await supabase
              .from('profiles')
              .update({ ...updates, updated_at: new Date().toISOString() })
              .eq('id', user.id);

          if (error) throw error;
           // Re-fetch profile to update state
           await useAuthStore.getState().fetchProfile(user.id);
           return { success: true }
      } catch (error) {
          console.error('Error updating profile:', error);
          set({ error: error.message });
          return { error };
      } finally {
          set({ loading: false });
      }
  },

  // Listener for Auth Changes
  subscribeAuthChanges: () => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        set({ session, user: session?.user ?? null, loading: false });
         if (session?.user) {
            useAuthStore.getState().fetchProfile(session.user.id);
         } else {
             set({ profile: null }); // Clear profile if logged out
         }
      }
    );
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  },
}));

// Initial check and subscription setup
useAuthStore.getState().checkSession();
const unsubscribe = useAuthStore.getState().subscribeAuthChanges();
// Note: Consider calling unsubscribe on app unmount if needed, though Zustand often handles this well.

export default useAuthStore;