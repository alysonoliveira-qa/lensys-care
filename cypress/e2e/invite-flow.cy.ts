/// <reference types="cypress" />

describe("Fluxo de convite de membros", () => {
  const timeout = 30000;

  const loginAs = (email: string, password: string) => {
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

  const loginAsOwner = () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

    loginAs(email, password);
  };

  it("OWNER consegue enviar e revogar um convite pendente", () => {
    const inviteEmail = `cypress-invite-${Date.now()}@example.com`;

    loginAsOwner();
    cy.visit("/account", { timeout });

    // Formulário de convite visível para OWNER
    cy.get('[data-cy="invite-create-form"]', { timeout }).should("be.visible");

    cy.get('[data-cy="invite-email-input"]', { timeout }).clear().type(inviteEmail);
    cy.get('[data-cy="invite-role-select"]', { timeout }).select("OPTOMETRIST");
    cy.get('[data-cy="invite-submit"]', { timeout }).click();

    // Mensagem de sucesso
    cy.get('[data-cy="team-success-message"]', { timeout }).should("contain.text", inviteEmail);

    // Convite aparece na lista de pendentes
    cy.get('[data-cy="pending-invites-list"]', { timeout })
      .should("contain.text", inviteEmail);

    // Revoga o convite (também serve de limpeza)
    cy.get('[data-cy="pending-invite-row"]', { timeout })
      .contains(inviteEmail)
      .parents('[data-cy="pending-invite-row"]')
      .find('[data-cy="invite-revoke-button"]')
      .click();

    cy.get('[data-cy="team-section"]', { timeout }).should("not.contain.text", inviteEmail);
  });

  it("Página de convite exibe erro para token inválido", () => {
    cy.visit("/convite/token-invalido-inexistente", { timeout, failOnStatusCode: false });
    cy.get('[data-cy="invite-error"]', { timeout }).should("be.visible");
  });

  it("Página de convite exibe nome da clínica e função para token válido", function () {
    const validToken = Cypress.env("E2E_INVITE_TOKEN");

    if (!validToken) {
      cy.log("E2E_INVITE_TOKEN não definido — cenário ignorado.");
      this.skip();
    }

    cy.visit(`/convite/${validToken}`, { timeout, failOnStatusCode: false });
    cy.get('[data-cy="invite-page"]', { timeout }).should("be.visible");
    cy.get('[data-cy="invite-clinic-name"]', { timeout }).should("not.be.empty");
    cy.get('[data-cy="invite-role"]', { timeout }).should("not.be.empty");
  });

  it("OWNER consegue remover um membro", function () {
    const receptionistEmail = Cypress.env("E2E_RECEPTIONIST_EMAIL");

    if (!receptionistEmail) {
      cy.log("E2E_RECEPTIONIST_EMAIL não definido — cenário ignorado.");
      this.skip();
    }

    loginAsOwner();
    cy.visit("/account", { timeout });

    cy.get('[data-cy="members-list"]', { timeout })
      .contains('[data-cy="member-row"]', receptionistEmail)
      .find('[data-cy="member-remove-button"]')
      .click();

    // Confirmação nativa do navegador (window.confirm) é aceita automaticamente.
    cy.get('[data-cy="members-list"]', { timeout }).should("not.contain.text", receptionistEmail);
  });

  it("RECEPTIONIST não vê o formulário de convite", function () {
    const email = Cypress.env("E2E_RECEPTIONIST_EMAIL");
    const password = Cypress.env("E2E_RECEPTIONIST_PASSWORD");

    if (!email || !password) {
      cy.log("Credenciais de RECEPTIONIST não definidas — cenário ignorado.");
      this.skip();
    }

    loginAs(email, password);
    cy.visit("/account", { timeout });

    cy.get('[data-cy="account-page"]', { timeout }).should("be.visible");
    cy.get('[data-cy="invite-create-form"]').should("not.exist");
  });
});
