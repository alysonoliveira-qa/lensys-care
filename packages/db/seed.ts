/**
 * Database seed: creates a demo clinic on the CONECTA plan with 5 patients
 * across all presbyopia age groups, each with one exam.
 *
 * Run: pnpm db:seed
 */

import { PrismaClient, Plan, SubscriptionStatus, AlertStatus, AlertChannel } from '@prisma/client'

const prisma = new PrismaClient()

// Presbyopia addition lookup — mirrors lib/refraction.ts
function getSuggestedAddition(dob: Date): number {
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)

  if (age < 40) return 0.0
  if (age < 45) return 0.75
  if (age < 50) return 1.25
  if (age < 55) return 1.75
  if (age < 60) return 2.25
  return 2.75
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

function yearsAgo(years: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d
}

async function main() {
  console.log('🌱 Starting seed...')

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await prisma.alert.deleteMany()
  await prisma.exam.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.stripeCustomer.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.clinic.deleteMany()

  // ── Clinic ────────────────────────────────────────────────────────────────
  const clinic = await prisma.clinic.create({
    data: {
      name: 'Óptica Visão Clara',
      slug: 'visao-clara',
      cnpj: '12.345.678/0001-99',
      phone: '(11) 98765-4321',
      email: 'contato@visaoclara.com.br',
    },
  })
  console.log(`✅ Clinic: ${clinic.name} (${clinic.id})`)

  // ── Subscription (CONECTA — so all features are testable) ─────────────────
  await prisma.subscription.create({
    data: {
      clinic_id: clinic.id,
      plan: Plan.CONECTA,
      status: SubscriptionStatus.ACTIVE,
      payment_provider: 'stripe',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Subscription: CONECTA / ACTIVE')

  // ── Profile (owner — will be linked to a real Supabase auth user at login) ─
  // Using a deterministic UUID so re-seeding is idempotent with a real auth user
  const OWNER_AUTH_ID = '00000000-0000-0000-0000-000000000001'
  const profile = await prisma.profile.create({
    data: {
      id: OWNER_AUTH_ID,
      clinic_id: clinic.id,
      full_name: 'Dra. Ana Lima',
      role: 'OWNER',
      crm: 'CRO-SP 12345',
    },
  })
  console.log(`✅ Profile: ${profile.full_name}`)

  // ── Patients — one per age group ─────────────────────────────────────────
  const patients = [
    {
      full_name: 'Lucas Ferreira',
      dob: yearsAgo(16),   // Infantil/Adolescente → addition 0.00
      phone: '(11) 91111-1111',
      email: 'lucas@email.com',
    },
    {
      full_name: 'Beatriz Santos',
      dob: yearsAgo(30),   // Adulto Jovem → addition 0.00
      phone: '(11) 92222-2222',
      email: 'beatriz@email.com',
    },
    {
      full_name: 'Roberto Alves',
      dob: yearsAgo(42),   // Presbiopia Inicial → addition +0.75
      phone: '(11) 93333-3333',
      email: 'roberto@email.com',
    },
    {
      full_name: 'Marcia Oliveira',
      dob: yearsAgo(52),   // Presbiopia Moderada → addition +1.75
      phone: '(11) 94444-4444',
      email: 'marcia@email.com',
    },
    {
      full_name: 'José Carvalho',
      dob: yearsAgo(65),   // Idoso → addition +2.75
      phone: '(11) 95555-5555',
      email: 'jose@email.com',
    },
  ]

  for (const patientData of patients) {
    const patient = await prisma.patient.create({
      data: {
        clinic_id: clinic.id,
        ...patientData,
      },
    })

    const addition = getSuggestedAddition(patientData.dob)
    // Exam performed 13 months ago (older than 1 year) for the last patient
    // so the alert shows up as overdue for demo purposes
    const isLastPatient = patientData.full_name === 'José Carvalho'
    const examDate = daysAgo(isLastPatient ? 400 : 30)

    const exam = await prisma.exam.create({
      data: {
        patient_id: patient.id,
        performed_by: profile.id,
        exam_date: examDate,
        od_sph: -1.5,
        od_cyl: -0.5,
        od_axis: 180,
        od_va: '20/20',
        oe_sph: -2.0,
        oe_cyl: -0.75,
        oe_axis: 175,
        oe_va: '20/25',
        addition: addition > 0 ? addition : null,
        pd: 63.5,
      },
    })

    // Create alert (due_date = exam_date + 365 days)
    const dueDate = new Date(examDate)
    dueDate.setDate(dueDate.getDate() + 365)

    await prisma.alert.create({
      data: {
        patient_id: patient.id,
        exam_id: exam.id,
        due_date: dueDate,
        status: AlertStatus.PENDING,
        channel: AlertChannel.EMAIL,
      },
    })

    console.log(
      `✅ Patient: ${patient.full_name} | age: ${new Date().getFullYear() - patientData.dob.getFullYear()} | addition: +${addition.toFixed(2)}`
    )
  }

  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
