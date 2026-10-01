import { expect, test } from '@playwright/test'

for (const theme of ['light', 'dark']) {
  test(`tokens: ${theme} contrast, focus and responsive layout`, async ({ page }, testInfo) => {
    await page.route('**/api/v1/auth/me/', route => route.fulfill({ status: 401, json: { error: { code: 'authentication_required' } } }))
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled()
    await page.evaluate(theme => { document.documentElement.className = theme }, theme)
    await expect(page.getByLabel('Adresse e-mail')).toHaveCSS('background-color', theme === 'light' ? 'rgb(247, 245, 239)' : 'rgb(25, 26, 23)')
    const contrast = await page.evaluate(() => {
      function rgb(color: string) {
        // Resolve CSS colors through canvas into sRGB, including display-p3 overrides.
        const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1
        const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })!
        ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      function ratio(fg: string, bg: string) {
        const lum = (color: string) => rgb(color).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
        const [a, b] = [lum(fg), lum(bg)].sort((a, b) => a - b)
        return (b + .05) / (a + .05)
      }
      const root = getComputedStyle(document.documentElement)
      const input = getComputedStyle(document.querySelector('input')!)
      const button = getComputedStyle(document.querySelector('.auth-submit')!)
      const muted = getComputedStyle(document.querySelector('.auth-field label')!)
      const spread = getComputedStyle(document.querySelector('.auth-layout')!)
      const background = spread.backgroundColor
      return {
        body: ratio(spread.color, background), muted: ratio(muted.color, background),
        button: ratio(button.color, button.backgroundColor), border: ratio(input.borderBottomColor, input.backgroundColor),
        focus: ratio(root.getPropertyValue('--focus-ring'), input.backgroundColor),
        error: ratio(root.getPropertyValue('--error-text'), root.getPropertyValue('--error-background')),
      }
    })
    for (const key of ['body', 'muted', 'button', 'error'] as const) expect(contrast[key], key).toBeGreaterThanOrEqual(4.5)
    expect(contrast.border).toBeGreaterThanOrEqual(3)
    expect(contrast.focus).toBeGreaterThanOrEqual(3)
    for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 600 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (viewport.width >= 721) expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
      await expect(page.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveCSS('width', '44px')
      if (viewport.width === 1280 || viewport.width === 390) await page.screenshot({ path: testInfo.outputPath(`${theme}-${viewport.width}.png`), fullPage: true })
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.auth-submit')).toHaveCSS('transition-duration', '0s')
    // Text scaling must expand controls/content rather than clip them.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await page.setViewportSize({ width: 640, height: 960 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByLabel('Mot de passe', { exact: true }).focus()
    await expect(page.getByLabel('Mot de passe', { exact: true })).toHaveCSS('outline-style', 'none')
    await expect(page.locator('.auth-password-field .auth-field-rule')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  })
}
