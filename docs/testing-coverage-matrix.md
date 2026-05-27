# Testing Coverage Matrix - Lensys Care

This matrix tracks current test coverage, remaining risk, and the next tests to prioritize in Lensys Care.

The goal is to keep three classes of coverage visible at the same time:

- read-only smoke coverage;
- mutable business-flow coverage;
- security and ownership coverage.

## Legend

- `Coberto`: test already exists and covers the intended risk.
- `Parcial`: some coverage exists, but the risky case or full flow is not covered yet.
- `Faltante`: no meaningful coverage was identified.
- `Nao recomendado em producao`: the flow mutates data or depends on destructive setup.
- `Requer ambiente isolado`: should run only in localhost, staging, or demo/isolated environments.

## Main Matrix

| Dominio | Fluxo / Risco | Cobertura atual | Tipo de teste recomendado | Ambiente recomendado | Prioridade | Observacoes |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | Landing, login, logout, redirect after auth | Coberto | Cypress smoke read-only / authenticated smoke | Production read-only ok, staging, local | Alta | `cypress/e2e/public/landing.cy.ts` and `cypress/e2e/auth/login.cy.ts` exist. |
| Dashboard | Load dashboard, summary cards, async sections, plan status | Parcial | Cypress authenticated smoke + unit tests for mappers | Production read-only ok, staging, local | Alta | Page composition is better separated, but no explicit smoke for every section. |
| Patients | Create patient, edit patient, detail page, history/recalls | Parcial | Cypress mutable flow + unit tests for mappers/normalizers | Requer ambiente isolado | Alta | Create patient exists; edit/detail coverage is still incomplete as a suite. |
| Exams | Create, edit, print exam; previous-exam ref; payload mapping | Parcial | Cypress mutable flow + unit tests for mappers/normalizers | Requer ambiente isolado | Critica | Main clinical flow exists, but ownership negative coverage is still missing. |
| Alerts | List, status badge, dismiss/resend, ownership gates | Faltante | Cypress mutable/security flow + API negative tests | Requer ambiente isolado | Critica | Highest tenancy risk because actions may use privileged access. |
| Plans | Public plans, internal plan activation, current plan badge | Coberto | Cypress read-only + mutable demo smoke | Production read-only ok; mutable only in isolated env | Alta | Public plans and internal management specs already exist. |
| Profile / Sidebar | Preferred name edit, sidebar navigation, collapse, modal behavior | Parcial | Cypress authenticated smoke + mutable profile smoke | Requer ambiente isolado for mutation | Media | Preferred name smoke exists; sidebar navigation is exercised by other flows. |
| Billing / Stripe | Checkout, portal, webhook, plan entitlement / free validation mode | Faltante | Unit tests + integration-safe smoke only | Requer ambiente isolado | Critica | Do not test real Stripe destructively in the main environment. |
| Multi-tenant / Ownership | Cross-clinic access, patient/exam/alert ownership, service_role checks | Faltante | Negative API tests + Cypress negative ownership tests | Requer ambiente isolado | Critica | This is the main security gap to close before expanding mutable coverage. |
| Mobile navigation | Drawer open/close, overlay, mobile navigation, mobile dashboard usability | Faltante | Cypress responsive smoke | Requer ambiente isolado | Media | Needs a mobile-specific smoke before more UI refactors. |

## Existing Coverage

### Read-only and authenticated smoke

- landing and public navigation are covered by `cypress/e2e/public/landing.cy.ts`;
- login and logout are covered by `cypress/e2e/auth/login.cy.ts`;
- public plans page is covered by `cypress/e2e/plans/public-plans.cy.ts`.

### Mutable clinical flows

- patient creation is covered by `cypress/e2e/patients/create-patient.cy.ts`;
- the clinical create/edit/print exam flow is covered by `cypress/e2e/clinical/create-edit-print-exam.cy.ts`;
- internal plan management is covered by `cypress/e2e/plans/internal-plan-management.cy.ts`;
- preferred-name profile edit smoke is covered by `cypress/e2e/profile/edit-preferred-name.cy.ts`.

### Unit tests already present

- exam form mappers and normalizers are covered by `apps/web/__tests__/exam-form-mapper.test.ts` and `apps/web/__tests__/exam-form-normalizers.test.ts`;
- patient form mappers and normalizers are covered by `apps/web/__tests__/patient-form-mapper.test.ts` and `apps/web/__tests__/patient-form-normalizers.test.ts`;
- patient detail mappers are covered by `apps/web/__tests__/patient-detail-mappers.test.ts`;
- dashboard mappers are covered by `apps/web/__tests__/dashboard-mappers.test.ts`;
- plan feature config is covered by `apps/web/__tests__/plan-feature-config.test.ts`;
- refraction logic is covered by `apps/web/__tests__/refraction.test.ts`.

## Critical Gaps

- a user from one clinic must not create an exam for a patient from another clinic;
- a user from one clinic must not dismiss or resend an alert from another clinic;
- alerts that use `service_role` need explicit negative ownership coverage;
- destructive seed must never run in production;
- mutable Cypress suites must never run against real production data;
- billing and Stripe must not be tested destructively in the main environment.

## Alerts Coverage

| Alert flow | Current status | Recommended test type | Environment | Notes |
| --- | --- | --- | --- | --- |
| List alerts | Partial | Cypress authenticated smoke | Staging, local, read-only production if safe | Status filters and table rendering need stable coverage. |
| Show badge/status | Partial | Cypress + unit tests for status config | Staging, local | `ALERT_STATUS_CONFIG` helps, but UI rendering should still be exercised. |
| Dismiss own clinic alert | Faltante | Cypress mutable + API integration check | Requer ambiente isolado | Must confirm the action succeeds only for the same clinic. |
| Block dismiss of external alert | Faltante | Negative API test + Cypress negative flow | Requer ambiente isolado | High-risk ownership boundary. |
| Resend own clinic alert | Faltante | Cypress mutable + API integration check | Requer ambiente isolado | Must verify no data leak and successful resend path. |
| Block resend of external alert | Faltante | Negative API test + Cypress negative flow | Requer ambiente isolado | Must fail safely and visibly. |
| Resend does not proceed on ownership failure | Faltante | Negative API test | Requer ambiente isolado | Required to avoid accidental communication to another tenant. |

## Ownership Coverage

| Ownership area | Current status | Missing test |
| --- | --- | --- |
| Patient ownership | Partial | Negative cross-clinic create/update access |
| Exam ownership | Partial | Negative cross-clinic create/edit access |
| Alert ownership | Faltante | Negative dismiss/resend cross-clinic access |
| Plan / subscription ownership | Partial | Ensure only the clinic owner can change plan, and other roles cannot |
| Profile ownership | Partial | Ensure profile edits stay scoped to the authenticated user and clinic |

## Mobile Coverage

| Mobile flow | Current status | Recommended test type | Environment | Notes |
| --- | --- | --- | --- | --- |
| Menu opens | Faltante | Cypress responsive smoke | Requer ambiente isolado | Drawer behavior needs explicit coverage. |
| Menu closes on outside click | Faltante | Cypress responsive smoke | Requer ambiente isolado | Important for usability and overlay correctness. |
| Mobile navigation works | Faltante | Cypress responsive smoke | Requer ambiente isolado | Links must still resolve correctly on small screens. |
| Drawer does not occupy half the screen | Faltante | Cypress visual/responsive smoke | Requer ambiente isolado | Prevents layout regressions on narrow viewports. |
| Patient detail opens on mobile | Faltante | Cypress responsive smoke | Requer ambiente isolado | Needed before more mobile UI refactors. |
| Create exam on mobile | Faltante | Cypress responsive smoke | Requer ambiente isolado | Critical clinical flow. |
| Open print/prescription on mobile | Faltante | Cypress responsive smoke | Requer ambiente isolado | Print view should remain accessible. |

## Environment Policy

- Production: only read-only smoke or a controlled demo account that does not mutate data.
- Staging/demo: mutable flows are allowed.
- Local: mutable flows are allowed.
- Real customer production: never run mutable suites.

## Next Tests Recommended

1. ownership negative test for exam creation.
2. ownership negative tests for alert dismiss/resend actions.
3. internal plan management smoke for the QA demo account.
4. preferred-name profile edit smoke with restore-at-end cleanup.
5. mobile drawer smoke for responsive navigation.

## Do Not Do Now

- Do not create a full CI matrix yet unless an isolated staging environment exists.
- Do not run mutable Cypress suites against real production.
- Do not destructively test Stripe in production.
- Do not use destructive seed in production.

## Summary

The current suite is strongest in read-only smoke, core clinical happy-path flows, and mapper/normalizer unit tests.

The highest-risk gaps are ownership negative coverage and alert action safety. Those should be closed before expanding mutable flows further.
