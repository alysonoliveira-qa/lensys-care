/**
 * Cabeçalhos de segurança.
 *
 * O app não é embutido em iframe em lugar nenhum (o único fluxo que parecia
 * exigir isso, a impressão do receituário, usa `window.print()` na própria
 * página), então `DENY` é seguro e fecha clickjacking.
 *
 * A CSP completa ficou de fora de propósito: o Next injeta script inline no
 * bootstrap do App Router, e uma CSP escrita no chute quebraria a aplicação
 * inteira em produção. Ela merece uma tarefa própria, com nonce.
 */
const securityHeaders = [
  // A Vercel já envia HSTS, mas a política fica versionada aqui para não
  // depender do padrão da plataforma.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
