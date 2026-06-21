import process from 'node:process'
import puppeteer, { type Browser as PuppeteerBrowser } from 'puppeteer'

export class Browser {
  private browserPromise: Promise<PuppeteerBrowser> | null = null

  private getBrowserConfig() {
    const baseConfig = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
      timeout: 30000,
    }

    if (process.env.NODE_ENV === 'production') {
      return {
        ...baseConfig,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          ...baseConfig.args,
          '--no-zygote',
          '--single-process',
        ],
      }
    }

    return baseConfig
  }

  async getInstance(): Promise<PuppeteerBrowser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch(this.getBrowserConfig())
    }
    return this.browserPromise
  }

  async close(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise
      await browser.close()
      this.browserPromise = null
    }
  }
}

export const browser = new Browser()
