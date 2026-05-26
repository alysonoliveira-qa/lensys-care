describe("Public plans page", () => {
  it("should render public plans without authenticated sidebar and navigate to register", () => {
    cy.visit("/planos");

    cy.get('[data-cy="public-plans-page"]', { timeout: 30000 }).should("be.visible");

    cy.contains(/Lensys Care|Planos/i, { timeout: 30000 }).should("be.visible");
    cy.contains("Essencial", { timeout: 30000 }).should("be.visible");
    cy.contains("Conecta", { timeout: 30000 }).should("be.visible");
    cy.contains("R$ 79,90", { timeout: 30000 }).should("be.visible");
    cy.contains("R$ 149,90", { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="sidebar-dashboard-link"]').should("not.exist");
    cy.get('[data-cy="sidebar-patients-link"]').should("not.exist");
    cy.get('[data-cy="sidebar-alerts-link"]').should("not.exist");
    cy.get('[data-cy="sidebar-plans-link"]').should("not.exist");
    cy.get('[data-cy="logout-button"]').should("not.exist");

    cy.contains("Começar teste grátis", { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/register");
  });
});
