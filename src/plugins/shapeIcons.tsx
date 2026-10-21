// 形状坞/连接菜单用的 20×20 线框图标：currentColor 描边，随按钮状态变色。
import type { ReactNode } from 'react'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const shapeIcons: Record<string, ReactNode> = {
  process: (
    <Icon>
      <rect x={2.5} y={5} width={15} height={10} rx={2} />
    </Icon>
  ),
  terminator: (
    <Icon>
      <rect x={2} y={5.5} width={16} height={9} rx={4.5} />
    </Icon>
  ),
  decision: (
    <Icon>
      <path d="M10 2.5 L17.5 10 L10 17.5 L2.5 10 Z" />
    </Icon>
  ),
  io: (
    <Icon>
      <path d="M5.5 5 H18 L14.5 15 H2 Z" />
    </Icon>
  ),
  subprocess: (
    <Icon>
      <rect x={2.5} y={5} width={15} height={10} rx={1} />
      <path d="M5.5 5 V15 M14.5 5 V15" />
    </Icon>
  ),
  database: (
    <Icon>
      <ellipse cx={10} cy={5.5} rx={6.5} ry={2.5} />
      <path d="M3.5 5.5 V14.5 C3.5 15.9 6.4 17 10 17 C13.6 17 16.5 15.9 16.5 14.5 V5.5" />
    </Icon>
  ),
  document: (
    <Icon>
      <path d="M3 4 H17 V14.5 C14.5 13 12.5 16.5 10 15.5 C7.5 14.5 5.5 13.5 3 15 Z" />
    </Icon>
  ),
  connector: (
    <Icon>
      <circle cx={10} cy={10} r={5} />
    </Icon>
  ),
  terminator2: (
    <Icon>
      <circle cx={10} cy={10} r={7} />
      <circle cx={10} cy={10} r={4} />
    </Icon>
  ),
  note: (
    <Icon>
      <path d="M3 3.5 H13.5 L17 7 V16.5 H3 Z" />
      <path d="M13.5 3.5 V7 H17" />
    </Icon>
  ),
  centerTopic: (
    <Icon>
      <rect x={3} y={6} width={14} height={8} rx={3} fill="currentColor" fillOpacity={0.18} />
    </Icon>
  ),
  topic: (
    <Icon>
      <rect x={7} y={6.5} width={11} height={7} rx={3.5} />
      <path d="M2 10 H7" />
    </Icon>
  ),
  entity: (
    <Icon>
      <rect x={3} y={3.5} width={14} height={13} rx={1.5} />
      <path d="M3 7.5 H17 M3 11 H17" />
    </Icon>
  ),
  weakEntity: (
    <Icon>
      <rect x={2.5} y={3} width={15} height={14} rx={1.5} />
      <rect x={5} y={5.5} width={10} height={9} rx={0.5} />
    </Icon>
  ),
}
