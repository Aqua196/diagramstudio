// 插件注册表（IMPL_CONTRACT §4）：三种图共用一套引擎，差异全在插件。
// 阶段5 用 registerPlugin 以完整实现覆盖基座插件。
import type { ReactNode } from 'react'
import type { DiagramPlugin } from '@/core/plugin'
import type { DiagramType } from '@/core/model/types'
import { basePlugin } from './base'

export type ReactPlugin = DiagramPlugin<ReactNode>

const registry = new Map<DiagramType, ReactPlugin>()

export function registerPlugin(plugin: ReactPlugin): void {
  registry.set(plugin.type, plugin)
}

export function getPlugin(type: DiagramType): ReactPlugin {
  return registry.get(type) ?? basePlugin(type)
}

// 预置基座插件：保证阶段3/4 的开发期接口即真实接口
registerPlugin(basePlugin('flowchart'))
registerPlugin(basePlugin('mindmap'))
registerPlugin(basePlugin('er'))
