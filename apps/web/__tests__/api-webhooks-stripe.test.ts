import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  constructWebhookEvent: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  syncSubscriptionFromStripe: vi.fn(),
  downgradeSubscription: vi.fn(),
  findClinicIdByStripeCustomerId: vi.fn(),
  findClinicIdByStripeSubscriptionId: vi.fn(),
  recordPayment: vi.fn(),
  isRecordNotFound: vi.fn(() => false),
  subscriptionUpdate: vi.fn(),
}))

vi.mock('@/lib/stripe/webhooks', () => ({
  constructWebhookEvent: mocks.constructWebhookEvent,
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}))

vi.mock('@/lib/stripe/stripe-sync', () => ({
  syncSubscriptionFromStripe: mocks.syncSubscriptionFromStripe,
  downgradeSubscription: mocks.downgradeSubscription,
  findClinicIdByStripeCustomerId: mocks.findClinicIdByStripeCustomerId,
  findClinicIdByStripeSubscriptionId: mocks.findClinicIdByStripeSubscriptionId,
  recordPayment: mocks.recordPayment,
  isRecordNotFound: mocks.isRecordNotFound,
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    subscription: { update: mocks.subscriptionUpdate },
  },
}))

// `stripe-app-metadata` e `stripe-normalizers` ficam REAIS de propósito: o filtro
// entre produtos é justamente o que se quer testar, e mocká-lo testaria o mock.
import { POST } from '../app/api/webhooks/stripe/route'

const enviar = (assinatura: string | null = 'assinatura-valida') =>
  POST(
    new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: assinatura ? { 'stripe-signature': assinatura } : {},
      body: JSON.stringify({ qualquer: 'coisa' }),
    })
  )

const evento = (type: string, object: Record<string, unknown>) => ({
  id: `evt_${type}`,
  type,
  data: { object },
})

const semEfeito = () => {
  expect(mocks.syncSubscriptionFromStripe).not.toHaveBeenCalled()
  expect(mocks.downgradeSubscription).not.toHaveBeenCalled()
  expect(mocks.recordPayment).not.toHaveBeenCalled()
  expect(mocks.subscriptionUpdate).not.toHaveBeenCalled()
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isRecordNotFound.mockReturnValue(false)
    mocks.findClinicIdByStripeCustomerId.mockResolvedValue(null)
    mocks.findClinicIdByStripeSubscriptionId.mockResolvedValue(null)
    mocks.subscriptionsRetrieve.mockResolvedValue({ id: 'sub_1', status: 'active' })
  })

  describe('autenticidade', () => {
    it('recusa sem cabeçalho de assinatura, sem verificar nada', async () => {
      const response = await enviar(null)

      expect(response.status).toBe(400)
      expect(mocks.constructWebhookEvent).not.toHaveBeenCalled()
      semEfeito()
    })

    it('recusa assinatura inválida e não processa o evento', async () => {
      // Este é o teste que impede alguém de forjar um POST que ativa um plano.
      mocks.constructWebhookEvent.mockRejectedValue(new Error('assinatura não confere'))

      const response = await enviar()

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: 'VERIFICATION_FAILED' })
      semEfeito()
    })
  })

  describe('conta Stripe compartilhada entre produtos', () => {
    it('descarta evento carimbado de outro app, sem tocar em assinatura nenhuma', async () => {
      // A conta hospeda Lensys e Optoox. Uma venda do Optoox chega aqui também;
      // processá-la mexeria na assinatura de uma clínica que nunca comprou nada.
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_optoox',
          subscription: 'sub_optoox',
          metadata: { app: 'optoox', clinicId: 'clinica-a' },
        })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ received: true })
      semEfeito()
    })

    it('processa evento SEM carimbo — objeto antigo não pode parar de sincronizar', async () => {
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_antigo',
          subscription: 'sub_antiga',
          metadata: { clinicId: 'clinica-a' },
        })
      )

      await enviar()

      expect(mocks.syncSubscriptionFromStripe).toHaveBeenCalledWith(
        'clinica-a',
        expect.anything()
      )
    })
  })

  describe('checkout.session.completed', () => {
    it('vincula a assinatura à clínica do metadata', async () => {
      // Regressão do bug que deixou uma clínica pagar Conecta e continuar no
      // Essencial: o checkout completava e nada era gravado.
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_1',
          subscription: 'sub_1',
          metadata: { app: 'lensys', clinicId: 'clinica-a' },
        })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
      expect(mocks.syncSubscriptionFromStripe).toHaveBeenCalledWith('clinica-a', {
        id: 'sub_1',
        status: 'active',
      })
    })

    it('cai para o customer quando o metadata não traz clinicId', async () => {
      mocks.findClinicIdByStripeCustomerId.mockResolvedValue('clinica-b')
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_2',
          subscription: 'sub_2',
          customer: 'cus_2',
          metadata: { app: 'lensys' },
        })
      )

      await enviar()

      expect(mocks.findClinicIdByStripeCustomerId).toHaveBeenCalledWith('cus_2')
      expect(mocks.syncSubscriptionFromStripe).toHaveBeenCalledWith('clinica-b', expect.anything())
    })

    it('não grava nada quando a clínica não é identificável', async () => {
      // Falhar alto no log e não gravar é o comportamento certo: gravar no
      // palpite errado é pior que não gravar.
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_3',
          subscription: 'sub_3',
          customer: 'cus_desconhecido',
          metadata: { app: 'lensys' },
        })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
      semEfeito()
    })

    it('ignora checkout que não criou assinatura', async () => {
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('checkout.session.completed', {
          id: 'cs_4',
          subscription: null,
          metadata: { app: 'lensys', clinicId: 'clinica-a' },
        })
      )

      await enviar()

      expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled()
      semEfeito()
    })
  })

  describe('invoice.payment_succeeded', () => {
    it('registra o pagamento e reconcilia a assinatura', async () => {
      // A reconciliação existe para o caso de o checkout.session.completed se
      // perder: é aqui que a clínica volta a ficar no plano que pagou.
      mocks.findClinicIdByStripeCustomerId.mockResolvedValue('clinica-a')
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('invoice.payment_succeeded', {
          id: 'in_1',
          customer: 'cus_1',
          subscription: 'sub_1',
          amount_paid: 11990,
          currency: 'brl',
          lines: { data: [{ metadata: { app: 'lensys' } }] },
        })
      )

      await enviar()

      expect(mocks.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinica-a',
          amountCents: 11990,
          currency: 'brl',
          status: 'SUCCEEDED',
        })
      )
      expect(mocks.syncSubscriptionFromStripe).toHaveBeenCalledWith('clinica-a', expect.anything())
    })

    it('ignora fatura de customer não mapeado', async () => {
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('invoice.payment_succeeded', { id: 'in_2', customer: 'cus_x', amount_paid: 100 })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
      semEfeito()
    })
  })

  describe('invoice.payment_failed', () => {
    it('registra a falha e marca a assinatura como PAST_DUE', async () => {
      mocks.findClinicIdByStripeCustomerId.mockResolvedValue('clinica-a')
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('invoice.payment_failed', {
          id: 'in_3',
          customer: 'cus_1',
          amount_due: 7990,
          currency: 'brl',
        })
      )

      await enviar()

      expect(mocks.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED', amountCents: 7990, paidAt: null })
      )
      expect(mocks.subscriptionUpdate).toHaveBeenCalledWith({
        where: { clinic_id: 'clinica-a' },
        data: { status: 'PAST_DUE' },
      })
    })
  })

  describe('customer.subscription.deleted', () => {
    it('rebaixa a clínica para o plano base', async () => {
      mocks.findClinicIdByStripeSubscriptionId.mockResolvedValue('clinica-a')
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('customer.subscription.deleted', { id: 'sub_1', metadata: { app: 'lensys' } })
      )

      await enviar()

      expect(mocks.downgradeSubscription).toHaveBeenCalledWith('clinica-a')
    })

    it('responde 200 quando não há assinatura para rebaixar', async () => {
      // 500 aqui faria o Stripe reentregar o mesmo evento para sempre, sem que
      // nada mudasse — a assinatura já não existe.
      mocks.findClinicIdByStripeSubscriptionId.mockResolvedValue('clinica-a')
      mocks.downgradeSubscription.mockRejectedValue(new Error('registro nao encontrado'))
      mocks.isRecordNotFound.mockReturnValue(true)
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('customer.subscription.deleted', { id: 'sub_1', metadata: { app: 'lensys' } })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
    })
  })

  describe('resposta ao Stripe', () => {
    it('devolve 200 para tipo de evento que não tratamos', async () => {
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('customer.created', { id: 'cus_1' })
      )

      const response = await enviar()

      expect(response.status).toBe(200)
      semEfeito()
    })

    it('devolve 500 em falha real, para o Stripe reentregar', async () => {
      // A distinção que importa: evento inaplicável responde 200 (reentregar não
      // ajuda), falha real responde 500 (reentregar é exatamente o que salva).
      mocks.findClinicIdByStripeSubscriptionId.mockResolvedValue('clinica-a')
      mocks.downgradeSubscription.mockRejectedValue(new Error('banco fora do ar'))
      mocks.isRecordNotFound.mockReturnValue(false)
      mocks.constructWebhookEvent.mockResolvedValue(
        evento('customer.subscription.deleted', { id: 'sub_1', metadata: { app: 'lensys' } })
      )

      const response = await enviar()

      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ error: 'PROCESSING_FAILED' })
    })
  })
})
