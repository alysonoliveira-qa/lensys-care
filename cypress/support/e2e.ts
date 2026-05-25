/// <reference types="cypress" />

Cypress.Commands.add(
  "getByCy",
  (selector: string, options?: Partial<Cypress.Timeoutable & Cypress.Loggable & Cypress.Withinable & Cypress.Shadow>) => {
    return cy.get(`[data-cy="${selector}"]`, options);
  }
);