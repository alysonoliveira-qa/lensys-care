# Testing Strategy - Lensys Care

This document defines the operating policy for Cypress E2E and related test data handling in Lensys Care.

## Goals

- Keep read-only coverage available for production verification.
- Prevent mutable E2E flows from running against real production data.
- Make environment expectations explicit before the suite grows.
- Keep destructive seed usage out of production permanently.

## Test categories

### 1. Public smoke

Read-only checks that do not require authentication and do not create, edit, or delete data.

Examples:

- open the landing page;
- verify public navigation;
- verify public plans page copy;
- check that key CTAs are visible.

Allowed targets:

- production;
- staging;
- localhost.

### 2. Authenticated smoke

Read-only checks that require login but still do not mutate data.

Examples:

- open the dashboard after login;
- verify sidebar, top bar, and page sections;
- confirm the current user can load protected areas;
- verify stateful UI like active menu items.

Allowed targets:

- production, only with a controlled demo account or another read-only account that is safe to use;
- staging;
- localhost.

### 3. Mutable smoke

Fluent E2E flows that create, edit, or delete domain data.

Examples:

- create a patient;
- edit a patient;
- create an exam;
- edit an exam;
- delete an exam;
- run any flow that depends on cleanup or seed state.

Allowed targets:

- staging;
- localhost;
- other isolated test environments.

Not allowed:

- production real data;
- any environment where data loss or contamination would be operationally visible.

## Environment rules

- `CYPRESS_BASE_URL` can point to `http://localhost:3000`, a staging URL, or production.
- The URL alone does not decide safety.
- Mutable suites require an isolated or otherwise safe environment, even if the URL is technically reachable.
- Production is only acceptable for public smoke or authenticated smoke that uses a controlled demo account and remains read-only.
- `cypress.env.json` must not be committed.
- Local-only Cypress environment values should stay local to the developer machine.

## Seed policy

- Destructive seed scripts must never run against production.
- Any seed that deletes or recreates clinical data must be treated as unsafe for production by default.
- If a seed is needed for testing, it must target only local or isolated staging environments.

## Command examples

Run Cypress locally:

```bash
CYPRESS_BASE_URL=http://localhost:3000 pnpm cypress open
```

Run Cypress against production for read-only verification only:

```bash
CYPRESS_BASE_URL=https://lensys-care.vercel.app pnpm cypress open
```

## Practical policy

- Production: public smoke, or authenticated smoke with a controlled demo account, only if the flow is read-only.
- Staging/local: mutable flows, seed-dependent flows, cleanup-dependent flows, and any test that creates or removes data.

## Operational checklist

Before adding or expanding an E2E spec, confirm:

- does the spec only read state, or does it mutate data?
- does it depend on cleanup or seed state?
- can it safely run in production?
- is the target environment explicitly isolated if it mutates data?
- are local Cypress environment values kept out of git?

If the answer to any of those questions is uncertain, the spec must be treated as mutable and restricted to staging or local environments.
