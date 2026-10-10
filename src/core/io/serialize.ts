// 文档序列化：导出 JSON 与导入校验（zod），错误给出具体中文原因。
import { validateDoc, type ValidateResult } from '../model/schema'
import type { DiagramDoc } from '../model/types'

export function docToJson(doc: DiagramDoc): string {
  return JSON.stringify(doc, null, 2)
}

export function jsonToDoc(text: string): ValidateResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return {
      ok: false,
      errors: [`JSON 语法错误：${e instanceof Error ? e.message : String(e)}`],
    }
  }
  return validateDoc(parsed)
}
