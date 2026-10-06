import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0B0D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 999,
            background: 'radial-gradient(circle at 35% 30%, #FFD3A8 0%, #F59E5B 45%, #E8708F 78%, #8B7CF6 100%)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
