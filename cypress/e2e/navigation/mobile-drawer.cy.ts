describe("Mobile Drawer Navigation", () => {
  it("should open the mobile drawer, navigate to patients, and close via overlay", () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

    cy.viewport("iphone-x");

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

    cy.get('[data-cy="mobile-menu-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.get('[data-cy="mobile-sidebar-drawer"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-overlay"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-drawer"]')
      .find('[data-cy="sidebar-dashboard-link"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-drawer"]')
      .find('[data-cy="sidebar-alerts-link"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-drawer"]')
      .find('[data-cy="sidebar-plans-link"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-drawer"]')
      .find('[data-cy="sidebar-patients-link"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/patients");
    cy.get('[data-cy="mobile-sidebar-overlay"]', { timeout: 30000 }).should("not.exist");

    cy.get('[data-cy="mobile-menu-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.get('[data-cy="mobile-sidebar-drawer"]', { timeout: 30000 })
      .should("be.visible");

    cy.get('[data-cy="mobile-sidebar-overlay"]', { timeout: 30000 })
      .should("be.visible")
      .click({ force: true });

    cy.get('[data-cy="mobile-sidebar-overlay"]', { timeout: 30000 }).should("not.exist");
  });
});
