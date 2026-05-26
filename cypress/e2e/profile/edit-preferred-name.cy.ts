describe("Profile preferred name", () => {
  const timeout = 30000;
  const restoreName = "QA Tester";

  const loginAsDemoUser = () => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    expect(email, "E2E_USER_EMAIL").to.be.a("string").and.not.be.empty;
    expect(password, "E2E_USER_PASSWORD").to.be.a("string").and.not.be.empty;

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
    cy.get('[data-cy="sidebar-profile-button"]', { timeout }).should("be.visible");
  };

  const openProfileModal = () => {
    cy.get('[data-cy="sidebar-profile-button"]', { timeout })
      .should("be.visible")
      .click();

    cy.get('[data-cy="edit-profile-modal"]', { timeout }).should("be.visible");
  };

  const savePreferredName = (preferredName: string) => {
    openProfileModal();

    cy.get('[data-cy="preferred-name-input"]', { timeout })
      .should("be.visible")
      .clear()
      .type(preferredName);

    cy.get('[data-cy="save-profile-button"]', { timeout })
      .should("be.visible")
      .click();

    cy.get('[data-cy="edit-profile-modal"]', { timeout })
      .should("contain.text", "Perfil atualizado com sucesso.");

    cy.get('[data-cy="edit-profile-modal"]', { timeout }).should("not.exist");
  };

  const assertPreferredNameInSidebar = (expectedName: string) => {
    cy.get('[data-cy="sidebar-profile-button"]', { timeout }).should(($button) => {
      const text = $button.text().replace(/\s+/g, " ").trim();
      const title = $button.attr("title") ?? "";
      expect(`${text} ${title}`).to.include(expectedName);
    });
  };

  afterEach(() => {
    const email = Cypress.env("E2E_USER_EMAIL");
    const password = Cypress.env("E2E_USER_PASSWORD");

    if (!email || !password) {
      return;
    }

    loginAsDemoUser();
    savePreferredName(restoreName);
    assertPreferredNameInSidebar(restoreName);
  });

  it("should edit and persist the preferred name from the sidebar", () => {
    const uniquePreferredName = `QA Cypress ${Date.now()}`;

    loginAsDemoUser();
    assertPreferredNameInSidebar(restoreName);

    savePreferredName(uniquePreferredName);
    assertPreferredNameInSidebar(uniquePreferredName);

    cy.reload();

    cy.get('[data-cy="sidebar-profile-button"]', { timeout }).should("be.visible");
    assertPreferredNameInSidebar(uniquePreferredName);
  });
});
