# UI Consistency Audit - Lensys Care

## Resumo executivo

O Lensys Care hoje tem dois dialetos visuais convivendo no produto:

1. Um padrão mais refinado, já visível no Dashboard e em partes de Subscription:
   - cards com `rounded-2xl` ou maior
   - sombras leves e consistentes
   - hierarquia mais forte em títulos, badges e blocos de contexto
   - uso mais claro de superfícies internas, bordas suaves e acentos visuais

2. Um padrão mais funcional e neutro, ainda predominante em Patients, Account e partes de Exams:
   - cards mais simples
   - inputs e selects com alturas e raios mistos
   - tabelas sem o mesmo grau de acabamento do Dashboard
   - headers menos expressivos e menos contextualizados

Não há um problema de usabilidade estrutural. O principal gap é de consistência de acabamento. A recomendação segura é padronizar incrementalmente o visual em torno do padrão já amadurecido no Dashboard, sem refatoração ampla de arquitetura e sem criar novos componentes agora.

## O que está visualmente bom no Dashboard

O Dashboard deve ser tratado como baseline visual atual do produto.

- Hero/header com boa hierarquia, contexto e profundidade visual.
- Summary cards com:
  - `rounded-2xl`
  - sombra suave
  - topo com accent colorido
  - labels pequenas em uppercase
  - ícones em containers dedicados
- Tabelas e empty states com melhor acabamento:
  - containers internos arredondados
  - bordas suaves
  - estados vazios com `border-dashed`, fundo discreto e centralização adequada
- Botões principais com altura consistente, borda arredondada e sombra controlada.
- Uso de badges e chips para status/contexto sem excesso visual.

## Onde as outras páginas divergem

### Patients

- Header é funcional, mas menos rico que o Dashboard.
- Cards da busca e da lista ainda usam visual mais plano.
- A tabela principal está próxima do padrão novo, mas sem o mesmo container interno arredondado do Dashboard.
- Empty state é correto, porém mais simples e menos estruturado.

### Patient detail

- A página mistura bons elementos com padrões antigos.
- `PatientSummaryCard` e histórico de exames usam cards diferentes entre si.
- O topo da página é utilitário, sem um bloco de contexto comparável ao Dashboard.
- O histórico de exames usa muitos sub-blocos internos com estilos bons, mas nem sempre alinhados ao padrão de raios/sombras do Dashboard.

### Alerts

- O filtro/ordenação já está mais alinhado ao padrão premium.
- A tabela ainda segue o padrão antigo de lista funcional, sem container interno arredondado como no Dashboard.
- O header é simples e coerente, mas menos expressivo que a baseline visual.

### Account

- É a área mais claramente defasada visualmente.
- Inputs ainda usam `h-10`, `rounded-md` implícito e fundo `bg-slate-50`, enquanto o padrão novo tende a `h-11`, `rounded-xl` e sombra leve.
- Cards são corretos, mas pouco distintos e sem sinais visuais de prioridade.
- Os blocos informativos inferiores parecem cards utilitários antigos.

### Subscription

- Está visualmente mais próxima do Dashboard.
- O hero da página está forte e coerente.
- Os plan cards têm bom nível visual, mas ainda não seguem exatamente o mesmo vocabulário de borda/sombra/top accent dos summary cards do Dashboard.

### Exam form

- O form tem boa densidade e boa divisão de seções, mas mistura padrões.
- O card escuro de cabeçalho cria uma linguagem própria, válida, porém distante das outras superfícies do dashboard autenticado.
- Alguns selects e inputs internos ainda usam `rounded-md`, `h-9` ou `h-10`, sem o mesmo tratamento recente aplicado em Alerts.
- `PrescriptionNotesSection` e `VisualAcuityField` ainda usam um padrão visual mais antigo para selects.

### Print page

- Faz sentido tratá-la separadamente.
- A página de impressão é deliberadamente utilitária, documental e orientada a papel.
- Ela não precisa seguir totalmente o mesmo acabamento visual do app shell, desde que preserve legibilidade e consistência tipográfica mínima com a marca.

## Padrão recomendado para cards

Usar o Dashboard como referência.

- Card padrão de página:
  - `rounded-2xl`
  - `border-slate-200/80`
  - `bg-white`
  - `shadow-sm shadow-slate-200/60`
- Card interno de tabela/lista:
  - mesmo raio `rounded-2xl`
  - borda interna sutil para o container da tabela
- Card de destaque:
  - pode usar top accent de 1px a 4px ou badge contextual
  - evitar gradientes e efeitos decorativos fora de headers realmente prioritários
- Card informativo pequeno:
  - ícone em container arredondado
  - padding consistente
  - evitar blocos visuais “planos” demais quando estiverem ao lado de cards mais modernos

## Padrão recomendado para filtros, search e selects

- Altura padrão: `h-11`
- Raios: `rounded-xl`
- Bordas: `border-slate-200/80`
- Fundo: `bg-white`
- Sombra: `shadow-sm shadow-slate-200/40`
- Focus:
  - `focus:border-indigo-500/50`
  - `focus:ring-4 focus:ring-indigo-500/15`
- Labels:
  - `text-xs`
  - `font-semibold`
  - `uppercase tracking-wider`
  - `text-slate-500`
- Selects:
  - `appearance-none`
  - ícone `ChevronDown` à direita
- Busca:
  - ícone interno à esquerda
  - placeholder discreto
  - manter o mesmo comportamento, alterando apenas o acabamento

Observação: o padrão recentemente aplicado em `AlertsListControls` deve virar a referência direta para filtros e dropdowns do restante do app autenticado.

## Padrão recomendado para tabelas e listas

- Envolver tabelas em container interno com:
  - `overflow-x-auto`
  - `rounded-2xl`
  - `border border-slate-100`
- Cabeçalho da tabela:
  - `bg-slate-50/80`
  - uppercase
  - tracking mais aberto
  - contraste discreto, não agressivo
- Linhas:
  - hover suave
  - `divide-y divide-slate-100`
- Ações:
  - botões `outline` pequenos com `rounded-lg`
  - alinhamento consistente na coluna final
- Empty states:
  - preferir bloco centralizado com `border-dashed`, fundo discreto, ícone e duas linhas de texto

## Padrão recomendado para botões

- Primário:
  - `bg-indigo-600`
  - `hover:bg-indigo-500`
  - `rounded-xl`
  - `h-11`
  - `font-semibold`
  - `shadow-lg shadow-indigo-500/10` quando for CTA principal
- Secundário / outline:
  - `rounded-xl` em contextos de formulário e toolbar
  - `rounded-lg` pode permanecer em ações de tabela pequenas
- Destrutivo:
  - manter destaque claro, sem competir com o primário
  - usar o mesmo nível de raio e peso tipográfico do restante
- Evitar mistura arbitrária entre:
  - `font-bold` vs `font-semibold`
  - `h-10` vs `h-11`
  - `rounded-md` vs `rounded-xl`

## Padrão recomendado para status e badges

- Reaproveitar semanticamente o que já existe em Alerts e badges premium.
- Consolidar um mapa visual simples:
  - `PENDING`: amber
  - `SENT` / sucesso: emerald
  - `DISMISSED` / cancelado: slate
  - premium / plano: gradient premium existente
- Badge padrão:
  - `rounded-full`
  - tamanho pequeno
  - peso semibold
  - uso contido, sempre com função semântica clara

## Próximos commits incrementais recomendados

1. `Patients`: alinhar containers da tabela e empty state ao padrão do Dashboard.
2. `Account`: atualizar cards, inputs e CTA principal para o mesmo vocabulário de `rounded-xl`, `h-11` e sombra suave.
3. `Patient detail`: elevar o header e uniformizar `PatientSummaryCard`, `PatientRecallsCard` e histórico de exames.
4. `Exams`: padronizar selects e inputs internos (`VisualAcuityField`, `PrescriptionNotesSection`, medidas de suporte).
5. `Alerts`: aplicar o mesmo acabamento interno de tabela/lista usado em `RecentPatientsSection`.

## Notas adicionais

- Há sinais de mojibake em vários textos renderizados no código-fonte (`Ã`, `Â`, etc.). Isso não é um problema de layout, mas afeta a percepção de qualidade visual e deve entrar no backlog de UI copy/encoding.
- A print page deve ficar fora da primeira rodada de padronização visual. Ela merece apenas uma revisão tipográfica e de consistência de marca, não a adoção completa do padrão de cards do app.
