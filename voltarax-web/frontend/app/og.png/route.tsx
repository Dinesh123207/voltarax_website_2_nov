import { ImageResponse } from 'next/og';
export function GET() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: 'linear-gradient(135deg, #07110b, #163d26)', color: '#e2e8f0' }}>
    <div style={{ display: 'flex', fontSize: 72, color: '#86efac', fontWeight: 700 }}>Voltarax</div>
    <div style={{ display: 'flex', fontSize: 44, marginTop: 26 }}>Renewable equipment monitoring</div>
    <div style={{ display: 'flex', fontSize: 28, marginTop: 28 }}>Measurements · estimates · dated records</div>
    <div style={{ display: 'flex', fontSize: 23, marginTop: 45, color: '#cbd5e1' }}>Software under development · Field performance unverified</div>
  </div>, { width: 1200, height: 630 });
}
