import { prisma } from '@/lib/db'

export function getPatientDetailPageData(patientId: string, userId: string) {
  return prisma.patient.findFirst({
    where: {
      id: patientId,
      clinic: {
        profiles: {
          some: { id: userId },
        },
      },
    },
    select: {
      id: true,
      full_name: true,
      dob: true,
      phone: true,
      email: true,
      notes: true,
      exams: {
        select: {
          id: true,
          exam_date: true,
          od_sph: true,
          od_cyl: true,
          od_axis: true,
          od_va: true,
          oe_sph: true,
          oe_cyl: true,
          oe_axis: true,
          oe_va: true,
          addition: true,
          pd: true,
          prescription_notes: true,
          examiner: {
            select: {
              full_name: true,
              crm: true,
            },
          },
        },
        orderBy: { exam_date: 'desc' },
      },
      alerts: {
        select: {
          id: true,
          status: true,
          channel: true,
          due_date: true,
          sent_at: true,
        },
        orderBy: { due_date: 'desc' },
      },
    },
  })
}
