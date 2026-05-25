describe("Authentication", () => {
  it("should login with a demo QA account and logout", () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

    cy.visit("/login", { timeout: 120000 });

    cy.get('[data-cy="login-email-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type(email);

    cy.get('[data-cy="login-password-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type(password, { log: false });

    cy.get('[data-cy="login-submit-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/dashboard");

    cy.contains("Painel Geral", { timeout: 30000 }).should("be.visible");
    cy.contains("QA Tester", { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="logout-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should((url) => {
      expect(url).to.match(/\/login|\/$/);
    });
  });
});