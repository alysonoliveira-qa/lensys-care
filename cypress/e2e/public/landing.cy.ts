describe("Public navigation", () => {
  it("should open the landing page", () => {
    cy.visit("/");

    cy.contains("Lensys Care").should("be.visible");
    cy.contains("Sistema de gestão para optometria clínica").should("be.visible");
  });
});