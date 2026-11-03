// mmd2json 的命令行参数解析：纯函数，与读写文件分开，便于单元测试。

export interface CliArgs {
  input: string
  output?: string
}

/** 解析参数；参数不完整（缺输入文件、-o 后缺文件名）时返回 null */
export function parseArgs(argv: string[]): CliArgs | null {
  const o = argv.indexOf('-o')
  const output = o >= 0 ? argv[o + 1] : undefined
  if (o >= 0 && (!output || output.startsWith('-'))) return null
  // 跳过 -o 后面的文件名。没有 -o 时 o + 1 为 0，不能拿它去排除第一个参数（曾因此找不到输入文件）
  const input = argv.find((a, i) => !a.startsWith('-') && (o < 0 || i !== o + 1))
  return input ? { input, output } : null
}
