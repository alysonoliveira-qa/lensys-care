// ─────────────────────────────────────────────────────────────────────────────
// lib/plans/trial-status.ts
// Estado do período de teste, derivado na leitura.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Existem **dois** períodos de teste neste sistema, e confundir os dois é o que
 * deixou uma clínica com 91 dias de acesso grátis sem ninguém notar:
 *
 * 1. **O teste local**, criado no cadastro (`api/auth/register`), que grava
 *    `trial_ends_at = hoje + 7` e `status = TRIALING`. Não tem cartão, não tem
 *    contrapartida no Stripe e **ninguém o encerra** — `trial_ends_at` era
 *    escrito e nunca lido. Como `TRIALING` entitula (ver
 *    `ENTITLED_SUBSCRIPTION_STATUSES`), o acesso seguia para sempre.
 *
 * 2. **O teste do Stripe**, criado no checkout com `trial_period_days: 7`. Esse
 *    tem cartão em mão, o próprio Stripe o encerra e a cobrança sai sozinha no
 *    8º dia. Ele **não precisa de aviso nenhum** — avisar aqui seria pedir para
 *    assinar a quem já assinou.
 *
 * O que separa um do outro é `stripe_subscription_id`. Por isso ele entra na
 * decisão: sem ele, o teste é o local, e o fim da data significa acesso grátis
 * indefinido; com ele, quem manda é o Stripe e este módulo se cala.
 */
export type EstadoDoTeste =
  /** Assinatura fora de teste (ACTIVE, CANCELED, PAST_DUE) ou inexistente. */
  | 'sem-teste'
  /** Teste com assinatura no Stripe: converte sozinho, não é problema nosso. */
  | 'gerenciado-pelo-stripe'
  /** `TRIALING` sem data de fim — não dá para afirmar vencimento. */
  | 'sem-data'
  /** Teste local ainda dentro do prazo. */
  | 'em-andamento'
  /** Teste local com a data no passado, e nada o encerrou. */
  | 'vencido'

export interface AssinaturaParaTeste {
  status: string | null
  trial_ends_at: Date | string | null
  stripe_subscription_id: string | null
}

export interface ResolucaoDoTeste {
  estado: EstadoDoTeste
  /** Dias inteiros até o fim. Preenchido só em `em-andamento`. */
  diasRestantes: number | null
  /** Dias inteiros desde o fim. Preenchido só em `vencido`. */
  diasVencido: number | null
  /** Se a faixa deve aparecer para o usuário. */
  avisar: boolean
}

const UM_DIA_MS = 24 * 60 * 60 * 1000

/** A partir de quantos dias restantes vale a pena avisar que o teste vai acabar. */
export const DIAS_PARA_AVISAR_FIM_DO_TESTE = 3

function paraData(valor: Date | string | null): Date | null {
  if (valor === null) return null

  const data = valor instanceof Date ? valor : new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}

const SEM_AVISO = { diasRestantes: null, diasVencido: null, avisar: false } as const

/**
 * Decide o que dizer sobre o teste desta clínica.
 *
 * `trial_ends_at` é `timestamptz` — um instante de verdade, não hora de parede.
 * Diferente de `appointment_date`/`scheduled_time`, aqui a aritmética direta
 * está certa e getter UTC seria o errado.
 *
 * @param assinatura Linha de `subscriptions`, ou `null` se a clínica não tem
 * @param agora      Injetado para o teste unitário não depender do relógio
 */
export function resolveTrialStatus(
  assinatura: AssinaturaParaTeste | null,
  agora: Date = new Date()
): ResolucaoDoTeste {
  if (!assinatura || assinatura.status !== 'TRIALING') {
    return { estado: 'sem-teste', ...SEM_AVISO }
  }

  if (assinatura.stripe_subscription_id) {
    return { estado: 'gerenciado-pelo-stripe', ...SEM_AVISO }
  }

  const fim = paraData(assinatura.trial_ends_at)

  // Sem data não se afirma vencimento: melhor calar do que acusar de vencido
  // quem talvez não esteja. Toda linha vinda do cadastro tem data; uma sem data
  // veio de inserção manual, e o lugar de resolver isso é o banco.
  if (!fim) {
    return { estado: 'sem-data', ...SEM_AVISO }
  }

  const diferenca = fim.getTime() - agora.getTime()

  if (diferenca <= 0) {
    return {
      estado: 'vencido',
      diasRestantes: null,
      // A subtração na ordem `agora - fim` em vez de negar `diferenca`: negar
      // produz `-0` quando as datas coincidem, e `-0` vaza para o texto.
      diasVencido: Math.floor((agora.getTime() - fim.getTime()) / UM_DIA_MS),
      avisar: true,
    }
  }

  // `ceil` para que qualquer sobra dentro das últimas 24h ainda seja "1 dia", e
  // não "0 dias" num teste que ainda está de pé.
  const diasRestantes = Math.ceil(diferenca / UM_DIA_MS)

  return {
    estado: 'em-andamento',
    diasRestantes,
    diasVencido: null,
    avisar: diasRestantes <= DIAS_PARA_AVISAR_FIM_DO_TESTE,
  }
}
