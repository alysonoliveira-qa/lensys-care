declare global {
  namespace Cypress {
    interface Chainable {
      getByCy(
        selector: string,
        options?: Partial<Cypress.Timeoutable & Cypress.Loggable & Cypress.Withinable & Cypress.Shadow>
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};