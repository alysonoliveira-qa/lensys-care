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

    cy.visit("/login");

    cy.getByCy("login-email-input").type(email);
    cy.getByCy("login-password-input").type(password, { log: false });
    cy.getByCy("login-submit-button").click();

    cy.location("pathname", { timeout: 15000 }).should("eq", "/dashboard");

    cy.getByCy("sidebar-patients-link").click();
    cy.location("pathname", { timeout: 15000 }).should("eq", "/patients");

    cy.get('[data-cy="new-patient-button"]', { timeout: 15000 })
        .should("be.visible")
        .click();

    cy.getByCy("patient-name-input").type(patientName);
    cy.getByCy("patient-birthdate-input").type("1990-01-15");

    cy.getByCy("patient-phone-input").then(($input) => {
      if ($input.length) {
        cy.wrap($input).type(patientPhone);
      }
    });

    cy.getByCy("patient-email-input").then(($input) => {
      if ($input.length) {
        cy.wrap($input).type(patientEmail);
      }
    });

    cy.getByCy("save-patient-button").click();

cy.location("pathname", { timeout: 15000 }).should("match", /\/patients\/.+/);

cy.contains(patientName, { timeout: 15000 }).should("be.visible");
cy.contains(/Iniciar primeiro exame|Lançar novo exame/i).should("be.visible");
  });
});