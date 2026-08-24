import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { dispatchDueAlerts } from '@/lib/alerts'

// O disparo percorre os alertas em série, um envio de cada vez. Dez segundos
// (o padrão) não cobrem um lote de renovações do dia.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Compara em tempo constante. Um `!==` de string sai no primeiro byte
 * diferente, e essa diferença de tempo é mensurável — dá para descobrir o
 * segredo caractere a caractere. O tamanho é comparado antes porque
 * `timingSafeEqual` lança quando os buffers têm tamanhos diferentes; o
 * comprimento em si não é o que se quer esconder.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)

  return a.length === b.length && timingSafeEqual(a, b)
}

async function dispatch(request: Request) {
  try {
    // 1. Verify CRON_SECRET bearer token for job security
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET
    const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

    if (!secret || !provided || !secretMatches(provided, secret)) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Cron secret é inválido ou está ausente.' }, { status: 401 })
    }

    // 2. Dispatch all pending alerts due in 7 days (or N days from query param)
    const { searchParams } = new URL(request.url)
    const daysAhead = searchParams.get('daysAhead') ? parseInt(searchParams.get('daysAhead')!) : 7

    const result = await dispatchDueAlerts(daysAhead)

    return NextResponse.json({
      success: true,
      message: 'Disparo de alertas diários concluído.',
      sent: result.sent,
      failed: result.failed,
      // Alertas de clínica sem o recall automático no plano. Continuam PENDING
      // para envio manual — não são falha.
      skipped: result.skipped,
      // O motivo de cada falha e de cada pulo, para o cron ser diagnosticável
      // sem redeploy — o plano Hobby não retém saída de console.
      failures: result.failures,
      skips: result.skips,
    })
  } catch (error: unknown) {
    console.error('Daily alert dispatch route failed:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Falha ao rodar cron de disparos.' },
      { status: 500 }
    )
  }
}

/**
 * O cron da Vercel chama a rota com GET — sem este handler o agendamento
 * responderia 405 e o recall continuaria sem disparar, que foi exatamente o
 * estado do produto até aqui.
 */
export async function GET(request: Request) {
  return dispatch(request)
}

/** Disparo manual e qualquer chamador externo (pg_cron, script de operação). */
export async function POST(request: Request) {
  return dispatch(request)
}
