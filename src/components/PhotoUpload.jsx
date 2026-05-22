import { useRef } from 'react';

// Resize photo to max 1000px on longest side, JPEG q=0.82.
// Keeps base64 payload well under Vercel's 4.5 MB body limit.
function resizePhoto(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1000;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h / w) * MAX); w = MAX; }
        else        { w = Math.round((w / h) * MAX); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function PhotoUpload({ photoSrc, onPhoto }) {
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resized = await resizePhoto(file);
    if (resized) { onPhoto(resized); return; }
    // fallback: read raw if canvas resize fails
    const reader = new FileReader();
    reader.onload = (ev) => onPhoto(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="photo-upload-area"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {photoSrc ? (
        <img
          src={photoSrc}
          alt="uploaded"
          style={{ maxHeight: 90, borderRadius: 6 }}
        />
      ) : (
        <>
          <div style={{ fontSize: 28 }}>📸</div>
          <div className="photo-upload-text">Tap to upload a pic</div>
        </>
      )}
    </div>
  );
}
