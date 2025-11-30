import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'profitbuild_report_favorites';

export function useReportFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setFavorites(new Set(parsed));
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  }, [favorites]);

  const toggleFavorite = useCallback((reportId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((reportId: string) => {
    return favorites.has(reportId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
  }, []);

  return {
    favorites: Array.from(favorites),
    isFavorite,
    toggleFavorite,
    clearFavorites,
  };
}

