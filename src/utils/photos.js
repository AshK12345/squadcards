import { supabase } from '../lib/supabase';

/**
 * Upload a base64 data-URL photo to Supabase Storage.
 * Returns the public URL, or null on failure (graceful degradation).
 */
export async function uploadPhoto(dataUrl, deviceId) {
  if (!supabase || !dataUrl?.startsWith('data:')) return null;
  try {
    const res  = await fetch(dataUrl);
    const blob = await res.blob();
    const ext  = blob.type.split('/')[1] || 'jpg';
    const path = `${deviceId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('card-photos')
      .upload(path, blob, { contentType: blob.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from('card-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('Photo upload failed — card saved without photo:', e.message);
    return null;
  }
}
