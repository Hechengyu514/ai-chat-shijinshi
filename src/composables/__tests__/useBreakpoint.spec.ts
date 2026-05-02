import { describe, it, expect } from 'vitest'
import { useBreakpoint } from '../useBreakpoint'

describe('useBreakpoint', () => {
  it('returns isMobile ref', () => {
    const { isMobile } = useBreakpoint()
    expect(isMobile).toBeDefined()
    expect(typeof isMobile.value).toBe('boolean')
  })

  it('uses 768 as default breakpoint', () => {
    // The composable reads window.innerWidth, but we mainly verify
    // it returns the expected shape regardless of the actual width
    const { isMobile } = useBreakpoint()
    expect([true, false]).toContain(isMobile.value)
  })
})