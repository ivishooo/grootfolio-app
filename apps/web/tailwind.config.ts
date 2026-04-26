import type { Config } from 'tailwindcss'
import { tailwindPreset } from '@grootfolio/tokens/tailwind'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  presets: [tailwindPreset as unknown as Partial<Config>],
}

export default config
