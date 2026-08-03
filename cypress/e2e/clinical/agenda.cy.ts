/// <reference types="cypress" />

function login() {
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
}

/** Cria um paciente pelo cadastro e devolve o nome usado. */
function createPatient(name: string) {
  cy.visit("/patients/new", { timeout: 60000 });

  cy.get('[data-cy="patient-name-input"]', { timeout: 30000 })
    .should("be.visible")
    .clear()
    .type(name);

  cy.get('[data-cy="patient-birthdate-input"]').clear().type("1990-01-15");
  cy.get('[data-cy="save-patient-button"]').click();

  cy.url({ timeout: 30000 }).should("match", /\/patients\/.+/);
}

function openAgenda() {
  cy.get('[data-cy="sidebar-agenda-link"]', { timeout: 30000 })
    .should("be.visible")
    .click();

  cy.url({ timeout: 30000 }).should("include", "/agenda");
}

function scheduleAppointment(patientName: string, time?: string) {
  cy.get('[data-cy="new-appointment-button"]', { timeout: 30000 }).click();
  cy.get('[data-cy="new-appointment-dialog"]', { timeout: 30000 }).should("be.visible");

  cy.get('[data-cy="appointment-patient-search"]').clear().type(patientName);
  cy.get('[data-cy="appointment-patient-option"]', { timeout: 30000 })
    .first()
    .click();

  cy.get('[data-cy="appointment-selected-patient"]').should("contain", patientName);

  if (time) {
    cy.get('[data-cy="appointment-time-input"]').clear().type(time);
  }

  cy.get('[data-cy="appointment-submit"]').click();
  cy.get('[data-cy="new-appointment-dialog"]', { timeout: 30000 }).should("not.exist");
}

describe("Agenda de consultas", () => {
  const uniqueId = Date.now();

  it("schedules with and without a time, ordering times before the queue", () => {
    const withTime = `Consulta Hora ${uniqueId}`;
    const withoutTime = `Consulta Fila ${uniqueId}`;

    login();
    createPatient(withTime);
    createPatient(withoutTime);

    openAgenda();

    // Sem hora primeiro, para provar que a ordenação não é por marcação.
    scheduleAppointment(withoutTime);
    scheduleAppointment(withTime, "14:30");

    cy.get('[data-cy="agenda-list"]', { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(withTime)
      .closest('[data-cy="agenda-appointment-row"]')
      .find('[data-cy="appointment-slot"]')
      .should("have.text", "14:30");

    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(withoutTime)
      .closest('[data-cy="agenda-appointment-row"]')
      .find('[data-cy="appointment-slot"]')
      .should("contain", "#1");

    // Com horário aparece antes da fila.
    cy.get('[data-cy="agenda-appointment-row"]').first().should("contain", withTime);
  });

  it("marks attendance and cancels", () => {
    const patientName = `Consulta Status ${uniqueId}`;

    login();
    createPatient(patientName);
    openAgenda();
    scheduleAppointment(patientName, "09:00");

    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(patientName)
      .closest('[data-cy="agenda-appointment-row"]')
      .within(() => {
        cy.get('[data-cy="appointment-mark-attended"]').click();
      });

    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(patientName)
      .closest('[data-cy="agenda-appointment-row"]')
      .should("have.attr", "data-appointment-status", "ATTENDED");
  });

  it("navigates between days", () => {
    login();
    openAgenda();

    cy.get('[data-cy="agenda-day-label"]').invoke("text").as("todayLabel");

    cy.get('[data-cy="agenda-next-day"]').click();
    cy.url().should("include", "date=");

    cy.get("@todayLabel").then((todayLabel) => {
      cy.get('[data-cy="agenda-day-label"]').should("not.have.text", String(todayLabel));
    });

    cy.get('[data-cy="agenda-today"]').click();

    cy.get("@todayLabel").then((todayLabel) => {
      cy.get('[data-cy="agenda-day-label"]').should("have.text", String(todayLabel));
    });
  });

  it("schedules the first appointment during patient registration", () => {
    const patientName = `Consulta Cadastro ${uniqueId}`;

    login();
    cy.visit("/patients/new", { timeout: 60000 });

    cy.get('[data-cy="patient-name-input"]', { timeout: 30000 }).clear().type(patientName);
    cy.get('[data-cy="patient-birthdate-input"]').clear().type("1988-03-10");

    cy.get('[data-cy="schedule-first-appointment-checkbox"]').check();
    cy.get('[data-cy="first-appointment-time-input"]').clear().type("10:15");

    cy.get('[data-cy="save-patient-button"]').click();
    cy.url({ timeout: 30000 }).should("match", /\/patients\/.+/);

    openAgenda();

    cy.get('[data-cy="agenda-list"]', { timeout: 30000 }).should("contain", patientName);
  });

  it("registers a referrer, links it to an appointment and pays the pending referrals", () => {
    const referrerName = `Indicante ${uniqueId}`;
    const patientName = `Consulta Indicada ${uniqueId}`;

    login();

    // Cadastra o indicante na aba Indicantes.
    cy.visit("/patients?tab=indicantes", { timeout: 60000 });
    cy.get('[data-cy="referrers-tab"]', { timeout: 30000 }).should("be.visible");

    cy.get('[data-cy="referrer-name-input"]').clear().type(referrerName);
    cy.get('[data-cy="referrer-pix-input"]').clear().type("indicante@pix.com");
    cy.get('[data-cy="referrer-submit"]').click();

    cy.get('[data-cy="referrers-list"]', { timeout: 30000 }).should("contain", referrerName);

    createPatient(patientName);
    openAgenda();

    // Agenda vinculando o indicante.
    cy.get('[data-cy="new-appointment-button"]').click();
    cy.get('[data-cy="appointment-patient-search"]').clear().type(patientName);
    cy.get('[data-cy="appointment-patient-option"]', { timeout: 30000 }).first().click();
    cy.get('[data-cy="appointment-time-input"]').clear().type("16:45");
    cy.get('[data-cy="appointment-referrer-select"]').select(referrerName);
    cy.get('[data-cy="appointment-submit"]').click();

    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(patientName)
      .closest('[data-cy="agenda-appointment-row"]')
      .find('[data-cy="appointment-referrer-tag"]')
      .should("contain", referrerName);

    // Compareceu → a indicação vira pendente.
    cy.get('[data-cy="agenda-appointment-row"]')
      .contains(patientName)
      .closest('[data-cy="agenda-appointment-row"]')
      .within(() => {
        cy.get('[data-cy="appointment-mark-attended"]').click();
      });

    cy.visit("/patients?tab=indicantes", { timeout: 60000 });

    cy.get('[data-cy="referrer-row"]')
      .contains(referrerName)
      .closest('[data-cy="referrer-row"]')
      .within(() => {
        cy.get('[data-cy="referrer-pending-count"]').should("contain", "1 indicação pendente");
        cy.get('[data-cy="referrer-pay-button"]').click();
        cy.get('[data-cy="referrer-pix-key"]').should("contain", "indicante@pix.com");
        cy.get('[data-cy="referrer-mark-paid"]').click();
      });

    cy.get('[data-cy="referrer-row"]')
      .contains(referrerName)
      .closest('[data-cy="referrer-row"]')
      .find('[data-cy="referrer-pending-count"]')
      .should("contain", "Nenhuma indicação pendente");
  });
});
