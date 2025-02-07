import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'
import type { Options } from './types'

function findClosingTag(str: string, startIndex: number): number {
  let depth = 1
  const openTag = /<Condition/g
  const closeTag = /<\/Condition>/g

  while (depth > 0) {
    openTag.lastIndex = startIndex
    closeTag.lastIndex = startIndex

    const nextOpen = openTag.exec(str)
    const nextClose = closeTag.exec(str)

    if (!nextClose)
      return -1

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      startIndex = nextOpen.index + 1
    }
    else {
      depth--
      startIndex = nextClose.index + 1
    }
  }

  return closeTag.lastIndex
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = () => ({
  name: 'unplugin-transform-condition',
  enforce: 'pre',
  transformInclude(id) {
    // 匹配 .tsx 和 .jsx 文件
    return /\.[jt]sx?$/.test(id)
  },
  transform(code) {
    function replaceConditions(input: string): string {
      const openTagRegex = /<Condition\s+if=\{([^}]+)\}\s*>/g
      let result = input
      let match

      // eslint-disable-next-line no-cond-assign
      while ((match = openTagRegex.exec(result)) !== null) {
        const startIndex = match.index
        const conditionExpr = match[1]
        const contentStart = openTagRegex.lastIndex

        // 匹配 </Condition> 标签结束的位置
        const endIndex = findClosingTag(result, contentStart)
        if (endIndex === -1)
          break

        const content = result.slice(contentStart, endIndex - '</Condition>'.length)
        // 递归处理嵌套的 <Condition> 标签
        const processedContent = replaceConditions(content)

        const before = result.slice(0, startIndex)
        const beforeTrim = before.trim()
        const after = result.slice(endIndex)

        // 如果 before 以 => ( 、 return 、 { 结尾，则直接替换，不添加 {}
        if (beforeTrim.endsWith('(') || beforeTrim.endsWith('return') || beforeTrim.endsWith('{')) {
          result = `${before}${conditionExpr} ? <>${processedContent}</> : null${after}`
        }
        else {
          result = `${before}{Boolean(${conditionExpr}) ? <>${processedContent}</> : null}${after}`
        }

        openTagRegex.lastIndex = startIndex + 1
      }

      return result
    }

    return replaceConditions(code)
  },
})

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
