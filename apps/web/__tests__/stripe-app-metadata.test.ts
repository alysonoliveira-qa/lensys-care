import { describe, expect, it } from 'vitest'

import {
  classifyAppTag,
  STRIPE_APP_METADATA,
  STRIPE_APP_METADATA_KEY,
  STRIPE_APP_NAMESPACE,
} from '../lib/stripe/stripe-app-metadata'
import { readInvoiceAppTag, readMetadataValue } from '../lib/stripe/stripe-normalizers'

const KEY = STRIPE_APP_METADATA_KEY

describe('classifyAppTag', () => {
  it('reconhece o carimbo deste app', () => {
    expect(classifyAppTag(STRIPE_APP_NAMESPACE)).toBe('this-app')
    expect(STRIPE_APP_METADATA[KEY]).toBe(STRIPE_APP_NAMESPACE)
  })

  it('marca outro app como descartavel', () => {
    expect(classifyAppTag('optoox')).toBe('other-app')
    expect(classifyAppTag('qualquer-outro')).toBe('other-app')
  })

  it('trata ausencia de carimbo como unmarked, nunca como outro app', () => {
    // Objetos criados antes do carimbo nao tem a chave. Descartar esses seria
    // pior que o barulho: assinatura antiga pararia de sincronizar em silencio.
    expect(classifyAppTag(null)).toBe('unmarked')
    expect(classifyAppTag(undefined)).toBe('unmarked')
    expect(classifyAppTag('')).toBe('unmarked')
  })
})

describe('readMetadataValue', () => {
  it('le a chave quando presente', () => {
    expect(readMetadataValue({ metadata: { [KEY]: 'lensys' } }, KEY)).toBe('lensys')
  })

  it('devolve null para metadata ausente, vazia ou sem a chave', () => {
    expect(readMetadataValue({ metadata: { [KEY]: '' } }, KEY)).toBeNull()
    expect(readMetadataValue({ metadata: {} }, KEY)).toBeNull()
    expect(readMetadataValue({ metadata: null }, KEY)).toBeNull()
    expect(readMetadataValue(null, KEY)).toBeNull()
    expect(readMetadataValue(undefined, KEY)).toBeNull()
  })
})

describe('readInvoiceAppTag', () => {
  it('le o carimbo espelhado da assinatura em parent.subscription_details', () => {
    // Formato real observado na API 2026-07-29: a invoice de assinatura NAO
    // copia a metadata para `invoice.metadata`, so para este espelho.
    const invoice = {
      metadata: {},
      parent: {
        subscription_details: {
          subscription: 'sub_123',
          metadata: { [KEY]: 'lensys', clinicId: 'abc' },
        },
      },
    }

    expect(readInvoiceAppTag(invoice, KEY)).toBe('lensys')
    expect(classifyAppTag(readInvoiceAppTag(invoice, KEY))).toBe('this-app')
  })

  it('prefere a metadata da propria invoice quando ela existe', () => {
    const invoice = {
      metadata: { [KEY]: 'lensys' },
      parent: { subscription_details: { metadata: { [KEY]: 'optoox' } } },
    }

    expect(readInvoiceAppTag(invoice, KEY)).toBe('lensys')
  })

  it('identifica fatura de outro app da mesma conta', () => {
    const invoice = {
      parent: { subscription_details: { subscription: 'sub_x', metadata: { [KEY]: 'optoox' } } },
    }

    expect(classifyAppTag(readInvoiceAppTag(invoice, KEY))).toBe('other-app')
  })

  it('nao quebra com invoice sem parent nem metadata', () => {
    expect(readInvoiceAppTag({}, KEY)).toBeNull()
    expect(readInvoiceAppTag({ parent: null }, KEY)).toBeNull()
    expect(readInvoiceAppTag({ parent: { subscription_details: null } }, KEY)).toBeNull()
    expect(classifyAppTag(readInvoiceAppTag({}, KEY))).toBe('unmarked')
  })
})
