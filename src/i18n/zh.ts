// 全部界面文案集中于此（SPEC §3.7）：组件里禁止出现文案字面量。
// 各阶段只在自己命名空间下追加键：canvas.*→阶段3，topbar/palettePanel/inspector/menus/shortcuts→阶段4，
// plugins→阶段5，home/io→阶段6，collab→阶段7；common/errors 共用。
export const zh = {
  app: {
    name: 'DiagramStudio',
    windowTooNarrow: '请使用更宽的窗口',
  },
  common: {
    confirm: '确定',
    cancel: '取消',
    delete: '删除',
    rename: '重命名',
    duplicate: '创建副本',
    close: '关闭',
    save: '保存',
    undo: '撤销',
    redo: '重做',
    zoomIn: '放大',
    zoomOut: '缩小',
    fitView: '适应画面',
  },
  canvas: {},
  topbar: {},
  plugins: {
    shapes: {
      process: '处理',
      terminator: '起止',
      decision: '判断',
      io: '输入输出',
      subprocess: '子流程',
      database: '数据库',
      document: '文档',
      connector: '连接符',
      note: '便签',
      centerTopic: '中心主题',
      entity: '实体',
    },
    typeNames: {
      flowchart: '流程图',
      mindmap: '思维导图',
      er: 'ER 图',
    },
  },
  palettePanel: {},
  inspector: {},
  menus: {},
  shortcuts: {},
  home: {},
  io: {},
  collab: {},
  errors: {},
} as const

export type Zh = typeof zh
