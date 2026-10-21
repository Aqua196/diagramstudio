// 品牌标：三个相连的节点（方块→菱形→圆），寓意「一套引擎三种图」。只用令牌色。
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="ds-brand">
      <rect width={24} height={24} rx={7} fill="var(--accent)" />
      <path
        d="M8.5 8.2 L15.3 8.2 M15.6 9.6 L9.6 15.2"
        stroke="var(--accent-ink)"
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={0.75}
      />
      <rect x={4.6} y={5.8} width={4.8} height={4.8} rx={1.3} fill="var(--accent-ink)" />
      <path d="M17.2 5 L19.8 7.6 L17.2 10.2 L14.6 7.6 Z" fill="var(--accent-ink)" />
      <circle cx={8.4} cy={16.4} r={2.6} fill="var(--accent-ink)" />
    </svg>
  )
}
