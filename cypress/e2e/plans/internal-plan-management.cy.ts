describe("Internal plan management", () => {
  const timeout = 30000;

  const loginAsDemoUser = () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

    cy.visit("/login", { timeout: 120000 });

    cy.get('[data-cy="login-email-input"]', { timeout })
      .should("be.visible")
      .clear()
      .type(email);

    cy.get('[data-cy="login-password-input"]', { timeout })
      .should("be.visible")
      .clear()
      .type(password, { log: false });

    cy.get('[data-cy="login-submit-button"]', { timeout })
      .should("be.visible")
      .click();

    cy.url({ timeout }).should("include", "/dashboard");
  };

  const openPlansPage = () => {
    // `/dashboard/planos` e rota legada: o page.tsx dela so faz
    // `redirect('/subscription')`. Visitar por ela cobre o redirect de brinde.
    cy.visit("/dashboard/planos", { timeout: 120000 });

    cy.url({ timeout }).should("include", "/subscription");
    cy.get('[data-cy="plans-page"]', { timeout }).should("be.visible");
  };

  it("shows the plan cards and marks exactly one as current", () => {
    loginAsDemoUser();
    openPlansPage();

    cy.get('[data-cy="essential-plan-card"]', { timeout }).should("be.visible");
    cy.get('[data-cy="connect-plan-card"]', { timeout }).should("be.visible");
    cy.get('[data-cy="professional-plan-card"]', { timeout }).should("be.visible");

    cy.get('[data-cy="current-plan-badge"]', { timeout })
      .should("be.visible")
      .and("have.length", 1);
  });

  // GAP CONHECIDO — a troca de plano em si nao esta coberta aqui.
  //
  // `activatePlan` nunca conclui dentro do app: ela redireciona para o Checkout
  // do Stripe (assinatura nova) ou para o portal de cobranca (assinatura viva).
  // Cobrir isso de verdade exige `cy.origin` para atravessar para
  // checkout.stripe.com, um ambiente isolado e uma conta de teste do Stripe —
  // nada disso pode rodar contra producao.
  //
  // A versao anterior deste spec fingia cobrir esse fluxo: esperava um
  // `[data-cy="plan-success-message"]` com o texto "Plano X ativado com
  // sucesso.". Esse elemento nunca renderizou, porque a action nao produz estado
  // de sucesso, e essa frase nao existe em lugar nenhum do app — sobrevivia so
  // dentro deste arquivo. O teste falhava, e a matriz de cobertura contava com
  // ele mesmo assim.
  //
  // Enquanto o ambiente isolado nao existir, este gap fica declarado aqui e em
  // docs/testing-coverage-matrix.md, e nao disfarcado de teste verde.
});
