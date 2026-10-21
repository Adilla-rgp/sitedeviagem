import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { brand } from './src/config/brand'

// Preenche o index.html com o nome do produto (único lugar: src/config/brand.ts)
// e com a URL pública, que as prévias de link (Open Graph) exigem absoluta.
function htmlMetadata(siteUrl: string): Plugin {
  return {
    name: 'html-metadata',
    transformIndexHtml: (html) => html.replaceAll('%BRAND_NAME%', brand.name).replaceAll('%SITE_URL%', siteUrl),
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Prefixo vazio: lê também as variáveis do sistema, como as que a Vercel define no build.
  const env = loadEnv(mode, '.', '')
  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL
  const siteUrl = (env.SITE_URL || (productionHost ? `https://${productionHost}` : '')).replace(/\/$/, '')

  return {
    plugins: [react(), htmlMetadata(siteUrl)],
  }
})
