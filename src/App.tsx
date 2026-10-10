import { zh } from '@/i18n/zh'

// 脚手架阶段的临时外壳：只验证字体/令牌/渲染链路，阶段4 整体重写为编辑器骨架
export default function App() {
  return (
    <div className="flex h-full items-center justify-center bg-sheet">
      <h1 className="text-ui font-semibold text-ink">{zh.app.name}</h1>
    </div>
  )
}
