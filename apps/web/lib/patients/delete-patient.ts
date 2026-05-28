import { prisma } from '@/lib/db'

const PATIENT_HAS_EXAMS_MESSAGE =
  'Este paciente possui exames registrados e não pode ser excluído. Para preservar o histórico clínico, a exclusão foi bloqueada.'

export interface DeletePatientForClinicInput {
  patientId: string
  clinicId: string
}

export type DeletePatientForClinicResult =
  | {
      ok: true
    }
  | {
      ok: false
      error: 'PATIENT_NOT_FOUND' | 'PATIENT_HAS_EXAMS'
      message: string
      status: 404 | 409
    }

export async function deletePatientForClinic({
  patientId,
  clinicId,
}: DeletePatientForClinicInput): Promise<DeletePatientForClinicResult> {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      clinic_id: clinicId,
    },
    select: {
      id: true,
      _count: {
        select: {
          exams: true,
        },
      },
    },
  })

  if (!patient) {
    return {
      ok: false,
      error: 'PATIENT_NOT_FOUND',
      message: 'Paciente não encontrado ou sem permissão para excluir.',
      status: 404,
    }
  }

  if (patient._count.exams > 0) {
    return {
      ok: false,
      error: 'PATIENT_HAS_EXAMS',
      message: PATIENT_HAS_EXAMS_MESSAGE,
      status: 409,
    }
  }

  const deletedPatient = await prisma.patient.deleteMany({
    where: {
      id: patientId,
      clinic_id: clinicId,
      exams: {
        none: {},
      },
    },
  })

  if (deletedPatient.count === 0) {
    return {
      ok: false,
      error: 'PATIENT_HAS_EXAMS',
      message: PATIENT_HAS_EXAMS_MESSAGE,
      status: 409,
    }
  }

  return { ok: true }
}

export { PATIENT_HAS_EXAMS_MESSAGE }
