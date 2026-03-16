import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0c0a09',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '160px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            20
          </div>
          <div
            style={{
              fontSize: '100px',
              fontWeight: 700,
              color: '#fbbf24',
              lineHeight: 1,
            }}
          >
            ?
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 600,
              color: '#a8a29e',
              marginTop: '24px',
            }}
          >
            AI Guessing Game
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
