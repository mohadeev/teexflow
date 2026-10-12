import { ImageResponse } from 'next/og'

// The picture shown when a TeexFlow link is shared (WhatsApp, X, LinkedIn…).
export const alt = 'TeexFlow — the teleprompter that follows your voice'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background: 'radial-gradient(60% 70% at 50% 0%, #0b2a52 0%, #000 70%)',
          color: '#f5f5f7',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #3d9bff, #0a63ff)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 9,
              padding: '0 18px',
            }}
          >
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.45)' }} />
            <div style={{ height: 6, borderRadius: 3, background: '#fff' }} />
            <div style={{ height: 6, width: 22, borderRadius: 3, background: 'rgba(255,255,255,0.45)' }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>TeexFlow</div>
        </div>
        <div style={{ marginTop: 56, fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>
          The teleprompter that follows your voice
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: '#a1a1a6' }}>
          Code blocks for tutorials · PDF import · Phone remote · In your browser
        </div>
      </div>
    ),
    size
  )
}
