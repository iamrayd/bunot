'use client';

import { SWEATERS } from '@/lib/types';
import type { Identity } from '@/lib/client';

const SWEATER_NAMES = ['Berry red', 'Pine green', 'Gold', 'Snow blue', 'Plum', 'Cream'];

/** Name, PIN, and sweater color. Shared by "create room" and "join room". */
export default function IdentityFields({ value, onChange, idPrefix }: { value: Identity; onChange: (v: Identity) => void; idPrefix: string }) {
  return (
    <>
      <div className="row">
        <div className="field">
          <label htmlFor={`${idPrefix}-name`}>Your name</label>
          <input id={`${idPrefix}-name`} type="text" maxLength={14} autoComplete="off" placeholder="e.g. Sheryll"
            value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div className="field pin">
          <label htmlFor={`${idPrefix}-pin`}>PIN</label>
          <input id={`${idPrefix}-pin`} type="text" inputMode="numeric" autoComplete="off" placeholder="4 digits"
            value={value.pin} onChange={(e) => onChange({ ...value, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
        </div>
      </div>
      <fieldset>
        <legend>Sweater</legend>
        <div className="swatches">
          {SWEATERS.map((c, i) => (
            <label key={c} aria-label={SWEATER_NAMES[i]} title={SWEATER_NAMES[i]}>
              <input type="radio" name={`${idPrefix}-sweater`} checked={value.sweater === c} onChange={() => onChange({ ...value, sweater: c })} />
              <i style={{ ['--c' as string]: `#${c.toString(16).padStart(6, '0')}` }} />
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
