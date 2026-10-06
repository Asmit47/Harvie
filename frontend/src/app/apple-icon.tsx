import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 999,
            background: 'radial-gradient(circle at 35% 30%, #FFD3A8 0%, #F59E5B 42%, #E8708F 74%, #8B7CF6 100%)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
