'use client';

/**
 * The gift tag with the drawn name. It stays face down until the guest taps it,
 * so a relative in the next seat does not read it. The name is not in the page at all while hidden.
 */
export default function ResultTag({ name, wish, revealed, onToggle }: { name: string; wish: string; revealed: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={'tag' + (revealed ? '' : ' sealed')} onClick={onToggle} aria-expanded={revealed}>
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
  );
}
