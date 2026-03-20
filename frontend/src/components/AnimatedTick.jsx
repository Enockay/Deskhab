import React from 'react'

export default function AnimatedTick({ size = 72, color = 'rgb(16,185,129)' }) {
  return (
    <div className="flex items-center justify-center">
      <style>{`
        @keyframes tickPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tickDraw {
          0% { stroke-dashoffset: 90; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'tickPop 520ms ease-out both' }}
      >
        <circle cx="32" cy="32" r="30" stroke="rgba(16,185,129,0.35)" strokeWidth="2" />
        <circle cx="32" cy="32" r="24" stroke="rgba(16,185,129,0.18)" strokeWidth="2" />
        <path
          d="M21 33.5L28 40.5L43.5 24.5"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 90,
            strokeDashoffset: 90,
            animation: 'tickDraw 620ms cubic-bezier(.2,.9,.2,1) 120ms both',
          }}
        />
      </svg>
    </div>
  )
}

