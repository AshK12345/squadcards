import { useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase';
import { useDeviceId } from './useDeviceId';
import { uploadPhoto } from '../utils/photos';
import { DEFAULT_STATS } from '../constants';

const LS_KEY = 'sc-collection';

function dbToCard(row) {
  return {
    id:      row.id,
    name:    row.name    || 'Unknown',
    type:    row.type    || '',
    rarity:  row.rarity  || 'common',
    flavor:  row.flavor  || '',
    photo:   row.photo_url || null,
    stats:   Array.isArray(row.stats) ? row.stats : DEFAULT_STATS.map(s => ({ ...s })),
    created_at: row.created_at,
  };
}

export function useCards() {
  const deviceId = useDeviceId();
  const [cards, setCards]   = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── initial load ── */
  useEffect(() => {
    if (SUPABASE_ENABLED && deviceId) {
      supabase
        .from('cards')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at')
        .then(({ data, error }) => {
          if (!error && data) setCards(data.map(dbToCard));
          setLoading(false);
        });
    } else {
      // localStorage fallback
      try {
        setCards(JSON.parse(localStorage.getItem(LS_KEY) || '[]'));
      } catch { /* ignore */ }
      setLoading(false);
    }
  }, [deviceId]);

  /* ── add card (optimistic) ── */
  const addCard = useCallback(async (cardData) => {
    const tempId  = `temp-${Date.now()}`;
    const tempCard = { ...cardData, id: tempId };

    // Show in UI immediately
    setCards(prev => [...prev, tempCard]);

    if (!SUPABASE_ENABLED || !deviceId) {
      setCards(prev => {
        localStorage.setItem(LS_KEY, JSON.stringify(prev));
        return prev;
      });
      return tempCard;
    }

    // Upload photo if it's a data URL
    let photoUrl = null;
    if (cardData.photo?.startsWith('data:')) {
      photoUrl = await uploadPhoto(cardData.photo, deviceId);
    }

    const { data, error } = await supabase
      .from('cards')
      .insert({
        device_id: deviceId,
        name:      cardData.name    || 'Unknown',
        type:      cardData.type    || '',
        rarity:    cardData.rarity  || 'common',
        flavor:    cardData.flavor  || '',
        photo_url: photoUrl,
        stats:     cardData.stats   || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Card save failed:', error.message);
      return tempCard; // keep the optimistic entry
    }

    // Swap temp entry for the real Supabase row
    const realCard = { ...dbToCard(data), photo: photoUrl || cardData.photo };
    setCards(prev => prev.map(c => c.id === tempId ? realCard : c));
    return realCard;
  }, [deviceId]);

  /* ── remove card ── */
  const removeCard = useCallback(async (id) => {
    setCards(prev => {
      const next = prev.filter(c => c.id !== id);
      if (!SUPABASE_ENABLED) localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
    if (SUPABASE_ENABLED) {
      await supabase.from('cards').delete().eq('id', id);
    }
  }, []);

  return { cards, loading, addCard, removeCard };
}
