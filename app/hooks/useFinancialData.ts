'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

// ✅ CORRECTION : On importe depuis notre nouveau Hub 'logic'
import { INITIAL_PROFILE } from '@/app/lib/logic'; 

export function useFinancialData() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  
  const [profile, setProfile] = useState<any>(INITIAL_PROFILE);
  const [history, setHistory] = useState<any[]>([]); 
  const [isLoadingData, setIsLoadingData] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const { history: savedHistory, ...savedProfile } = data;
          setProfile({ ...INITIAL_PROFILE, ...savedProfile });
          setHistory(Array.isArray(savedHistory) ? savedHistory : []);
        } else {
           setProfile({ ...INITIAL_PROFILE, firstName: user.firstName || '' });
        }
      }
    } catch (error) {
      console.error("Erreur sync:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) { setIsLoadingData(false); return; }
    fetchData();
  }, [isClerkLoaded, user, fetchData]);

  const pushToDB = async (dataToSave: any) => {
    if (!user) return;
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error('Erreur API');
      return await response.json(); 
    } catch (error) { console.error("Erreur save:", error); throw error; }
  };

  const saveProfile = async (newProfile: any, forceImmediate = false) => {
    const updatedProfile = { ...profile, ...newProfile };
    setProfile(updatedProfile); 
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (forceImmediate) {
      return await pushToDB({ ...updatedProfile, history });
    } else {
      saveTimeoutRef.current = setTimeout(() => { pushToDB({ ...updatedProfile, history }); }, 1000); 
      return Promise.resolve();
    }
  };

  const saveDecision = async (decision: any) => {
    const newHistory = [...history, decision];
    setHistory(newHistory);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    return await pushToDB({ ...profile, history: newHistory });
  };

  const deleteDecision = async (idToDelete: string) => {
    const newHistory = history.filter((item: any) => item.id !== idToDelete);
    setHistory(newHistory);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    return await pushToDB({ ...profile, history: newHistory });
  };

  return { profile, history, saveProfile, saveDecision, deleteDecision, isLoaded: isClerkLoaded && !isLoadingData, user };
}