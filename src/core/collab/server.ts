// 协作服务地址：构建时用 VITE_COLLAB_WS 指定；没指定时只有本机开发（localhost）才连默认的本地服务。
// 部署出去的静态站（如 GitHub Pages）没有协作服务，返回 null，界面据此说明情况而不是一直「连接中」。
// 单独成文件，不引 yjs：判断「能不能协作」不需要把协作库下载下来。
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\])$/
const LOCAL_SERVER = 'ws://127.0.0.1:1234'

export function collabServerUrl(): string | null {
  const configured = import.meta.env.VITE_COLLAB_WS as string | undefined
  if (configured) return configured
  if (typeof location !== 'undefined' && LOCAL_HOSTS.test(location.hostname)) return LOCAL_SERVER
  return null
}
