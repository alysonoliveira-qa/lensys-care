import LoginPageContent from '@/components/auth/LoginPageContent'

const NOTICES: Record<string, string> = {
  'convite-aceito': 'Convite aceito com sucesso! Faça login para acessar a clínica.',
}

interface LoginPageProps {
  searchParams?: { message?: string }
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const notice = searchParams?.message ? (NOTICES[searchParams.message] ?? null) : null

  return (
    <LoginPageContent
      sourcePath="/login"
      showHomeLink
      includeTestSelectors
      notice={notice}
    />
  )
}
