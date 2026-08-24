# Ligar o WhatsApp pela Meta Cloud API

Guia de cadastro na Meta para o recall sair por WhatsApp. O código já está pronto
(`lib/messaging/providers/meta.ts`); o que falta é a conta, e isso só você pode fazer.

**Tempo:** uma tarde, se nada travar. **Custo:** centavos por mensagem, sem taxa mensal.

---

## Antes de começar: as duas decisões que não dá para desfazer fácil

**1. O número precisa ser dedicado.** Um número registrado na Cloud API **para de funcionar
no aplicativo WhatsApp normal**. Não pode ser o celular do dono nem o número que a recepção
usa para conversar com paciente. Use um chip novo, ou um número fixo da clínica (a Meta aceita
fixo — a verificação vem por chamada de voz).

**2. Você não precisa de verificação de empresa para começar.** A Meta liberou o uso sem
verificar o Business Manager, com limite de **250 destinatários por 24 horas**. O volume real
do recall é de **~12 por dia** (1.126 alertas espalhados em três meses de vencimento), então
250 é vinte vezes o necessário. A verificação só serve para subir de faixa depois — deixe para
quando fizer falta.

---

## Passo 1 — Criar o app na Meta

1. Entre em <https://developers.facebook.com> com a conta Facebook da clínica.
2. **Meus apps → Criar app**.
3. Tipo: escolha a opção de negócios/empresa (o nome exato do card muda com frequência; é a
   que menciona "empresa" ou "business").
4. Dê um nome — `Lensys Care` serve — e associe ao Business Manager da clínica. Se não houver
   um, o próprio fluxo cria.

## Passo 2 — Adicionar o produto WhatsApp

1. No painel do app: **Adicionar produto → WhatsApp → Configurar**.
2. A Meta cria automaticamente uma **conta do WhatsApp Business (WABA)** e um **número de
   teste**.
3. Nessa tela aparecem três coisas que você vai usar: **Phone Number ID**, **WhatsApp Business
   Account ID** e um **token temporário**.

> **O número de teste da Meta só envia para até 5 destinatários que você cadastrar na
> mão.** Serve para o primeiro "funcionou", não para produção.

## Passo 3 — Registrar o número real

Ainda na aba de configuração da API:

1. **Adicionar número de telefone**.
2. Preencha nome de exibição (aparece para o paciente — use o nome da clínica), categoria e
   descrição.
3. Verifique por SMS ou chamada.
4. Depois de verificado, o **Phone Number ID muda**: é o do número novo que vale, não o do
   número de teste.

> **Nome de exibição passa por aprovação da Meta.** Nome que não bate com a marca da empresa é
> recusado. `Mais Visão` passa; `Recall Automático` não.

## Passo 4 — Token permanente (não pule este)

**O token que aparece na tela de configuração expira em 24 horas.** Se você colar aquele na
Vercel, o WhatsApp funciona hoje e para amanhã, sem aviso — e o erro vai parecer bug do
sistema. Produção exige token de **system user**, que não expira.

1. **Business Manager → Configurações do negócio → Usuários do sistema**.
2. **Adicionar** → nome (`lensys-envio`) → função **Administrador**.
3. Selecione o usuário criado → **Atribuir ativos**:
   - o **app** com controle total;
   - a **conta do WhatsApp Business** com controle total.
4. **Gerar novo token** → escolha o app → marque as permissões **`whatsapp_business_messaging`**
   e **`whatsapp_business_management`** → expiração **Nunca**.
5. **Copie o token agora.** Ele aparece uma única vez; depois só resta gerar outro.

## Passo 5 — Criar o template

O recall é mensagem iniciada pela clínica, fora da janela de 24 horas — então **só sai como
template aprovado**. Texto livre ali volta com o erro `131047`.

1. **Business Manager → WhatsApp Manager → Modelos de mensagem → Criar modelo**.
2. Preencha exatamente assim:

   | Campo | Valor |
   |---|---|
   | Nome | `lembrete_retorno` |
   | Categoria | **Utilidade** (*utility*) |
   | Idioma | **Português (BR)** |

3. Corpo da mensagem — cole este texto:

   ```
   Olá, {{1}}! Sua consulta de renovação de óculos está se aproximando.
   Entre em contato com a nossa equipe para agendar o seu exame.
   ```

4. Em exemplo da variável, preencha com um nome qualquer (`Maria Silva`) — a Meta exige
   exemplo para revisar.
5. Enviar para revisão. Costuma sair em minutos; pode levar horas.

> **Escolha "Utilidade", não "Marketing".** Utility é mais barato e a revisão é mais simples,
> porque a Meta a trata como serviço, não como propaganda. Lembrete de retorno de consulta é
> serviço.
>
> **Não mexa no texto sem necessidade.** A variável `{{1}}` não pode ser a primeira nem a
> última coisa da mensagem, e duas variáveis não podem ficar coladas — a Meta recusa. O texto
> acima já respeita isso.

## Passo 6 — Preencher as variáveis na Vercel

Em **Settings → Environment Variables** do projeto `lensys-care`, ambiente **Production**:

```env
META_WHATSAPP_PHONE_NUMBER_ID=<o ID do número real, do passo 3>
META_WHATSAPP_TOKEN=<o token permanente, do passo 4>
```

Opcionais (os padrões já são estes): `META_WHATSAPP_TEMPLATE=lembrete_retorno` e
`META_WHATSAPP_TEMPLATE_LANG=pt_BR`.

Depois, **redeploy** — variável nova só vale no build seguinte.

> Cole variável por variável. O botão *Import .env* joga o arquivo inteiro no ambiente
> escolhido, e num `.env.local` isso leva junto `NEXT_PUBLIC_APP_URL=localhost:3001` e as
> chaves de teste do Stripe por cima das de produção.

## Passo 7 — Provar que chegou

Antes de anunciar para a clínica, mande para você mesmo:

1. Aponte temporariamente um paciente da Clínica QA Demo para o seu telefone.
2. Mova o `due_date` do alerta dele para a janela do cron (hoje + 7).
3. Chame `/api/alerts/send` com o `CRON_SECRET`.
4. Espere `sent: 1` **e** a mensagem no seu WhatsApp.
5. Restaure o registro.

A resposta da rota devolve `failures` e `skips` com o motivo de cada um — se não chegar, o
texto do erro da Meta vem ali, sem precisar de novo deploy para descobrir.

## Passo 8 — Só então, tirar o "(em breve)"

Com mensagem chegando de verdade, remova o `(em breve)` do WhatsApp em
`lib/plans/plan-feature-config.ts` e `lib/plans/plan-display-config.ts`. É o que finalmente dá
ao plano Conecta o diferencial funcional que ele cobra.

---

## Se travar

| Sintoma | Causa quase sempre |
|---|---|
| Funcionou ontem, parou hoje | Token temporário. Refaça o passo 4. |
| `131047` | Tentou texto livre fora da janela de 24h. É bug de código, não de cadastro — me chame. |
| `132001` | Nome do template errado, ou ainda não aprovado. |
| `131026` | Número do destinatário não tem WhatsApp, ou o formato saiu errado. |
| Nome de exibição recusado | Precisa corresponder à marca da empresa. |
| Parou depois de ~250 envios no dia | Limite da faixa sem verificação. Aí sim vale verificar o Business Manager. |

Fontes consultadas em 24/08/2026: [Meta for Developers — Cloud API Get
Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started),
[limites por faixa](https://chatarmin.com/en/blog/whats-app-messaging-limits), [uso sem
verificação](https://wassenger.com/blog/en/whatsapp-business-api-without-verification).
