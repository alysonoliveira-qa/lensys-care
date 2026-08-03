import path from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig: sem ele, um import '@/...' só resolve quando o teste
    // mocka aquele módulo — e quebra assim que o código passa a importar algo real.
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
