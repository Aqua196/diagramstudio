// 顶栏 48px：产品名/可编辑文档名｜撤销重做·缩放·自动布局｜
// 面板开关·小地图·主题·保存状态·导出菜单·分享·快捷键。
import { useState } from 'react'
import { useUiStore } from '@/store/uiStore'
import { zh } from '@/i18n/zh'
import { ExportDialog, type ExportFormat } from './ExportDialog'
import { PeerAvatars } from './PeerAvatars'
import { DocTitle } from './DocTitle'
import { ExportMenu, MoreMenu, ThemeMenu } from './TopBarMenus'
import { TypeSegment, UndoRedo, ZoomGroup } from './TopBarCenter'

export function TopBar() {
  const ui = useUiStore()
  const [exportDlg, setExportDlg] = useState<ExportFormat | null>(null)
  return (
    <header className="ds-topbar">
      <div className="ds-topbar-left">
        <button
          type="button"
          className="ds-logo"
          aria-label={zh.topbar.home}
          onClick={() => ui.setRoute('home')}
        >
          {zh.app.name}
        </button>
        <DocTitle />
      </div>
      <div className="ds-topbar-center">
        <TypeSegment />
        <UndoRedo />
        <ZoomGroup />
      </div>
      <div className="ds-topbar-right">
        <PeerAvatars />
        <ThemeMenu />
        <ExportMenu onFormat={setExportDlg} />
        <MoreMenu />
      </div>
      {exportDlg && <ExportDialog format={exportDlg} onClose={() => setExportDlg(null)} />}
    </header>
  )
}
