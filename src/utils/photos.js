import { supabase } from '../lib/supabase';

/**
 * Compress a data-URL image to a max width and JPEG quality.
 * Returns a smaller data-URL (~30-60 KB). Falls back to the original on error.
 */
async function compressImage(dataUrl, maxWidth = 360, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Upload a base64 data-URL photo to Supabase Storage.
 * Returns the public URL if the bucket is accessible, otherwise falls back to
 * a compressed data-URL stored directly in the DB (~30-60 KB).
 * Returns null if no photo was provided.
 */
export async function uploadPhoto(dataUrl, deviceId) {
  if (!supabase || !dataUrl?.startsWith('data:')) return null;

  // Compress first — keeps the fallback data-URL small enough for the DB column
  const compressed = await compressImage(dataUrl, 360, 0.72);

  try {
    const res  = await fetch(compressed);
    const blob = await res.blob();
    const ext  = blob.type.split('/')[1] || 'jpg';
    const path = `${deviceId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('card-photos')
      .upload(path, blob, { contentType: blob.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from('card-photos').getPublicUrl(path);

    // Verify the public URL actually loads (bucket may not be public)
    try {
      const check = await fetch(data.publicUrl, { method: 'HEAD' });
      if (check.ok) return data.publicUrl;
    } catch { /* fall through */ }

    // Storage URL not accessible — store compressed data-URL in the DB instead
    console.warn('card-photos bucket may not be public; storing compressed data-URL in DB.');
    return compressed;
  } catch (e) {
    console.warn('Photo upload failed — storing compressed data-URL:', e.message);
    return compressed;
  }
}
