describe("Authentication", () => {
  it("should login with a demo QA account and logout", () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

    cy.visit("/login");

    cy.getByCy("login-email-input").type(email);
    cy.getByCy("login-password-input").type(password, { log: false });
    cy.getByCy("login-submit-button").click();

    cy.location("pathname", { timeout: 15000 }).should("eq", "/dashboard");
    cy.contains("Olá").should("be.visible");
    cy.getByCy("sidebar-dashboard-link").should("be.visible");

    cy.getByCy("logout-button").click();

    cy.location("pathname", { timeout: 10000 }).should("match", /\/login|\/$/);
  });
});