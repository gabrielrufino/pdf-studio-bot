import puppeteer from 'puppeteer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Browser } from './browser'

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}))

describe('browser config', () => {
  let browserInstance: Browser
  let mockBrowser: any

  beforeEach(() => {
    browserInstance = new Browser()
    mockBrowser = {
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(puppeteer.launch).mockResolvedValue(mockBrowser as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('should launch puppeteer with base config in non-production environment', async () => {
    vi.stubEnv('NODE_ENV', 'development')

    await browserInstance.getInstance()

    expect(puppeteer.launch).toHaveBeenCalledWith({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
      timeout: 30000,
    })
  })

  it('should launch puppeteer with production config in production environment', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await browserInstance.getInstance()

    expect(puppeteer.launch).toHaveBeenCalledWith({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
      ],
      headless: true,
      timeout: 30000,
      executablePath: '/usr/bin/chromium-browser',
    })
  })

  it('should return a singleton instance on multiple calls', async () => {
    const instance1 = await browserInstance.getInstance()
    const instance2 = await browserInstance.getInstance()

    expect(puppeteer.launch).toHaveBeenCalledTimes(1)
    expect(instance1).toBe(instance2)
  })

  it('should close the browser and reset the instance', async () => {
    await browserInstance.getInstance()
    await browserInstance.close()

    expect(mockBrowser.close).toHaveBeenCalledTimes(1)

    // Verify it launches a new one after closing
    await browserInstance.getInstance()
    expect(puppeteer.launch).toHaveBeenCalledTimes(2)
  })

  it('should do nothing if close is called without an active instance', async () => {
    await browserInstance.close()

    expect(mockBrowser.close).not.toHaveBeenCalled()
  })

  it('should not cache the promise if launch fails', async () => {
    vi.mocked(puppeteer.launch).mockRejectedValueOnce(new Error('Launch failed'))

    await expect(browserInstance.getInstance()).rejects.toThrow('Launch failed')

    vi.mocked(puppeteer.launch).mockResolvedValueOnce(mockBrowser as any)
    const instance = await browserInstance.getInstance()
    expect(instance).toBe(mockBrowser)
    expect(puppeteer.launch).toHaveBeenCalledTimes(2)
  })

  it('should reset the instance even if close throws an error', async () => {
    await browserInstance.getInstance()
    mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'))

    await expect(browserInstance.close()).rejects.toThrow('Close failed')

    await browserInstance.getInstance()
    expect(puppeteer.launch).toHaveBeenCalledTimes(2)
  })
})
