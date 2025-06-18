import { describe, expect, it } from 'vitest'

// 导入内部函数进行测试
import { unpluginFactory } from '../src/index'

// 辅助函数：模拟插件的转换逻辑
function transformCode(code: string): string | null {
  if (!code.includes('<Condition')) {
    return null
  }

  // @ts-expect-error 测试用例
  const plugin = unpluginFactory({})
  // @ts-expect-error 测试用例
  const result = plugin.transform(code, 'test.tsx')

  if (result && typeof result === 'object' && 'code' in result) {
    return result.code
  }
  return result as string | null
}

describe('unplugin-transform-condition', () => {
  describe('基本功能测试', () => {
    it('不包含 Condition 标签时应该返回 null', () => {
      const code = `function App() {
  return <div>Hello World</div>
}`
      const result = transformCode(code)
      expect(result).toBe(null)
    })

    it('应该转换基本的 Condition 标签（JSX 内）', () => {
      const input = `function App({ showMessage }) {
  return (
    <div>
      <Condition if={showMessage}>
        <p>Hello World</p>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ showMessage }) {
  return (
    <div>
      {Boolean(showMessage) ? <>
        <p>Hello World</p>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该转换 return 语句中的 Condition 标签', () => {
      const input = `function App({ condition }) {
  return <Condition if={condition}>
    <div>Return context</div>
  </Condition>
}`

      const expected = `function App({ condition }) {
  return condition ? <>
    <div>Return context</div>
  </> : null
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该转换赋值表达式中的 Condition 标签', () => {
      const input = `function App({ condition }) {
  const element = <Condition if={condition}>
    <span>Expression context</span>
  </Condition>
  return element
}`

      const expected = `function App({ condition }) {
  const element = Boolean(condition) ? <>
    <span>Expression context</span>
  </> : null
  return element
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })
  })

  describe('复杂条件测试', () => {
    it('应该处理复杂条件表达式', () => {
      const input = `function App({ user, isLoggedIn }) {
  return (
    <div>
      <Condition if={user && isLoggedIn}>
        <p>Welcome {user.name}</p>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ user, isLoggedIn }) {
  return (
    <div>
      {Boolean(user && isLoggedIn) ? <>
        <p>Welcome {user.name}</p>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理函数调用条件', () => {
      const input = `function App({ items }) {
  return (
    <div>
      <Condition if={items.length > 0}>
        <ul>
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ items }) {
  return (
    <div>
      {Boolean(items.length > 0) ? <>
        <ul>
          {items.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })
  })

  describe('嵌套条件测试', () => {
    it('应该处理嵌套的 Condition 标签', () => {
      const input = `function App({ showOuter, showInner }) {
  return (
    <div>
      <Condition if={showOuter}>
        <div>
          <p>Outer content</p>
          <Condition if={showInner}>
            <p>Inner content</p>
          </Condition>
        </div>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ showOuter, showInner }) {
  return (
    <div>
      {Boolean(showOuter) ? <>
        <div>
          <p>Outer content</p>
          {Boolean(showInner) ? <>
            <p>Inner content</p>
          </> : null}
        </div>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理多个平级的 Condition 标签', () => {
      const input = `function App({ showFirst, showSecond }) {
  return (
    <div>
      <Condition if={showFirst}>
        <p>First condition</p>
      </Condition>
      <Condition if={showSecond}>
        <p>Second condition</p>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ showFirst, showSecond }) {
  return (
    <div>
      {Boolean(showFirst) ? <>
        <p>First condition</p>
      </> : null}
      {Boolean(showSecond) ? <>
        <p>Second condition</p>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })
  })

  describe('不同赋值情况测试', () => {
    it('应该处理 const 赋值', () => {
      const input = `function App({ show }) {
  const element = <Condition if={show}>
    <span>Const assignment</span>
  </Condition>
  return element
}`

      const expected = `function App({ show }) {
  const element = Boolean(show) ? <>
    <span>Const assignment</span>
  </> : null
  return element
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理 let 赋值', () => {
      const input = `function App({ show }) {
  let element = <Condition if={show}>
    <span>Let assignment</span>
  </Condition>
  return element
}`

      const expected = `function App({ show }) {
  let element = Boolean(show) ? <>
    <span>Let assignment</span>
  </> : null
  return element
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理 var 赋值', () => {
      const input = `function App({ show }) {
  var element = <Condition if={show}>
    <span>Var assignment</span>
  </Condition>
  return element
}`

      const expected = `function App({ show }) {
  var element = Boolean(show) ? <>
    <span>Var assignment</span>
  </> : null
  return element
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空内容的 Condition 标签', () => {
      const input = `function App({ condition }) {
  return (
    <div>
      <Condition if={condition}>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ condition }) {
  return (
    <div>
      {Boolean(condition) ? <>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理单行的 Condition 标签', () => {
      const input = `function App({ show }) {
  return (
    <div>
      <Condition if={show}><span>Single line</span></Condition>
    </div>
  )
}`

      const expected = `function App({ show }) {
  return (
    <div>
      {Boolean(show) ? <><span>Single line</span></> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })

    it('应该处理复杂嵌套结构', () => {
      const input = `function App({ user, settings }) {
  return (
    <div>
      <Condition if={user}>
        <header>
          <h1>Welcome {user.name}</h1>
          <Condition if={settings.showProfile}>
            <div>
              <img src={user.avatar} alt="Avatar" />
              <Condition if={user.verified}>
                <span className="verified">✓ Verified</span>
              </Condition>
            </div>
          </Condition>
        </header>
      </Condition>
    </div>
  )
}`

      const expected = `function App({ user, settings }) {
  return (
    <div>
      {Boolean(user) ? <>
        <header>
          <h1>Welcome {user.name}</h1>
          {Boolean(settings.showProfile) ? <>
            <div>
              <img src={user.avatar} alt="Avatar" />
              {Boolean(user.verified) ? <>
                <span className="verified">✓ Verified</span>
              </> : null}
            </div>
          </> : null}
        </header>
      </> : null}
    </div>
  )
}`

      const result = transformCode(input)
      expect(result).toBe(expected)
    })
  })
})
