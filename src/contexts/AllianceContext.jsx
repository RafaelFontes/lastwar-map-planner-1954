import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Export the context so admin providers can use the same context object
export const AllianceContext = createContext({});

// Color palette - Maximally distinct colors for easy visual differentiation
// Colors are ordered to maximize contrast between adjacent assignments
const ALLIANCE_COLORS = [
  '#E53935', // Bright Red
  '#1E88E5', // Strong Blue
  '#43A047', // Forest Green
  '#FB8C00', // Vivid Orange
  '#8E24AA', // Deep Purple
  '#00ACC1', // Cyan
  '#FFD600', // Bright Yellow
  '#D81B60', // Magenta/Pink
  '#6D4C41', // Brown
  '#00E676', // Neon Green
  '#3949AB', // Indigo
  '#FF6D00', // Deep Orange
  '#00897B', // Teal
  '#C2185B', // Dark Pink
  '#7CB342', // Lime Green
  '#5E35B1', // Violet
  '#039BE5', // Light Blue
  '#E65100', // Burnt Orange
  '#00BFA5', // Aqua
  '#AD1457', // Burgundy
  '#9E9D24', // Olive
  '#0277BD', // Ocean Blue
  '#F4511E', // Coral Red
  '#1B5E20', // Dark Green
  '#6A1B9A', // Grape
  '#FF8F00', // Amber
  '#00838F', // Dark Cyan
  '#B71C1C', // Dark Red
  '#827717', // Dark Lime
  '#4527A0', // Royal Purple
  '#EF6C00', // Tangerine
  '#004D40', // Dark Teal
  '#880E4F', // Wine
  '#33691E', // Army Green
  '#1565C0', // Royal Blue
  '#BF360C', // Rust
  '#311B92', // Deep Indigo
  '#FF6F00', // Mango
  '#006064', // Petrol
  '#4A148C', // Plum
];

export function AllianceProvider({ children }) {
  const { user } = useAuth();
  const [alliance, setAlliance] = useState(null);
  const [allAlliances, setAllAlliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllianceModal, setShowAllianceModal] = useState(false);

  // Load all alliances (for color mapping)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    loadAlliances();
  }, []);

  // Load user's alliance when user changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) {
      setAlliance(null);
      setLoading(false);
      return;
    }

    loadUserAlliance();
  }, [user]);

  const loadAlliances = async () => {
    try {
      const { data, error } = await supabase
        .from('alliances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading alliances:', error);
        return;
      }

      setAllAlliances(data || []);
    } catch (error) {
      console.error('Error loading alliances:', error);
    }
  };

  const loadUserAlliance = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's profile with alliance
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('alliance_id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      if (profile?.alliance_id) {
        // Load alliance details
        const { data: allianceData, error: allianceError } = await supabase
          .from('alliances')
          .select('*')
          .eq('id', profile.alliance_id)
          .single();

        if (allianceError) {
          console.error('Error loading alliance:', allianceError);
        } else {
          setAlliance(allianceData);
          setShowAllianceModal(false);
        }
      } else {
        // No alliance, check if profile exists at all
        if (!profile) {
          // New user - will need to set up profile first
          setShowAllianceModal(false);
        } else {
          // Profile exists but no alliance - show modal
          setShowAllianceModal(true);
        }
      }
    } catch (error) {
      console.error('Error loading user alliance:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinAlliance = useCallback(async (allianceName) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('join_alliance', {
        p_alliance_name: allianceName.trim()
      });

      if (error) {
        console.error('Error joining alliance:', error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Set the alliance
      setAlliance(data);
      setShowAllianceModal(false);

      // Reload all alliances to include new one
      await loadAlliances();

      return { success: true, alliance: data };
    } catch (error) {
      console.error('Error joining alliance:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  // Get alliance by ID
  const getAllianceById = useCallback((allianceId) => {
    return allAlliances.find(a => a.id === allianceId) || null;
  }, [allAlliances]);

  // Get alliance color by ID (using color_index to look up from palette)
  const getAllianceColor = useCallback((allianceId) => {
    const found = getAllianceById(allianceId);
    if (!found) return '#f8f9fa';
    // Support both color (hex) and color_index (number)
    if (found.color) return found.color;
    if (found.color_index !== undefined) return ALLIANCE_COLORS[found.color_index] || '#f8f9fa';
    return '#f8f9fa';
  }, [getAllianceById]);

  // Get alliance name by ID
  const getAllianceName = useCallback((allianceId) => {
    const found = getAllianceById(allianceId);
    return found?.name || null;
  }, [getAllianceById]);

  const value = {
    alliance,
    allAlliances,
    loading,
    showAllianceModal,
    setShowAllianceModal,
    joinAlliance,
    loadUserAlliance,
    loadAlliances,
    getAllianceById,
    getAllianceColor,
    getAllianceName,
    isAdmin: false,
  };

  return (
    <AllianceContext.Provider value={value}>
      {children}
    </AllianceContext.Provider>
  );
}

export function useAlliance() {
  const context = useContext(AllianceContext);
  if (context === undefined) {
    throw new Error('useAlliance must be used within an AllianceProvider');
  }
  return context;
}
