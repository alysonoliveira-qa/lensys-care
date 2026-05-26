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
    cy.visit("/dashboard/planos", { timeout: 120000 });

    cy.get('[data-cy="plans-page"]', { timeout }).should("be.visible");
    cy.url({ timeout }).should("include", "/dashboard/planos");
  };

  const assertCurrentPlanCard = (expectedPlanCardCy: string) => {
    cy.get('[data-cy="current-plan-badge"]', { timeout }).should("be.visible");
    cy.get(`[data-cy="${expectedPlanCardCy}"] [data-cy="current-plan-badge"]`, { timeout }).should(
      "be.visible"
    );
  };

  const ensureEssentialPlanIsCurrent = () => {
    cy.get("body", { timeout }).then(($body) => {
      const connectIsCurrent =
        $body.find('[data-cy="connect-plan-card"] [data-cy="current-plan-badge"]').length > 0;

      if (connectIsCurrent) {
        cy.get('[data-cy="activate-essential-plan-button"]', { timeout })
          .should("be.visible")
          .click();

        cy.get('[data-cy="plan-success-message"]', { timeout })
          .should("be.visible")
          .and("contain.text", "Plano Essencial ativado com sucesso.");

        assertCurrentPlanCard("essential-plan-card");
      }
    });
  };

  const activatePlanAndAssert = (
    buttonCy: string,
    expectedMessage: string,
    expectedPlanCardCy: string
  ) => {
    cy.get(`[data-cy="${buttonCy}"]`, { timeout })
      .should("be.visible")
      .click();

    cy.get('[data-cy="plan-success-message"]', { timeout })
      .should("be.visible")
      .and("contain.text", expectedMessage);

    assertCurrentPlanCard(expectedPlanCardCy);
  };

  it("should switch the clinic plan from Essencial to Conecta and back", () => {
    loginAsDemoUser();
    openPlansPage();

    cy.get('[data-cy="essential-plan-card"]', { timeout }).should("be.visible");
    cy.get('[data-cy="connect-plan-card"]', { timeout }).should("be.visible");
    cy.get('[data-cy="current-plan-badge"]', { timeout }).should("be.visible");

    ensureEssentialPlanIsCurrent();

    activatePlanAndAssert(
      "activate-connect-plan-button",
      "Plano Conecta ativado com sucesso.",
      "connect-plan-card"
    );

    activatePlanAndAssert(
      "activate-essential-plan-button",
      "Plano Essencial ativado com sucesso.",
      "essential-plan-card"
    );
  });
});
