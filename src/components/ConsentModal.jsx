export default function ConsentModal({ onConfirm, onCancel }) {
  return (
    <div className="consent-backdrop">
      <div className="consent-modal">
        <div className="consent-icon">🃏</div>
        <h2 className="consent-title">Before you open this pack</h2>
        <ul className="consent-list">
          <li>You confirm you are <strong>at least 13 years old</strong></li>
          <li>You consent to viewing <strong>user-generated content</strong> that we do not pre-screen</li>
          <li>You understand that Slop Cards enforces community guidelines and will remove users who create inappropriate content</li>
        </ul>
        <p className="consent-note">
          See something inappropriate? Report it and we'll take action.
        </p>
        <div className="consent-actions">
          <button className="btn btn-primary" onClick={onConfirm} type="button">
            I agree — open it 🔥
          </button>
          <button className="btn btn-secondary" onClick={onCancel} type="button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
