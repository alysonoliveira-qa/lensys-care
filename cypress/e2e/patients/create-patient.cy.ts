describe("Patients", () => {
  it("should create a patient and open the patient record", () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");
    const uniqueId = Date.now();

    const patientName = `Paciente Cypress ${uniqueId}`;
    const patientPhone = "11999999999";
    const patientEmail = `paciente.cypress.${uniqueId}@example.com`;

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

    cy.get('[data-cy="sidebar-patients-link"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/patients");

    cy.contains("Pacientes Cadastrados", { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="new-patient-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/patients/new");

    cy.get('[data-cy="patient-form"]', { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="patient-name-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type(patientName);

    cy.get('[data-cy="patient-birthdate-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("1990-01-15");

    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="patient-phone-input"]').length) {
        cy.get('[data-cy="patient-phone-input"]')
          .should("be.visible")
          .clear()
          .type(patientPhone);
      }

      if ($body.find('[data-cy="patient-email-input"]').length) {
        cy.get('[data-cy="patient-email-input"]')
          .should("be.visible")
          .clear()
          .type(patientEmail);
      }
    });

    cy.get('[data-cy="save-patient-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("match", /\/patients\/.+/);

    cy.contains(patientName, { timeout: 30000 }).should("be.visible");

    cy.contains(/Iniciar primeiro exame|Lançar novo exame/i, { timeout: 30000 })
      .should("be.visible");
  });
});