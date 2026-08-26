# Ligar o WhatsApp pela Meta Cloud API

O código de envio já está pronto (`lib/messaging/providers/meta.ts`); o que falta é conta na
Meta. Mas "conta na Meta" quer dizer duas coisas muito diferentes dependendo de quem vai usar,
e misturar as duas foi o defeito da primeira versão deste guia.

| | Parte 1 — Piloto manual | Parte 2 — Caminho de produto |
|---|---|---|
| Para quem | **uma** clínica, cadastrada à mão | **toda** clínica que assinar o Conecta |
| Quem faz o cadastro | você, no painel da Meta | a própria clínica, dentro do Lensys |
| Onde ficam as credenciais | variável de ambiente na Vercel | linha por clínica no banco |
| Tempo | uma tarde | ~3 minutos por clínica |
| Estado | **é o que dá para fazer hoje** | precisa de verificação e App Review |

**A Parte 1 não é rascunho da Parte 2 — é pré-requisito dela.** O App Review da Meta pede
demonstração da integração funcionando de verdade, e é o piloto que produz essa demonstração.
Então a ordem é: piloto manual → burocracia → produto. Nessa ordem, sem pular.

---

# Parte 1 — Piloto manual (uma clínica)

**Tempo:** uma tarde, se nada travar. **Custo:** centavos por mensagem, sem taxa mensal.

## Leia isto antes: a Parte 1 tem duas metades, e só a segunda custa um chip

A primeira versão deste guia tratava a Parte 1 como um bloco só, e o aviso do "número
dedicado" abria a seção como se valesse para tudo. Vale para **metade** dela, e confundir as
duas faz alguém comprar chip antes da hora.

| | **1A — Número de teste** | **1B — Número real** |
|---|---|---|
| De quem é o número | **da Meta**, criada junto com a WABA | **seu** (chip ou fixo) |
| Custo | zero | um chip, ou uma linha fixa |
| Alcança quem | até **5 destinatários** cadastrados à mão | qualquer paciente |
| Some do app WhatsApp? | **não** — não é seu número | **sim**, e não desfaz fácil |
| Passos | 0, 1, 2, 4, 5, 6, 7 | acrescenta o Passo 3 |
| Serve para | provar a tubulação ponta a ponta | atender a clínica-piloto de verdade |

**Faça a 1A e pare ali.** Ela prova que o template foi aprovado, que o provider dispara, que o
cron entrega e que a mensagem chega — sem gastar nada e sem queimar número. A 1B é o caminho
de exceção, não o passo seguinte natural: veja a nota abaixo antes de sequer considerá-la.

**O que pular a 1B custa:** nenhum paciente real recebe WhatsApp até a Parte 2 ficar de pé. Isso
é aceitável porque o prazo é folgado — `due_date = exame + 365`, e o primeiro disparo automático
da base atual é **17/05/2027**.

> **A 1B provavelmente nunca vai acontecer, e isso é bom.** A pergunta que decidia isso era se
> o App Review da Parte 2 aceita demonstração gravada com número de teste. Conferido no texto
> oficial em 26/08/2026: **os dois vídeos exigidos saem inteiros da 1A.**
>
> - `whatsapp_business_messaging`: *"Record a video showing your app being used to send a
>   message to a WhatsApp number, and the WhatsApp client (either web or mobile app) receiving
>   and displaying the sent message."* — é literalmente o Passo 7, com um dos 5 destinatários.
> - `whatsapp_business_management`: *"Record a video of your app, **or WhatsApp Manager**,
>   being used to create a message template."* — aceita gravar o próprio painel, que é o Passo 5.
>
> Nenhum dos dois exige número registrado. **Ressalva:** a documentação não diz "número de
> teste é aceito" — ela apenas não exige o contrário, e a revisão é humana. A causa nº 1 de
> recusa é vídeo confuso, não tipo de número; se recusarem, regrava-se, sem perder chip.
>
> Caminho recomendado, então: **1A → Parte 2**, pulando a 1B. No Embedded Signup o Coexistence
> deixa a clínica usar o número que a recepção já tem, e ninguém compra chip nenhum. A 1B só
> volta a existir se uma clínica precisar de WhatsApp **antes** da Parte 2 ficar de pé — e aí
> o número é da clínica (fixo serve), não seu.

## Antes de começar a 1B: as duas decisões que não dá para desfazer fácil

**1. O número precisa ser dedicado.** Um número registrado na Cloud API por este fluxo **para
de funcionar no aplicativo WhatsApp normal**. Não pode ser o celular do dono nem o número que a
recepção usa para conversar com paciente. Use um chip novo, ou um número fixo da clínica (a Meta
aceita fixo — a verificação vem por chamada de voz).

> Existe um modo em que o mesmo número funciona no app **e** na API ao mesmo tempo
> (*Coexistence*), e ele resolveria justamente esse incômodo. Mas ele só é ativado pelo fluxo
> de Embedded Signup, que é a Parte 2 — pelo cadastro manual do painel, não dá. Ou seja: na
> 1B, número dedicado mesmo.

**2. Você não precisa de verificação de empresa para começar.** A Meta libera o uso sem
verificar o Business Manager, com limite de **250 destinatários por 24 horas**. O volume real do
recall é de **~12 por dia** (1.126 alertas espalhados em três meses de vencimento), então 250 é
vinte vezes o necessário. A verificação só serve para subir de faixa depois — e para a Parte 2,
onde ela deixa de ser opcional.

## Passo 0 — Criar o portfólio empresarial da **ALNA CORE**

O fluxo de criação de app tem uma etapa "Empresa" que **não deixa seguir sem um portfólio
empresarial** (o antigo Business Manager). Se você não tiver nenhum, a tela mostra "Nenhuma
empresa disponível" e trava ali — ela não cria um para você.

1. Abra <https://business.facebook.com>.
2. **Criar portfólio empresarial**.
3. Nome do portfólio, seu nome e um e-mail de trabalho.
4. Confirme o e-mail.

> **Não precisa verificar.** A própria tela diz que dá para conectar um portfólio **não
> verificado**. A verificação (com CNPJ) é outro passo, depois, e não bloqueia nada nesta
> escala — ver "O que a ALNA CORE paga uma vez", na Parte 2.

> ⚠️ **Se aparecer "Unable to Create Account — Seu acesso à publicidade foi restringido":**
> não é o nome nem o e-mail. O Gerenciador de Negócios é ferramenta de anúncios na origem, e a
> Meta gateia a criação de portfólio atrás do seu acesso à publicidade — restrito ele, nenhum
> portfólio é criável, com nenhum nome. Aconteceu aqui em 26/08/2026.
>
> Veja o motivo em `business.facebook.com/accountquality` e use **Solicitar análise**. Pode
> pedir documento com foto; o prazo relatado é de **5 a 21 dias úteis**.
>
> **Não crie segunda conta do Facebook, e não peça para outra pessoa criar o portfólio.** A
> Meta vincula portfólios por administrador, dispositivo, IP e meio de pagamento em comum: o
> novo herda a restrição e ainda registra histórico de evasão. Dois portfólios restritos em vez
> de um. O caminho é o recurso na conta que já existe.

## Passo 1 — Criar o app na Meta

> ⚠️ **O app é da ALNA CORE, não da clínica.** A primeira versão deste guia mandava usar a
> conta e o Business Manager **da clínica**, porque tratava a Parte 1 como piloto isolado.
> Está errado para o caminho 1A → Parte 2: ali o Lensys é o **Tech Provider**, o app é nosso,
> e cada clínica conecta a WABA **dela** pelo Embedded Signup. App criado sob o portfólio de
> uma clínica vira app de uma clínica só — e o App Review feito nele não serve para cadastrar
> a segunda. Refazer depois custa outro App Review.

1. Entre em <https://developers.facebook.com> com **a sua** conta Facebook.
2. **Meus apps → Criar app**.
3. Tipo: escolha a opção de negócios/empresa (o nome exato do card muda com frequência; é a
   que menciona "empresa" ou "business").
4. Dê um nome — `Lensys Care` serve — e, na etapa **Empresa**, selecione o portfólio da
   **ALNA CORE**, criado no Passo 0.

## Passo 2 — Adicionar o produto WhatsApp

1. No painel do app: **Adicionar produto → WhatsApp → Configurar**.
2. A Meta cria automaticamente uma **conta do WhatsApp Business (WABA)** e um **número de
   teste**.
3. Nessa tela aparecem três coisas que você vai usar: **Phone Number ID**, **WhatsApp Business
   Account ID** e um **token temporário**.

> **O número de teste da Meta só envia para até 5 destinatários que você cadastrar na
> mão.** Serve para o primeiro "funcionou", não para produção.

## Passo 3 — Registrar o número real (**só na 1B — pule na 1A**)

> Este é o passo que consome o chip. Se você está fazendo a 1A, **pule direto para o Passo 4**:
> o número de teste do Passo 2 já basta, e o `Phone Number ID` que você vai usar é o dele.

Ainda na aba de configuração da API:

1. **Adicionar número de telefone**.
2. Preencha nome de exibição (aparece para o paciente — use o nome da clínica), categoria e
   descrição.
3. Verifique por SMS ou chamada.
4. Depois de verificado, o **Phone Number ID muda**: é o do número novo que vale, não o do
   número de teste.

> **Nome de exibição passa por aprovação da Meta.** Nome que não bate com a marca da empresa é
> recusado. `Mais Visão` passa; `Recall Automático` não.

## Passo 4 — Token permanente (não pule este **na 1B**)

**O token que aparece na tela de configuração expira em 24 horas.** Se você colar aquele na
Vercel, o WhatsApp funciona hoje e para amanhã, sem aviso — e o erro vai parecer bug do
sistema. Produção exige token de **system user**, que não expira.

> **Na 1A, o token temporário serve** — e é o caminho mais rápido. Ele só vira armadilha
> quando vai para a Vercel, e na 1A nada vai para a Vercel (ver Passo 6). Token temporário
> expirando no `.env.local` não derruba produção: derruba o seu `localhost`, no dia seguinte,
> quando você já terminou o teste. Gere o permanente junto com o número real.

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

Guarde esse texto exato. Na Parte 2 ele deixa de ser digitado no painel e vira payload de uma
chamada de API que cria o mesmo template na WABA de cada clínica nova.

## Passo 6 — Preencher as variáveis

### Na 1A: `.env.local`, e **não** a Vercel

O número de teste só fala com os 5 destinatários que você cadastrou — ele **não consegue**
alcançar paciente real nem por acidente. Então não há o que ganhar pondo isso em produção, e
há o que perder: token temporário na Vercel quebra em 24h sem aviso.

```env
META_WHATSAPP_PHONE_NUMBER_ID=<o ID do número de TESTE, do passo 2>
META_WHATSAPP_TOKEN=<o token temporário>
```

Rode o app local (`pnpm --filter web dev:manual`, porta 3001) e siga para o Passo 7.

### Na 1B: Vercel, ambiente Production

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

> **Estas variáveis são de instância, não de clínica.** Enquanto existirem, o Lensys tem *um*
> número de WhatsApp para todos os tenants — o que só é aceitável porque hoje existe uma
> clínica ligada. É exatamente essa limitação que a Parte 2 remove.

## Passo 7 — Provar que chegou

Antes de anunciar para a clínica, mande para você mesmo:

1. Aponte temporariamente um paciente da Clínica QA Demo para o seu telefone.
2. Mova o `due_date` do alerta dele para a janela do cron (hoje + 7).
3. Chame `/api/alerts/send` com o `CRON_SECRET`.
4. Espere `sent: 1` **e** a mensagem no seu WhatsApp.
5. Restaure o registro.

A resposta da rota devolve `failures` e `skips` com o motivo de cada um — se não chegar, o
texto do erro da Meta vem ali, sem precisar de novo deploy para descobrir.

> **Grave a tela deste passo.** O App Review da Parte 2 pede vídeo da integração em uso, e este
> é o momento em que ela existe pela primeira vez. Gravar agora poupa remontar o cenário depois.

## Passo 8 — Só então, tirar o "(em breve)" (**1B, nunca na 1A**)

> **Não faça isso ao terminar a 1A.** Na 1A a mensagem chega **no seu celular**, porque você o
> cadastrou na lista — nenhum paciente da clínica é alcançável. Tirar o rótulo ali seria
> prometer no checkout um canal que não entrega, que é exatamente o problema que o commit
> `b4861e1` existiu para corrigir. O rótulo só cai quando um número real está registrado.

Com mensagem chegando de verdade **para paciente**, remova o `(em breve)` do WhatsApp em
`lib/plans/plan-feature-config.ts` e `lib/plans/plan-display-config.ts`. É o que finalmente dá
ao plano Conecta o diferencial funcional que ele cobra.

---

# Parte 2 — Caminho de produto (toda clínica assinante)

Esta parte ainda não está implementada. Está escrita aqui porque a decisão de arquitetura já
está tomada e ela muda o que a Parte 1 pode virar.

## Por que um número por clínica, e não um número do Lensys

A pergunta natural é se não daria para todas as clínicas mandarem pelo mesmo número, o nosso.
Não dá, e os três motivos são independentes — qualquer um deles já bastaria:

1. **A identidade do remetente é o número.** O nome de exibição é aprovado por número e precisa
   corresponder à marca da empresa. O paciente da *Mais Visão* receberia lembrete assinado
   "Lensys Care", nome que ele nunca ouviu. Isso é convite a bloqueio e denúncia.
2. **A nota de qualidade é por número.** Uma clínica dispara para base velha, leva denúncias, e
   a Meta rebaixa **o número**. Se o número for compartilhado, o desleixo de uma derruba o
   recall de todas — contaminação entre tenants no ponto mais caro possível.
3. **O limite diário é por número.** Os 250 (ou 1.000, após verificação) seriam divididos entre
   todos os assinantes, não concedidos a cada um.

Ou seja: o que não escala não é o número dedicado — é o **cadastro manual** da Parte 1.

## Embedded Signup: o cadastro que a clínica faz sozinha

A Meta tem um programa para exatamente este caso, o **Tech Provider**, cuja peça central é o
**Embedded Signup**.

Do lado da clínica: em `/account`, um botão "Conectar WhatsApp". Abre um popup **da própria
Meta**, ela entra com o Facebook dela, escolhe ou cria a conta WhatsApp Business, informa o
número, digita o código de verificação, o popup fecha. Uns três minutos, sem sair do Lensys.

Do lado do servidor: o popup devolve `waba_id`, `phone_number_id` e um `code` de troca. A partir
daí é tudo automático, sem a clínica ver:

1. trocar o `code` por um **token de negócio escopado naquela clínica** (server-to-server; é
   token de longa duração, não o temporário de 24h do Passo 4);
2. registrar o número da clínica para uso na Cloud API;
3. assinar nosso app nos webhooks da WABA dela;
4. **criar o template `lembrete_retorno` por API** na WABA dela, com o texto e a categoria
   *utility* do Passo 5.

Os passos 1 a 6 da Parte 1 deixam de existir para o cliente. O vídeo de ativação que faz sentido
gravar passa a ter três minutos, não uma tarde.

## Implementar contra a **v4**, e só ela

O Embedded Signup tem versões, e as antigas estão morrendo: **v2 e v3 são desativadas em
15/10/2026**. A v4 unifica o onboarding de vários produtos de Business Messaging num fluxo só,
e o onboarding de produto único continua suportado — ou seja, dá para oferecer só a Cloud API
sem carregar Messenger e Instagram junto.

> **Isso não é prazo para nós.** Não existe integração v2/v3 no Lensys para migrar; nascemos
> direto na v4. O que a data significa aqui é outra coisa: **ignore tutorial e post de blog
> anterior a dezembro/2025** — o fluxo que eles descrevem para de funcionar em outubro.

## Coexistence: o número da recepção continua sendo o número da recepção — mas custa código

Desde maio de 2025 a Meta liberou mundialmente o **Coexistence**: o mesmo número funciona no app
WhatsApp Business no celular da recepção **e** na Cloud API ao mesmo tempo, com o histórico
preservado e as mensagens caindo na mesma conversa. Para o paciente é um número só.

Isso derruba a advertência mais dolorosa da Parte 1 — mas **só pelo Embedded Signup**, e **não
sai de graça**. A primeira versão deste guia tratava o Coexistence como um interruptor; ele é
uma implementação. O que a Meta exige (conferido em 26/08/2026):

- **três webhooks assinados** no painel do app: `history` (conversas passadas),
  `smb_app_state_sync` (contatos) e `smb_message_echoes` (mensagens enviadas pelo app da
  recepção). O Lensys **não tem receptor de webhook do WhatsApp hoje** — isso é rota nova,
  com validação de assinatura, não configuração;
- o fluxo do popup **customizado** para o caminho de usuário do app WhatsApp Business, com
  registro de sessão detectando o evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING`;
- status de **Tech Provider ou Solution Partner** estabelecido;
- a clínica no app **2.24.17 ou superior**;
- a sincronização se completa em **24 horas**, ou o cadastro precisa ser refeito.

Limitações depois de ligado: throughput fixo de **20 mensagens por segundo** (irrelevante para
~12 lembretes por dia), e alguns recursos somem do app da recepção — mensagens temporárias e de
visualização única, localização ao vivo e listas de transmissão. **Avise a clínica antes**, não
depois: lista de transmissão é coisa que recepção usa.

> **Sem Coexistence o Embedded Signup continua funcionando** — a clínica só precisa cadastrar
> um número que ainda não esteja no app WhatsApp. É o caminho mais curto para o primeiro
> cliente, e o Coexistence entra depois, quando houver clínica que não aceite trocar de número.

## O que a ALNA CORE paga uma vez

**Correção de 26/08/2026:** a versão anterior desta seção dizia que a verificação de negócio é
obrigatória na Parte 2. **Não é.** O que a documentação diz é outra coisa, e mais leve:

- **App Review é o gate de verdade** — *"You will not be able to onboard business customers
  until your app has been approved for advanced access for each of the permissions it
  requires."* Pede `whatsapp_business_messaging` e `whatsapp_business_management` em acesso
  avançado, com os vídeos que a **1A** já produz.
- **Verificação de negócio é opcional, e o que ela compra é escala:** sem ela dá para
  cadastrar até **10 clínicas por semana**; com ela (mais Access Verification), **200**. Com
  um cliente ativo, 10 por semana é dez vezes o necessário — a verificação vira problema do
  décimo primeiro cliente, não do primeiro.
- app dedicado, com ícone, política de privacidade publicada e 2FA ativo.

Isso derruba o CNPJ e a papelada do caminho crítico. O que sobra é App Review — dias, e roda
em paralelo com o piloto.

## Quem paga as mensagens

Como Tech Provider indo direto na Meta, **cada clínica cadastra o meio de pagamento na WABA
dela** e a Meta cobra dela pelas conversas. Isso é desejável: o Lensys não vira intermediário
financeiro do consumo dos assinantes, e clínica que dispara muito não vira prejuízo nosso.

Embutir a mensagem no valor do plano exigiria linha de crédito compartilhada, o que significa
entrar como Solution Partner — outro patamar de burocracia e de responsabilidade. Fora do MVP.

## O que muda no código

Hoje `sendWhatsAppTemplateViaMeta` lê `process.env.META_WHATSAPP_PHONE_NUMBER_ID` e
`META_WHATSAPP_TOKEN` — credencial global, de instância. É o vício single-tenant que a Parte 2
existe para corrigir:

- **tabela nova** (`whatsapp_accounts`): `clinic_id`, `waba_id`, `phone_number_id`, token
  **cifrado**, número de exibição, status da conexão e status do template. Com RLS, como o resto.
- `sendWhatsAppTemplateViaMeta` recebe a credencial da clínica **por parâmetro**, não do ambiente.
- `isMetaConfigured()` vira `getWhatsAppAccount(clinicId)`.
- `lib/alerts/alert-channel.ts`: `permitidos.whatsapp` deixa de significar só "o plano inclui" e
  passa a significar "o plano inclui **e** esta clínica conectou um número".
- rota nova para receber o retorno do Embedded Signup, validando o `clinic_id` da sessão — o
  código do popup nunca define de que clínica ele é.

> **O token da clínica é credencial de terceiro.** Cifrado no banco, exclusivamente server-side,
> nunca em log e nunca perto do cliente — o mesmo rigor do `service_role`. Vazar esse token
> significa alguém mandando WhatsApp em nome da clínica.

## Sequência

| Fase | O quê | Bloqueia? |
|---|---|---|
| 0 | **1A** — número de teste. Prova a tubulação e grava os dois vídeos. | é o que destrava o resto |
| 1 | **App Review** com os vídeos da fase 0. | sim — sem ele não se cadastra clínica nenhuma |
| 2 | **Embedded Signup v4** + credenciais por clínica + template por API. | depende da 1 aprovada |
| 3 | *(opcional)* Coexistence: webhooks e fluxo customizado. | só quando houver clínica que não troque de número |
| — | Verificação de negócio. | **não bloqueia** — só sobe o teto de 10 para 200 clínicas/semana |

O Conecta só é vendável fora da Feira no fim da fase 2.

**A 1B não aparece nesta tabela de propósito.** Ela não é etapa do caminho: é exceção, para o
caso de uma clínica precisar de WhatsApp antes da fase 2 ficar de pé.

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
| Segunda clínica quer WhatsApp | Não tem gambiarra segura na Parte 1. É a Parte 2, ou nada. |

Fontes consultadas em 24/08/2026, revisadas em 25/08/2026 e **reconferidas em 26/08/2026** (App Review, Embedded Signup v4, requisitos de Coexistence): [Meta for Developers — Cloud API Get
Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started),
[Embedded Signup — visão
geral](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview/),
[Embedded Signup —
implementação](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation),
[guia de tokens de
acesso](https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens/),
[programa Tech Provider
(Twilio)](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide),
[Coexistence — de beta a disponibilidade
mundial](https://chakrahq.com/article/whatsapp-coexistence-business-app-register-cloud-api/),
[limites por faixa](https://chatarmin.com/en/blog/whats-app-messaging-limits), [uso sem
verificação](https://wassenger.com/blog/en/whatsapp-business-api-without-verification).
