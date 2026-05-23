'use client'

import { useState, useEffect } from 'react'
import { getAgeGroupInfo, calculateAge, type AgeGroup } from '../lib/refraction'

export function useAgeGroup(dobString: string | undefined | null) {
  const [age, setAge] = useState<number | null>(null)
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [suggestedAddition, setSuggestedAddition] = useState<number>(0)

  useEffect(() => {
    if (!dobString) {
      setAge(null)
      setAgeGroup(null)
      setSuggestedAddition(0)
      return
    }

    // Attempt to handle date parse safely
    const dob = new Date(dobString)
    if (isNaN(dob.getTime())) {
      setAge(null)
      setAgeGroup(null)
      setSuggestedAddition(0)
      return
    }

    const computedAge = calculateAge(dob)
    const info = getAgeGroupInfo(dob)

    setAge(computedAge)
    setAgeGroup(info.label)
    setSuggestedAddition(info.suggestedAddition)
  }, [dobString])

  return { age, ageGroup, suggestedAddition }
}
