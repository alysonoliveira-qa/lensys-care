#!/usr/bin/env node
/**
 * Bloqueia commit de credenciais.
 *
 * Roda no pre-commit e olha apenas o que esta *staged* (linhas adicionadas),
 * mais o nome dos arquivos. Nao le o worktree, entao editar um .env local
 * nunca dispara nada — so a tentativa de versiona-lo.
 *
 * Uso:
 *   node scripts/check-secrets.mjs          # so o que esta staged (pre-commit)
 *   node scripts/check-secrets.mjs --all    # varre todo o conteudo rastreado
 *
 * Escapes:
 *   - comentario "pragma: allowlist secret" na propria linha
 *   - git commit --no-verify (ultimo recurso, e deixa rastro no historico)
 */
import { execFileSync } from 'node:child_process'

const GIT_OPTS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
const git = (...args) => execFileSync('git', args, GIT_OPTS)

const ALLOW_MARK = /pragma:\s*allowlist\s+secret/i

/** Nomes de arquivo que nunca devem ser versionados. */
const FORBIDDEN_PATHS = [
  {
    re: /(^|\/)\.env(\.[^/]*)?$/i,
    why: 'arquivo de ambiente',
    allow: /\.(example|sample|template)$/i,
  },
  { re: /(^|\/)cypress\.env\.json$/i, why: 'credenciais de E2E' },
  { re: /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i, why: 'chave SSH privada' },
  { re: /\.(pem|pfx|p12|keystore|jks)$/i, why: 'material criptografico' },
]

/** Padroes de credencial procurados em linhas adicionadas. */
const RULES = [
  { id: 'stripe-live-key', desc: 'chave live da Stripe', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/g },
  { id: 'stripe-test-key', desc: 'chave de teste da Stripe', re: /\b(?:sk|rk)_test_[A-Za-z0-9]{16,}/g },
  { id: 'stripe-webhook-secret', desc: 'signing secret de webhook da Stripe', re: /\bwhsec_[A-Za-z0-9]{16,}/g },
  { id: 'twilio-account-sid', desc: 'Account SID da Twilio', re: /\bAC[0-9a-f]{32}\b/g },
  { id: 'twilio-api-key-sid', desc: 'API Key SID da Twilio', re: /\bSK[0-9a-f]{32}\b/g },
  { id: 'resend-api-key', desc: 'API key do Resend', re: /\bre_[A-Za-z0-9]{6,}_[A-Za-z0-9]{16,}/g },
  { id: 'supabase-secret-key', desc: 'secret key do Supabase', re: /\bsb_secret_[A-Za-z0-9_-]{20,}/g },
  {
    id: 'jwt',
    desc: 'JWT (a service_role do Supabase tem esse formato)',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  { id: 'github-token', desc: 'token do GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { id: 'anthropic-key', desc: 'API key da Anthropic', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { id: 'openai-key', desc: 'API key da OpenAI', re: /\bsk-proj-[A-Za-z0-9_-]{20,}/g },
  { id: 'private-key-block', desc: 'bloco de chave privada', re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g },
  {
    id: 'db-url-password',
    desc: 'URL de banco com senha embutida',
    re: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s:@/]+@[^\s/"']+/g,
  },
]

/**
 * Auth Token da Twilio, CRON_SECRET e afins nao tem prefixo reconhecivel.
 * Em arquivos de ambiente — onde o quase-vazamento do .env.example aconteceu —
 * qualquer atribuicao a uma chave sensivel com valor concreto e barrada.
 */
const ENV_LIKE = /(^|\/)(\.env(\.[^/]*)?|[^/]*\.env|cypress\.env\.json|\.envrc|[^/]*\.tfvars)$/i
const ENV_ASSIGN =
  /\b([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|SERVICE_ROLE_KEY|PRIVATE_KEY|CREDENTIALS?)[A-Z0-9_]*)\s*[:=]\s*["']?([^\s"';,]{12,})/g

/** Palavras que denunciam um valor ficticio. Case-insensitive de proposito. */
const PLACEHOLDER_WORDS =
  /xxx|your[-_ ]?|placeholder|example|changeme|change-me|dummy|fake|redacted|senha|my[-_]?secret/i

/**
 * Formatos que nao sao credencial: marcador (<x>, {x}, ...), interpolacao
 * ($X, ${X}, process.env.X) ou referencia CONSTANT_CASE. Sem a flag `i` —
 * com ela, `[A-Z]` casaria minusculas e engoliria quase todo segredo real.
 */
const PLACEHOLDER_SHAPE = /[<>{}]|\.\.\.|…|^\$|^process\.env\b|^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

const isPlaceholder = (value) => PLACEHOLDER_WORDS.test(value) || PLACEHOLDER_SHAPE.test(value)
const mask = (value) => `${value.slice(0, 6)}…(${value.length} chars)`

/** Varre uma linha e devolve as violacoes encontradas, uma por regra. */
function scanLine(line, file) {
  if (ALLOW_MARK.test(line)) return []
  const hits = []

  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(line)) !== null) {
      if (isPlaceholder(m[0])) continue
      hits.push({ rule: rule.id, desc: rule.desc, sample: mask(m[0]) })
    }
  }

  if (ENV_LIKE.test(file)) {
    ENV_ASSIGN.lastIndex = 0
    let m
    while ((m = ENV_ASSIGN.exec(line)) !== null) {
      const [, name, value] = m
      if (isPlaceholder(value)) continue
      hits.push({ rule: 'env-assignment', desc: `valor concreto em ${name}`, sample: mask(value) })
    }
  }

  return hits.filter((hit, i) => hits.findIndex((other) => other.rule === hit.rule) === i)
}

/** Percorre um diff unificado, aplicando scanLine so nas linhas adicionadas. */
function scanDiff(diff) {
  const findings = []
  let file = null
  let lineNo = 0

  for (const raw of diff.split('\n')) {
    if (raw.startsWith('+++ ')) {
      const path = raw.slice(4).trim()
      file = path === '/dev/null' ? null : path.replace(/^b\//, '')
      continue
    }
    if (raw.startsWith('@@')) {
      const m = /^@@ -\S+ \+(\d+)/.exec(raw)
      lineNo = m ? Number(m[1]) : 0
      continue
    }
    if (!file || !raw.startsWith('+') || raw.startsWith('+++')) continue

    for (const hit of scanLine(raw.slice(1), file)) findings.push({ file, line: lineNo, ...hit })
    lineNo += 1
  }

  return findings
}

/** Arquivo cujo proprio nome ja e proibido, se houver. */
function forbiddenPath(file) {
  return FORBIDDEN_PATHS.find((f) => f.re.test(file) && !(f.allow && f.allow.test(file)))
}

function scanStaged() {
  const findings = []

  for (const file of git('diff', '--cached', '--name-only', '--diff-filter=ACM', '-z').split('\0').filter(Boolean)) {
    const forbidden = forbiddenPath(file)
    if (forbidden) {
      findings.push({ file, line: 0, rule: 'arquivo-proibido', desc: forbidden.why, sample: 'o arquivo inteiro' })
    }
  }

  findings.push(...scanDiff(git('diff', '--cached', '-U0', '--diff-filter=ACM')))
  return findings
}

function scanAll() {
  const findings = []

  for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
    const forbidden = forbiddenPath(file)
    if (forbidden) {
      findings.push({ file, line: 0, rule: 'arquivo-proibido', desc: forbidden.why, sample: 'o arquivo inteiro' })
    }

    let content
    try {
      content = git('show', `HEAD:${file}`)
    } catch {
      continue
    }
    if (content.includes('\0')) continue

    content.split('\n').forEach((line, i) => {
      for (const hit of scanLine(line, file)) findings.push({ file, line: i + 1, ...hit })
    })
  }

  return findings
}

const findings = process.argv.includes('--all') ? scanAll() : scanStaged()

if (findings.length === 0) process.exit(0)

console.error('\n  Commit bloqueado: credencial detectada\n')
for (const finding of findings) {
  const where = finding.line ? `${finding.file}:${finding.line}` : finding.file
  console.error(`  ${where}`)
  console.error(`    ${finding.desc} [${finding.rule}] -> ${finding.sample}`)
}
console.error(`
  Se a credencial e real, rotacione no provedor antes de qualquer coisa —
  tirar do commit nao rotaciona nada.

  Para seguir:
    - deixe um placeholder (<your-key>) no arquivo versionado
    - o valor real vai em apps/web/.env.local, que o git ignora
    - falso positivo: acrescente "pragma: allowlist secret" na linha
`)
process.exit(1)
