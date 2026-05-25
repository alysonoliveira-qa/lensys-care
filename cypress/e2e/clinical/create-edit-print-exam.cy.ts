describe("Clinical flow", () => {
  it("should create a patient, create an exam, edit it and open printable view", () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");
    const uniqueId = Date.now();

    const patientName = `Paciente Clinico Cypress ${uniqueId}`;
    const patientPhone = "11999999999";
    const patientEmail = `clinico.cypress.${uniqueId}@example.com`;

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
      .type("1995-05-20");

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
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("include", "/exams/new");

    cy.get('[data-cy="exam-form"]', { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="exam-od-sphere-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("-1.25");

    cy.get('[data-cy="exam-od-cylinder-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("-0.50");

    cy.get('[data-cy="exam-od-axis-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("30");

    cy.get('[data-cy="exam-oe-sphere-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("-0.75");

    cy.get('[data-cy="exam-oe-cylinder-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("-0.25");

    cy.get('[data-cy="exam-oe-axis-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("180");

    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="exam-od-visual-acuity-input"]').length) {
        cy.get('[data-cy="exam-od-visual-acuity-input"]')
          .should("be.visible")
          .select("20/40");
      }

      if ($body.find('[data-cy="exam-os-visual-acuity-input"]').length) {
        cy.get('[data-cy="exam-os-visual-acuity-input"]')
          .should("be.visible")
          .select("20/20");
      }

      if ($body.find('[data-cy="quick-note-antireflexo-checkbox"]').length) {
        cy.get('[data-cy="quick-note-antireflexo-checkbox"]').check({ force: true });
      }

      if ($body.find('[data-cy="quick-note-filtro-azul-checkbox"]').length) {
        cy.get('[data-cy="quick-note-filtro-azul-checkbox"]').check({ force: true });
      }
    });

    cy.get('[data-cy="exam-notes-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("Observação criada pelo Cypress.");

    cy.get('[data-cy="save-exam-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("match", /\/patients\/.+/);

    cy.contains(patientName, { timeout: 30000 }).should("be.visible");
    cy.contains("Historico de Exames", { timeout: 30000 }).should("be.visible");
    cy.contains("-1.25", { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="edit-exam-button"]', { timeout: 30000 })
      .first()
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("match", /\/exams\/.+\/edit/);

    cy.get('[data-cy="exam-od-sphere-input"]', { timeout: 30000 })
      .should("be.visible")
      .clear()
      .type("-1.50");

    cy.get('[data-cy="save-exam-button"]', { timeout: 30000 })
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("match", /\/patients\/.+/);

    cy.contains("-1.50", { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="print-exam-button"]', { timeout: 30000 })
      .first()
      .should("be.visible")
      .click();

    cy.url({ timeout: 30000 }).should("match", /\/exams\/.+\/print/);

    cy.contains("Lensys Care", { timeout: 30000 }).should("be.visible");
    cy.contains(patientName, { timeout: 30000 }).should("be.visible");
    cy.contains(/gradua[cç][aã]o refrativa/i, { timeout: 30000 }).should("be.visible");
    cy.contains("-1.50", { timeout: 30000 }).should("be.visible");
    cy.contains("20/40", { timeout: 30000 }).should("be.visible");
    cy.contains("Observação criada pelo Cypress.", { timeout: 30000 }).should("be.visible");
  });
});