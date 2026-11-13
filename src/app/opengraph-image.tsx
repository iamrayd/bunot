import { ImageResponse } from 'next/og';

export const alt = 'Bunot: draw your manito or manita from Santa’s jar';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The picture a chat app shows next to a shared room link. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#8f1a2a' }}>
        <div style={{
          width: 1090, height: 520, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#c2283a', border: '6px dashed #f2c14e', borderRadius: 48, color: '#fff3dc',
        }}>
          <svg width="150" height="150" viewBox="0 0 64 64">
            <path d="M32 6l7.6 15.8L57 24.1 44.4 36.4l3 17.4L32 45.6l-15.4 8.2 3-17.4L7 24.1l17.4-2.3z" fill="#f2c14e" />
          </svg>
          <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1.1, marginTop: 8 }}>Bunot</div>
          <div style={{ fontSize: 44, color: '#f2c14e', marginTop: 4 }}>Draw your manito or manita from Santa’s jar</div>
        </div>
      </div>
    ),
    size,
  );
}
