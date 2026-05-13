import { useRef } from 'react';

export default function PhotoUpload({ photoSrc, onPhoto }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
