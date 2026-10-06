import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Harvie, the AI assistant that follows through';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0B0D',
          color: '#EDEDEF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 42, fontWeight: 600, letterSpacing: -0.6 }}>
          <span>harv</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 3px 2px' }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 99,
                background: 'radial-gradient(circle at 35% 30%, #FFD3A8, #F59E5B 50%, #E8708F)',
                marginBottom: 5,
              }}
            />
            <span style={{ width: 5, height: 24, borderRadius: 3, background: '#EDEDEF' }} />
          </span>
          <span>e</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
          <div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2, lineHeight: 1.02 }}>
            The AI assistant that follows through.
          </div>
          <div style={{ fontSize: 24, color: '#A1A4AB' }}>
            Remembers your work. Acts with your OK. Keeps the loop open until it is done.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
