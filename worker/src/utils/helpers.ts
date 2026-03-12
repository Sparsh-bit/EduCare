import { SupabaseClient } from '@supabase/supabase-js'

export function generateReceiptNo(): string {
  const date = new Date()
  const prefix = `RCP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 90000) + 10000
  return `${prefix}${rand}`
}

export function generateStudentUid(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function generateAdmissionNo(
  supabase: SupabaseClient,
  year: string,
  prefix: string = 'SCH'
): Promise<string> {
  // Use a sequential count of existing students for the year as fallback
  const clean = prefix.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'SCH'
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${clean}${year}${rand}`
}

export async function generateRollNo(
  supabase: SupabaseClient,
  classNumericOrder: number,
  classId: number,
  academicYearId: number,
  sectionId: number,
  schoolId: number
): Promise<string> {
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('current_class_id', classId)
    .eq('current_section_id', sectionId)
    .eq('academic_year_id', academicYearId)
    .eq('school_id', schoolId)
    .is('deleted_at', null)

  const seq = (count || 0) + 1
  return `${classNumericOrder}/${seq}`
}

export async function generateTCNo(year: string = new Date().getFullYear().toString()): Promise<string> {
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `TC${year}${rand}`
}

export async function generateEmployeeId(supabase: SupabaseClient, schoolId: number): Promise<string> {
  const { count } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
  const seq = (count || 0) + 1
  return `EMP${String(seq).padStart(4, '0')}`
}

export function calculatePercentage(obtained: number, total: number): number {
  if (total === 0) return 0
  return Math.round((obtained / total) * 10000) / 100
}

export function calculateLateFee(dueDate: Date, paymentDate: Date, perDay: number, max: number): number {
  const diffDays = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 0
  return Math.min(diffDays * perDay, max)
}

export function getPaginationParams(query: Record<string, string | undefined>): { limit: number; offset: number; page: number } {
  const page = Math.max(1, parseInt(query.page || '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20') || 20))
  const offset = (page - 1) * limit
  return { limit, offset, page }
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function formatIndianDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
