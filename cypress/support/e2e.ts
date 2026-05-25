/// <reference types="cypress" />

Cypress.Commands.add("getByCy", (selector: string) => {
  return cy.get(`[data-cy="${selector}"]`);
});