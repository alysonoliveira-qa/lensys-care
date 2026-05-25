declare global {
  namespace Cypress {
    interface Chainable {
      getByCy(selector: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};