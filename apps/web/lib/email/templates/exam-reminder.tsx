import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ExamReminderEmailProps {
  patientName: string
  dueDate: Date
  clinicName?: string
  clinicPhone?: string
  appUrl?: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.lensyscare.com.br'

function formatDatePTBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ExamReminderEmail({
  patientName,
  dueDate,
  clinicName = 'sua clínica',
  clinicPhone,
  appUrl = APP_URL,
}: ExamReminderEmailProps) {
  const formattedDate = formatDatePTBR(dueDate)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>
        Lembrete: sua consulta de renovação de óculos está se aproximando — {formattedDate}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logo}>👁️ Lensys Care</Text>
          </Section>

          <Section style={styles.content}>
            <Heading style={styles.heading}>Olá, {patientName}!</Heading>

            <Text style={styles.paragraph}>
              Este é um lembrete de {clinicName} sobre a renovação anual dos seus óculos
              ou lentes de contato.
            </Text>

            <Section style={styles.alertBox}>
              <Text style={styles.alertText}>
                📅 Sua consulta de renovação está prevista para: <strong>{formattedDate}</strong>
              </Text>
            </Section>

            <Text style={styles.paragraph}>
              Manter a sua prescrição atualizada é essencial para a saúde dos seus olhos.
              Com o tempo, a visão pode mudar e uma receita desatualizada pode causar
              fadiga ocular, dores de cabeça e dificuldade de enxergar com clareza.
            </Text>

            <Button style={styles.button} href={appUrl}>
              Agendar minha consulta
            </Button>

            {clinicPhone && (
              <Text style={styles.contactText}>
                Ou entre em contato diretamente: <strong>{clinicPhone}</strong>
              </Text>
            )}
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Você está recebendo este e-mail porque é paciente de {clinicName}. Se não deseja
              mais receber lembretes, entre em contato com sua clínica.
            </Text>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Lensys Care — Sistema de gestão para optometria clínica
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderExamReminderEmail(props: {
  patientName: string
  dueDate: Date
  clinicName?: string
  clinicPhone?: string
}): Promise<string> {
  const { render } = await import('@react-email/render')
  return render(<ExamReminderEmail {...props} />)
}

const styles = {
  body: {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: '0',
    padding: '0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden' as const,
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '32px 40px',
    textAlign: 'center' as const,
  },
  logo: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
  },
  content: {
    padding: '40px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 16px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#475569',
    margin: '0 0 20px',
  },
  alertBox: {
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '6px',
    padding: '16px 20px',
    margin: '24px 0',
  },
  alertText: {
    fontSize: '16px',
    color: '#1e40af',
    margin: '0',
  },
  button: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
    margin: '8px 0 24px',
  },
  contactText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0',
  },
  divider: {
    borderColor: '#e2e8f0',
    margin: '0 40px',
  },
  footer: {
    padding: '24px 40px',
  },
  footerText: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
} as const

export default ExamReminderEmail
