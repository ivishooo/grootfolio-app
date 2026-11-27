/**
 * Groot: avatar animado (SVG 100×100), port de reference/groot-avatar.js del
 * handoff del rediseño v2 (ADR-0006).
 * Uso: <GrootAvatar mood="calm" pets={pets} size={62} />
 * El padre suma `pets` en cada toque. El cambio de `key` remonta el árbol y
 * dispara una sola vez el parpadeo lento, el «prrr» y el corazón.
 */
import type { CSSProperties } from 'react'
import type { GrootMood } from '@grootfolio/shared'
import './groot.css'

const O = '#E8913F' // naranja del pelaje
const D = '#C46B26' // rayas
const W = '#FFFAF3' // franja, hocico, pecho
const EYE = '#B9C97A'
const RING = '#6F7A3A'
const K = '#1F1A17'
const PINK = '#F3B1AE' // interior de las orejas
const NOSE = '#EE9A9C'

const loop = (name: string, dur: number, origin = 'center'): CSSProperties => ({
  animation: `${name} ${dur}s ease-in-out infinite`,
  transformOrigin: origin,
  transformBox: 'fill-box',
})
const once = (name: string, dur: number, origin = 'center'): CSSProperties => ({
  animation: `${name} ${dur}s ease-in-out both`,
  transformOrigin: origin,
  transformBox: 'fill-box',
})

export function GrootAvatar({ mood = 'calm', pets = 0, size = 62 }: { mood?: GrootMood; pets?: number; size?: number }) {
  const pet = pets > 0
  const scared = mood === 'scared'
  const happy = mood === 'happy' || pet
  const curious = mood === 'curious'

  const head = pet ? once('g-nuzzle', 1.1, '50% 90%')
    : scared ? loop('g-shiver', 0.35, '50% 90%')
    : curious ? loop('g-curious', 3, '50% 90%')
    : loop('g-tilt', 7, '50% 90%')
  // Asustado: orejas para atrás (aplastadas).
  const earL: CSSProperties = scared
    ? { transform: 'rotate(-28deg) translate(-2px,6px) scaleY(.82)', transformOrigin: '80% 100%', transformBox: 'fill-box' }
    : loop('g-ear-l', 5, '60% 100%')
  const earR: CSSProperties = scared
    ? { transform: 'rotate(28deg) translate(2px,6px) scaleY(.82)', transformOrigin: '20% 100%', transformBox: 'fill-box' }
    : {}

  return (
    <span key={pets} className="groot" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        <g className="groot-loop" style={loop('g-breathe', 3.6, '50% 100%')}>
          <ellipse cx={50} cy={114} rx={44} ry={30} fill={O} />
          <ellipse cx={50} cy={110} rx={27} ry={26} fill={W} />
          {/* collar rojo y chapita */}
          <path d="M28 86 Q50 96 72 86 L71 91 Q50 101 29 91 Z" fill="#D63A3A" />
          <path d="M46 95 L47.5 92 L49 94 L51 94 L52.5 92 L54 95 Q55 101 50 102 Q45 101 46 95 Z" fill="#C9CDD2" stroke="#9AA0A6" strokeWidth={0.6} />
          <g className="groot-loop" style={head}>
            <g className="groot-loop" style={earL}>
              <path d="M17 50 Q12 26 17 8 Q19 5 22 8 L45 29 Z" fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
              <path d="M22 42 Q19 26 22 15 L38 30 Z" fill={PINK} />
            </g>
            <g className="groot-loop" style={earR}>
              <path d="M83 50 Q88 26 83 8 Q81 5 78 8 L55 29 Z" fill={O} stroke={O} strokeWidth={2} strokeLinejoin="round" />
              <path d="M78 42 Q81 26 78 15 L62 30 Z" fill={PINK} />
            </g>
            <ellipse cx={50} cy={57} rx={34} ry={29} fill={O} />
            <rect x={40.5} y={31} width={2.6} height={8} rx={1.3} fill={D} />
            <rect x={56.9} y={31} width={2.6} height={8} rx={1.3} fill={D} />
            <rect x={17} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <rect x={18} y={59.5} width={6.5} height={2.2} rx={1.1} fill={D} />
            <rect x={75} y={54} width={8} height={2.2} rx={1.1} fill={D} />
            <rect x={75.5} y={59.5} width={6.5} height={2.2} rx={1.1} fill={D} />
            {/* franja blanca y hocico */}
            <path d="M50 30 Q46.5 40 45 50 Q44 58 40 64 Q34 72 37 80 Q50 89 63 80 Q66 72 60 64 Q56 58 55 50 Q53.5 40 50 30 Z" fill={W} />
            {happy ? (
              <>
                <path d="M30 57 Q36.5 50.5 43 57" stroke={K} strokeWidth={2.2} fill="none" strokeLinecap="round" />
                <path d="M57 57 Q63.5 50.5 70 57" stroke={K} strokeWidth={2.2} fill="none" strokeLinecap="round" />
                <ellipse cx={29} cy={66} rx={4.5} ry={2.4} fill="#F4A6A0" opacity={0.55} />
                <ellipse cx={71} cy={66} rx={4.5} ry={2.4} fill="#F4A6A0" opacity={0.55} />
              </>
            ) : (
              <g className="groot-loop" style={pet ? once('g-slowblink', 1.4) : loop('g-blink', 5)}>
                <ellipse cx={36.5} cy={55.5} rx={7} ry={7} fill={EYE} stroke={RING} strokeWidth={0.9} />
                <ellipse cx={63.5} cy={55.5} rx={7} ry={7} fill={EYE} stroke={RING} strokeWidth={0.9} />
                {scared ? (
                  <>
                    <circle cx={36.5} cy={55.8} r={4.8} fill={K} />
                    <circle cx={63.5} cy={55.8} r={4.8} fill={K} />
                  </>
                ) : (
                  <>
                    <ellipse cx={36.5} cy={55.8} rx={curious ? 3.2 : 1.9} ry={curious ? 5 : 5.2} fill={K} />
                    <ellipse cx={63.5} cy={55.8} rx={curious ? 3.2 : 1.9} ry={curious ? 5 : 5.2} fill={K} />
                  </>
                )}
                <circle cx={38.6} cy={53} r={1.6} fill="#fff" />
                <circle cx={65.6} cy={53} r={1.6} fill="#fff" />
              </g>
            )}
            <path d="M46.4 63 Q50 61.8 53.6 63 L50 67.2 Z" fill={NOSE} stroke={NOSE} strokeWidth={1} strokeLinejoin="round" />
            {scared ? (
              <path d="M46 71.5 Q48 70 50 71.5 Q52 70 54 71.5" stroke="#8A4B3A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
            ) : (
              <path d="M50 67.2 L50 69 M50 69 Q47.6 71.6 45.2 70.2 M50 69 Q52.4 71.6 54.8 70.2" stroke="#8A4B3A" strokeWidth={1.1} fill="none" strokeLinecap="round" />
            )}
            <g stroke="#fff" strokeWidth={0.7} strokeLinecap="round" opacity={0.95}>
              <line x1={40} y1={68} x2={19} y2={65} />
              <line x1={40} y1={70.5} x2={20} y2={73.5} />
              <line x1={60} y1={68} x2={81} y2={65} />
              <line x1={60} y1={70.5} x2={80} y2={73.5} />
            </g>
          </g>
        </g>
      </svg>
      {pet && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <text x={78} y={22} textAnchor="middle" fontSize={13} fontWeight={700} fill="#C2410C" stroke="#fff" strokeWidth={3} paintOrder="stroke" fontFamily="Inter, system-ui, sans-serif" style={once('g-prrr', 1.4)}>
            prrr
          </text>
          <path d="M22 18 c-2-3-7-1-5 3 l5 5 l5-5 c2-4-3-6-5-3z" fill="#F97316" style={once('g-heart', 1.3)} />
        </svg>
      )}
    </span>
  )
}
