// ER 字段行的小按钮组（C1 从 erFields 拆出）：键位切换、删除字段、新增字段。
import type { ErField } from '@/core/model/types'
import { zh } from '@/i18n/zh'

const er = zh.plugins.er

/** 行接口与 erFields 中的 RowApi 同构（结构类型，避免循环 import） */
export interface RowApiLike {
  setField: (id: string, patch: Partial<ErField>, key: string, coalesce?: boolean) => void
  update: (next: ErField[], label?: string) => void
}

/** 键位循环：无 → PK → FK → 无 */
export function nextKey(f: ErField): Partial<ErField> {
  if (f.pk) return { pk: false, fk: true }
  if (f.fk) return { pk: false, fk: false }
  return { pk: true, fk: false }
}

export function KeyButton({ f, api }: { f: ErField; api: RowApiLike }) {
  return (
    <button
      type="button"
      className="ds-er-key"
      aria-label={er.keyButton}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        api.setField(f.id, nextKey(f), 'key')
      }}
    >
      {f.pk ? 'PK' : f.fk ? 'FK' : ''}
    </button>
  )
}

export function DelButton({ f, fields, api }: { f: ErField; fields: ErField[]; api: RowApiLike }) {
  return (
    <button
      type="button"
      className="ds-er-del ds-export-exclude"
      aria-label={er.deleteField}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        api.update(
          fields.filter((x) => x.id !== f.id),
          er.deleteField,
        )
      }}
    >
      ×
    </button>
  )
}

export function AddButton({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      type="button"
      className="ds-er-add ds-export-exclude"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
    >
      ＋ {er.addField}
    </button>
  )
}
