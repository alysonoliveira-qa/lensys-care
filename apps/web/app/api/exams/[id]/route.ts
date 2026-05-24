import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Faca login para continuar.' }, { status: 401 })
    }

    const { data: deletedExam, error } = await supabase
      .from('exams')
      .delete()
      .eq('id', params.id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!deletedExam) {
      return NextResponse.json(
        { error: 'EXAM_NOT_FOUND', message: 'Exame nao encontrado ou sem permissao para excluir.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Exam deletion error:', error)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Falha ao excluir exame.' },
      { status: 500 }
    )
  }
}
