describe("Public navigation", () => {
  it("should navigate between landing, plans, login and register", () => {
    cy.visit("/");

    cy.contains("Lensys Care").should("be.visible");
    cy.contains("Sistema de gestão para optometria clínica").should("be.visible");

    cy.getByCy("landing-login-link").should("be.visible");
    cy.getByCy("landing-register-link").should("be.visible");

    cy.contains("Ver planos").click();
    cy.location("pathname").should("eq", "/planos");
    cy.contains("Planos para sua rotina clínica").should("be.visible");

    cy.contains("Voltar para o início").click();
    cy.location("pathname").should("eq", "/");

    cy.getByCy("landing-login-link").click();
    cy.location("pathname").should("eq", "/login");
    cy.contains("Lensys Care").should("be.visible");

    cy.contains("Voltar ao início").click();
    cy.location("pathname").should("eq", "/");

    cy.getByCy("landing-register-link").click();
    cy.location("pathname").should("eq", "/register");
    cy.contains("Criar conta").should("be.visible");
  });
});