import type { UnpluginFactory } from 'unplugin'
import type { Options } from './types'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'

interface ConditionMatch {
  start: number
  end: number
  condition: string
  content: string
}

function findConditionMatches(s: MagicString): ConditionMatch[] {
  const code = s.toString()
  const matches: ConditionMatch[] = []
  const openTagRegex = /<Condition\s+if=\{([^}]+)\}\s*>/g
  let match

  // eslint-disable-next-line no-cond-assign
  while ((match = openTagRegex.exec(code)) !== null) {
    const startTagStart = match.index
    const startTagEnd = openTagRegex.lastIndex
    const condition = match[1]

    // 找到对应的结束标签
    const endTagStart = findClosingTagPosition(code, startTagEnd)
    if (endTagStart === -1)
      continue

    const endTagEnd = endTagStart + '</Condition>'.length
    const content = code.slice(startTagEnd, endTagStart)

    matches.push({
      start: startTagStart,
      end: endTagEnd,
      condition,
      content,
    })
  }

  return matches
}

function findClosingTagPosition(code: string, startPos: number): number {
  let depth = 1
  let pos = startPos

  while (depth > 0 && pos < code.length) {
    const openIndex = code.indexOf('<Condition', pos)
    const closeIndex = code.indexOf('</Condition>', pos)

    if (closeIndex === -1)
      return -1

    if (openIndex !== -1 && openIndex < closeIndex) {
      depth++
      pos = openIndex + '<Condition'.length
    }
    else {
      depth--
      if (depth === 0)
        return closeIndex
      pos = closeIndex + '</Condition>'.length
    }
  }

  return -1
}

function determineWrapperType(code: string, position: number): 'jsx' | 'expression' {
  // 向前查找上下文，判断是否需要 {} 包装
  const before = code.slice(0, position).trim()

  // 检查常见的 JSX 表达式上下文
  if (before.endsWith('(') || before.endsWith('return') || before.endsWith('{')) {
    return 'jsx'
  }

  return 'expression'
}

function processConditionsInMagicString(s: MagicString): boolean {
  const matches = findConditionMatches(s)
  if (matches.length === 0)
    return false

  // 从后往前处理，避免位置偏移问题
  matches.reverse()

  for (const match of matches) {
    const wrapperType = determineWrapperType(s.toString(), match.start)

    // 递归处理嵌套的内容
    if (match.content.includes('<Condition')) {
      const innerS = new MagicString(match.content)
      processConditionsInMagicString(innerS)
      match.content = innerS.toString()
    }

    let replacement: string
    if (wrapperType === 'jsx') {
      replacement = `${match.condition} ? <>${match.content}</> : null`
    }
    else {
      replacement = `{Boolean(${match.condition}) ? <>${match.content}</> : null}`
    }

    s.overwrite(match.start, match.end, replacement)
  }

  return matches.length > 0
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = () => ({
  name: 'unplugin-transform-condition',
  enforce: 'pre',
  transformInclude(id) {
    // 匹配 .tsx 和 .jsx 文件
    return /\.[jt]sx?$/.test(id)
  },
  transform(code) {
    // 快速检查是否包含 Condition 标签，避免不必要的处理
    if (!code.includes('<Condition')) {
      return null
    }

    const s = new MagicString(code)
    const hasChanges = processConditionsInMagicString(s)

    return hasChanges
      ? {
          code: s.toString(),
          map: s.generateMap(),
        }
      : null
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
