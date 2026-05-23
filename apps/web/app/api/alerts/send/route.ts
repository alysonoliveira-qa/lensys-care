import { NextResponse } from 'next/server'
import { dispatchDueAlerts } from '@/lib/alerts'

export async function POST(request: Request) {
  try {
    // 1. Verify CRON_SECRET bearer token for job security
    const authHeader = request.headers.get('authorization')
    const secret = process.env.CRON_SECRET

    if (!secret || !authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== secret) {
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
    })
  } catch (error: unknown) {
    console.error('Daily alert dispatch route failed:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao rodar cron de disparos.' },
      { status: 500 }
    )
  }
}
