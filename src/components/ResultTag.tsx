'use client';

/**
 * The gift tag with the drawn name. Tapping it opens a full-screen reveal
 * overlay showing the name and wish-list in bullet form.
 * A "Back" button (or tapping the backdrop) closes it.
 */
export default function ResultTag({ name, wish, revealed, onToggle }: {
  name: string;
  wish: string;
  revealed: boolean;
  onToggle: () => void;
}) {
  /** Split a free-text wish string into bullet items. */
  function wishItems(raw: string): string[] {
    if (!raw.trim()) return [];
    return raw
      .split(/[,;|\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const items = wishItems(wish);

  return (
    <>
      {/* ── The tag itself (always visible) ── */}
      <button
        type="button"
        className={'tag' + (revealed ? '' : ' sealed')}
        onClick={onToggle}
        aria-expanded={revealed}
        aria-haspopup="dialog"
      >
        {revealed ? (
          <>
            <small>Your manito / manita is</small>
            <strong>{name}</strong>
            <em>{wish ? `Wish: ${wish}` : 'No wish written yet.'}</em>
            <small className="tap">Tap to hide</small>
          </>
        ) : (
          <>
            <small>Your manito / manita</small>
            <strong>Tap to peek</strong>
            <small className="tap">Check that nobody is looking.</small>
          </>
        )}
      </button>

      {/* ── Full-screen reveal overlay ── */}
      {revealed && (
        <div
          className="wish-reveal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Your manito is ${name}`}
          onClick={(e) => { if (e.target === e.currentTarget) onToggle(); }}
        >
          <div className="wish-reveal-card">

            {/* Back button */}
            <button
              type="button"
              className="wish-reveal-back"
              onClick={onToggle}
              aria-label="Close and go back"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Back
            </button>

            {/* Eyelet decoration */}
            <div className="wish-reveal-eyelet" aria-hidden="true" />

            {/* Sub-label */}
            <p className="wish-reveal-sub">Your manito / manita is</p>

            {/* Name */}
            <h2 className="wish-reveal-name">{name}</h2>

            {/* Divider */}
            <div className="wish-reveal-divider" aria-hidden="true">✦ ✦ ✦</div>

            {/* Wish list */}
            {items.length > 0 ? (
              <>
                <p className="wish-reveal-label">Their wish list</p>
                <ul className="wish-reveal-list" aria-label="Wish list items">
                  {items.map((item, i) => (
                    <li key={i} className="wish-reveal-item">
                      <span className="wish-reveal-bullet" aria-hidden="true">✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="wish-reveal-empty">No wish written yet — surprise them! 🎁</p>
            )}

            {/* Footer */}
            <p className="wish-reveal-secret">🤫 Keep it a secret!</p>
          </div>
        </div>
      )}
    </>
  );
}
