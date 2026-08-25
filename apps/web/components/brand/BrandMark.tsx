// ─────────────────────────────────────────────────────────────────────────────
// components/brand/BrandMark.tsx
// O símbolo da marca: uma lente vista de corte.
//
// A geometria é uma vesica equilátera — duas circunferências de mesmo raio
// (r = 2h/√3, com h = 24) cujos arcos se cruzam a 60°. É a seção de uma lente
// biconvexa, e a razão 1,73 : 1 entre altura e largura é o que separa "lente"
// de "folha". Não achate.
//
// O furo central é buraco de verdade (`fillRule="evenodd"`), não um círculo
// branco por cima: é o que deixa o símbolo ser aplicado sobre foto, sobre cor
// ou dentro do ícone indigo sem aparecer miolo branco fora de lugar.
//
// Os arquivos para uso externo (gráfica, App Review da Meta, fornecedor) estão
// em `public/brand/`. Este componente existe para o uso dentro do app, onde
// herdar `currentColor` vale mais do que carregar um arquivo.
// ─────────────────────────────────────────────────────────────────────────────

const CORPO_DA_LENTE =
  'M32 8A27.713 27.713 0 0 1 32 56A27.713 27.713 0 0 1 32 8ZM32 26.8a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 1 0 0-10.4Z'

const BRILHO_ESPECULAR = 'M25.07 19.01A24.513 24.513 0 0 0 21.37 30.72'

interface BrandMarkProps {
  /** Tamanho e cor vêm daqui: o corpo da lente pinta com `currentColor`. */
  className?: string
  /**
   * Brilho no gume esquerdo. É a única concessão não-geométrica do desenho, e
   * ela existe por um motivo: sem ele a forma lê como folha; com ele, lê como
   * vidro. Abaixo de ~24px o traço fecha — aí passe `false`.
   */
  showHighlight?: boolean
  /** Rótulo acessível. `null` marca o símbolo como decorativo. */
  label?: string | null
}

export default function BrandMark({
  className,
  showHighlight = true,
  label = 'Lensys Care',
}: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path fill="currentColor" fillRule="evenodd" d={CORPO_DA_LENTE} />
      {showHighlight && (
        // Branco cravado, e não um token: este traço fica SOBRE o corpo da
        // lente, nunca sobre o fundo da página. Quem muda com o tema é a cor
        // do corpo, via `currentColor` — o brilho acompanha de graça.
        <path
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.6"
          strokeWidth="2.4"
          strokeLinecap="round"
          d={BRILHO_ESPECULAR}
        />
      )}
    </svg>
  )
}
