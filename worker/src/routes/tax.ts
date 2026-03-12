import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize, ownerOnly } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// Income tax slabs FY 2024-25 (Old Regime)
function calcAnnualTDS(grossAnnual: number, deduction80c: number, hraExemption: number): number {
  const standardDeduction = 50000
  const taxableIncome = Math.max(0, grossAnnual - hraExemption - deduction80c - standardDeduction)

  let tax = 0
  if (taxableIncome <= 250000) tax = 0
  else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05
  else if (taxableIncome <= 1000000) tax = 12500 + (taxableIncome - 500000) * 0.20
  else tax = 112500 + (taxableIncome - 1000000) * 0.30

  // 4% education cess
  tax = tax * 1.04
  return Math.round(tax)
}

function calcProfessionalTax(grossSalary: number, slabs: Record<string, unknown>[], month: number): number {
  for (const slab of slabs) {
    const maxVal = slab.max_salary === null ? Infinity : Number(slab.max_salary)
    if (grossSalary >= Number(slab.min_salary) && grossSalary <= maxVal) {
      return month === 2 && slab.feb_tax !== null ? Number(slab.feb_tax) : Number(slab.monthly_tax)
    }
  }
  return 0
}

// ─── TAX CONFIG ───

// GET /api/tax/config
router.get('/config', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('tax_config').select('*').eq('school_id', schoolId).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/tax/config
router.post('/config', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    // Strip any id field from body
    const { id: _id, ...rest } = body
    const data = { ...rest, school_id: schoolId }

    const { data: existing } = await supabase.from('tax_config').select('id').eq('school_id', schoolId).maybeSingle()
    if (existing) {
      await supabase.from('tax_config').update(data).eq('school_id', schoolId)
    } else {
      await supabase.from('tax_config').insert(data)
    }
    return c.json({ message: 'Tax configuration saved' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── PROFESSIONAL TAX SLABS ───

// GET /api/tax/pt-slabs
router.get('/pt-slabs', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('professional_tax_slabs').select('*').eq('school_id', schoolId).order('min_salary')
    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/tax/pt-slabs
router.post('/pt-slabs', authenticate, ownerOnly(), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { state, slabs } = await c.req.json()
    if (!Array.isArray(slabs)) return c.json({ error: 'slabs must be an array' }, 400)
    const supabase = getSupabase(c.env)

    // Delete existing and re-insert
    await supabase.from('professional_tax_slabs').delete().eq('school_id', schoolId)

    const inserts = slabs.map((s: Record<string, unknown>) => ({
      school_id: schoolId,
      state: state || s.state,
      min_salary: s.min_salary,
      max_salary: s.max_salary || null,
      monthly_tax: s.monthly_tax,
      feb_tax: s.feb_tax || null,
    }))
    await supabase.from('professional_tax_slabs').insert(inserts)

    return c.json({ message: `${inserts.length} PT slabs saved` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── SALARY STRUCTURE ───

// GET /api/tax/salary-structure/:staffId
router.get('/salary-structure/:staffId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { staffId } = c.req.param()
    const supabase = getSupabase(c.env)
    const { data } = await supabase.from('salary_structure').select('*').eq('school_id', schoolId).eq('staff_id', staffId).maybeSingle()
    return c.json(data || {})
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/tax/salary-structure
router.post('/salary-structure', authenticate, authorize('owner', 'co-owner', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.staff_id) return c.json({ error: 'staff_id is required' }, 400)
    const supabase = getSupabase(c.env)

    const { data: staffMember } = await supabase.from('staff').select('id').eq('id', body.staff_id).eq('school_id', schoolId).single()
    if (!staffMember) return c.json({ error: 'Staff member not found' }, 404)

    const {
      staff_id, basic, hra, da, ta, medical_allowance, special_allowance, other_allowance,
      pf_applicable, esi_applicable, pt_applicable, tds_applicable,
      declared_investment_80c, declared_hra_exemption
    } = body

    const gross = Number(basic || 0) + Number(hra || 0) + Number(da || 0) + Number(ta || 0)
      + Number(medical_allowance || 0) + Number(special_allowance || 0) + Number(other_allowance || 0)

    const structureData = {
      basic, hra, da, ta, medical_allowance, special_allowance, other_allowance,
      gross_salary: gross,
      pf_applicable: pf_applicable ?? true,
      esi_applicable: esi_applicable ?? true,
      pt_applicable: pt_applicable ?? true,
      tds_applicable: tds_applicable ?? false,
      declared_investment_80c: declared_investment_80c || 0,
      declared_hra_exemption: declared_hra_exemption || 0,
    }

    const { data: existing } = await supabase.from('salary_structure').select('id').eq('school_id', schoolId).eq('staff_id', staff_id).maybeSingle()
    if (existing) {
      await supabase.from('salary_structure').update(structureData).eq('id', (existing as Record<string, unknown>).id)
    } else {
      await supabase.from('salary_structure').insert({ school_id: schoolId, staff_id, ...structureData })
    }

    // Also update staff.salary
    await supabase.from('staff').update({ salary: gross }).eq('id', staff_id).eq('school_id', schoolId)

    return c.json({ message: 'Salary structure saved', gross_salary: gross })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── PAYROLL ───

// GET /api/tax/payroll
router.get('/payroll', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { month, year, status } = c.req.query()

    let query = supabase.from('payroll_records')
      .select('*, staff(name, employee_id, designation)')
      .eq('school_id', schoolId)
      .order('staff_id')

    if (month) query = query.eq('month', month)
    if (year) query = query.eq('year', year)
    if (status) query = query.eq('status', status)

    const { data } = await query
    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/tax/payroll/process
router.post('/payroll/process', authenticate, authorize('owner', 'co-owner', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    const { month, year, working_days, staff_ids } = body

    if (!month || month < 1 || month > 12) return c.json({ error: 'month (1-12) is required' }, 400)
    if (!year || year < 2020) return c.json({ error: 'year (>= 2020) is required' }, 400)
    if (!working_days || working_days < 1) return c.json({ error: 'working_days (>= 1) is required' }, 400)

    const supabase = getSupabase(c.env)

    const [{ data: taxConfig }, { data: ptSlabs }] = await Promise.all([
      supabase.from('tax_config').select('*').eq('school_id', schoolId).maybeSingle(),
      supabase.from('professional_tax_slabs').select('*').eq('school_id', schoolId).order('min_salary'),
    ])

    let staffQuery = supabase.from('staff')
      .select('*, salary_structure!inner(basic, hra, da, ta, medical_allowance, special_allowance, other_allowance, pf_applicable, esi_applicable, pt_applicable, tds_applicable, declared_investment_80c, declared_hra_exemption, school_id)')
      .eq('school_id', schoolId).eq('status', 'active').is('deleted_at', null)
      .eq('salary_structure.school_id', schoolId)

    if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      staffQuery = staffQuery.in('id', staff_ids)
    }

    const { data: staffList } = await staffQuery

    const tc = taxConfig as Record<string, unknown>
    const processed: number[] = []

    for (const s of (staffList || []) as Record<string, unknown>[]) {
      const ss = s.salary_structure as Record<string, unknown>
      const presentDays = working_days
      const lopDays = 0
      const factor = lopDays > 0 ? (working_days - lopDays) / working_days : 1

      const basicEarned = Number(ss.basic || 0) * factor
      const hraEarned = Number(ss.hra || 0) * factor
      const daEarned = Number(ss.da || 0) * factor
      const taEarned = Number(ss.ta || 0) * factor
      const medEarned = Number(ss.medical_allowance || 0) * factor
      const specEarned = Number(ss.special_allowance || 0) * factor
      const otherEarned = Number(ss.other_allowance || 0) * factor
      const grossEarned = basicEarned + hraEarned + daEarned + taEarned + medEarned + specEarned + otherEarned

      // PF
      const pfWageCeiling = Number(tc?.pf_wage_ceiling || 15000)
      const pfBase = Math.min(basicEarned, pfWageCeiling)
      const pfEmployee = ss.pf_applicable && tc?.pf_applicable ? pfBase * (Number(tc?.pf_employee_rate || 12) / 100) : 0
      const pfEmployer = ss.pf_applicable && tc?.pf_applicable ? pfBase * (Number(tc?.pf_employer_rate || 12) / 100) : 0

      // ESI
      const esiWageCeiling = Number(tc?.esi_wage_ceiling || 21000)
      const esiEmployee = ss.esi_applicable && tc?.esi_applicable && grossEarned <= esiWageCeiling
        ? grossEarned * (Number(tc?.esi_employee_rate || 0.75) / 100) : 0
      const esiEmployer = ss.esi_applicable && tc?.esi_applicable && grossEarned <= esiWageCeiling
        ? grossEarned * (Number(tc?.esi_employer_rate || 3.25) / 100) : 0

      // PT
      const pt = ss.pt_applicable ? calcProfessionalTax(grossEarned, (ptSlabs || []) as Record<string, unknown>[], month) : 0

      // TDS
      const annualGross = grossEarned * 12
      const annualTDS = ss.tds_applicable
        ? calcAnnualTDS(annualGross, Number(ss.declared_investment_80c || 0), Number(ss.declared_hra_exemption || 0))
        : 0
      const monthlyTDS = Math.round(annualTDS / 12)

      const totalDeductions = pfEmployee + esiEmployee + pt + monthlyTDS
      const netSalary = grossEarned - totalDeductions

      const r2 = (n: number) => Math.round(n * 100) / 100

      await supabase.from('payroll_records').upsert({
        school_id: schoolId, staff_id: s.id, month, year,
        working_days, present_days: presentDays, lop_days: lopDays,
        basic_earned: r2(basicEarned), hra_earned: r2(hraEarned), da_earned: r2(daEarned),
        ta_earned: r2(taEarned), medical_earned: r2(medEarned), special_earned: r2(specEarned),
        other_earned: r2(otherEarned), gross_earned: r2(grossEarned),
        pf_employee: r2(pfEmployee), pf_employer: r2(pfEmployer),
        esi_employee: r2(esiEmployee), esi_employer: r2(esiEmployer),
        professional_tax: pt, tds: monthlyTDS, other_deductions: 0,
        total_deductions: r2(totalDeductions), net_salary: r2(netSalary),
        status: 'draft', processed_by: user.id,
      }, { onConflict: 'school_id,staff_id,month,year' })

      processed.push(s.id as number)
    }

    return c.json({ message: `Payroll processed for ${processed.length} employees`, count: processed.length })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/tax/payroll/:id
router.put('/payroll/:id', authenticate, authorize('owner', 'co-owner', 'hr_manager'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: record } = await supabase.from('payroll_records').select('*').eq('id', id).eq('school_id', schoolId).single()
    if (!record) return c.json({ error: 'Payroll record not found' }, 404)

    const r = record as Record<string, unknown>
    const { status, payment_date, payment_mode, transaction_ref, other_deductions } = body
    const updateData: Record<string, unknown> = { status, payment_date, payment_mode, transaction_ref }

    if (other_deductions !== undefined) {
      const totalDed = Number(r.pf_employee) + Number(r.esi_employee) + Number(r.professional_tax) + Number(r.tds) + Number(other_deductions)
      updateData.other_deductions = other_deductions
      updateData.total_deductions = totalDed
      updateData.net_salary = Number(r.gross_earned) - totalDed
    }

    await supabase.from('payroll_records').update(updateData).eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Payroll record updated' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/tax/payroll/:id/slip
router.get('/payroll/:id/slip', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: slip } = await supabase.from('payroll_records')
      .select('*, staff(name, employee_id, designation, department, bank_name, bank_account_number, bank_ifsc)')
      .eq('id', id).eq('school_id', schoolId).single()

    if (!slip) return c.json({ error: 'Payslip not found' }, 404)

    const [{ data: taxConfig }, { data: school }] = await Promise.all([
      supabase.from('tax_config').select('pan_number, epf_establishment_id').eq('school_id', schoolId).maybeSingle(),
      supabase.from('schools').select('name').eq('id', schoolId).single(),
    ])

    const tc = taxConfig as Record<string, unknown>
    const sc = school as Record<string, unknown>
    return c.json({
      slip,
      school: { name: sc?.name, pan: tc?.pan_number, epf_id: tc?.epf_establishment_id },
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── FORM 16 ───

// GET /api/tax/form16/list/:financialYear
router.get('/form16/list/:financialYear', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { financialYear } = c.req.param()
    const supabase = getSupabase(c.env)

    // Normalize "2025-26" → 2025
    const fyParam = String(financialYear)
    const fyYear = Number(fyParam.includes('-') ? fyParam.split('-')[0] : fyParam)

    const { data } = await supabase.from('tds_certificates')
      .select('*, staff(name, employee_id, designation)')
      .eq('school_id', schoolId).eq('financial_year_start', fyYear)
      .order('staff_id')

    return c.json({ data: data || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/tax/form16/:staffId/:financialYear
router.get('/form16/:staffId/:financialYear', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { staffId, financialYear } = c.req.param()
    const supabase = getSupabase(c.env)

    const fyParam = String(financialYear)
    const fyYear = Number(fyParam.includes('-') ? fyParam.split('-')[0] : fyParam)

    const { data: cert } = await supabase.from('tds_certificates')
      .select('*, staff(name, employee_id, designation)')
      .eq('school_id', schoolId).eq('staff_id', staffId).eq('financial_year_start', fyYear).single()

    if (!cert) return c.json({ error: 'Form 16 not generated yet' }, 404)
    return c.json(cert)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/tax/form16/generate/:financialYear
router.post('/form16/generate/:financialYear', authenticate, authorize('owner', 'co-owner'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { financialYear } = c.req.param()
    const supabase = getSupabase(c.env)

    const fyParam = String(financialYear)
    const fyRaw = fyParam.includes('-') ? fyParam.split('-')[0] : fyParam
    const fyStart = Number(fyRaw)

    // Fetch paid payroll for Apr(fyStart) to Mar(fyStart+1)
    const { data: payrollRecords } = await supabase.from('payroll_records')
      .select('staff_id, gross_earned, tds, month, year')
      .eq('school_id', schoolId).eq('status', 'paid')
      .or(
        `and(year.eq.${fyStart},month.gte.4),and(year.eq.${fyStart + 1},month.lte.3)`
      )

    // Fetch salary structures for declared investments
    const { data: salaryStructures } = await supabase.from('salary_structure')
      .select('staff_id, declared_investment_80c, declared_hra_exemption')
      .eq('school_id', schoolId)

    const ssMap = new Map((salaryStructures || []).map((ss: Record<string, unknown>) => [ss.staff_id, ss]))

    // Aggregate by staff
    const staffAgg: Record<number, { annual_gross: number; total_tds: number }> = {}
    for (const pr of (payrollRecords || []) as Record<string, unknown>[]) {
      const sid = pr.staff_id as number
      if (!staffAgg[sid]) staffAgg[sid] = { annual_gross: 0, total_tds: 0 }
      staffAgg[sid].annual_gross += Number(pr.gross_earned || 0)
      staffAgg[sid].total_tds += Number(pr.tds || 0)
    }

    const generated: number[] = []
    const today = new Date().toISOString().split('T')[0]

    for (const [staffIdStr, agg] of Object.entries(staffAgg)) {
      const sid = Number(staffIdStr)
      const ss = ssMap.get(sid) as Record<string, unknown> | undefined
      const exemHRA = Number(ss?.declared_hra_exemption || 0)
      const ded80c = Number(ss?.declared_investment_80c || 0)
      const taxable = Math.max(0, agg.annual_gross - exemHRA - ded80c - 50000)
      const eduCess = Math.round(agg.total_tds * 0.04 * 100) / 100

      await supabase.from('tds_certificates').upsert({
        school_id: schoolId,
        staff_id: sid,
        financial_year_start: fyStart,
        gross_salary: Math.round(agg.annual_gross * 100) / 100,
        exemptions_hra: exemHRA,
        deductions_80c: ded80c,
        standard_deduction: 50000,
        taxable_income: Math.round(taxable * 100) / 100,
        total_tds: agg.total_tds,
        education_cess: eduCess,
        status: 'issued',
        issue_date: today,
      }, { onConflict: 'school_id,staff_id,financial_year_start' })

      generated.push(sid)
    }

    return c.json({ message: `Form 16 generated for ${generated.length} employees`, count: generated.length })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ─── GST REPORT ───

// GET /api/tax/gst-report
router.get('/gst-report', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { month, year } = c.req.query()

    const { data: taxConfig } = await supabase.from('tax_config').select('*').eq('school_id', schoolId).maybeSingle()
    const tc = taxConfig as Record<string, unknown>

    if (!tc?.gst_applicable) {
      return c.json({ gst_applicable: false, message: 'GST is not configured for this school' })
    }

    // Get fee payments via students join
    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)

    let query = supabase.from('fee_payments').select('amount_paid').eq('status', 'paid').in('student_id', studentIds)

    if (month && year) {
      const m = String(month).padStart(2, '0')
      const startDate = `${year}-${m}-01`
      const endDate = `${year}-${m}-31`
      query = query.gte('payment_date', startDate).lte('payment_date', endDate)
    }

    const { data: payments } = await query

    const totalCollection = (payments || []).reduce((sum, p: Record<string, unknown>) => sum + Number(p.amount_paid || 0), 0)
    const gstRate = Number(tc.gst_rate || 18)
    const taxableAmount = totalCollection / (1 + gstRate / 100)
    const gstCollected = totalCollection - taxableAmount
    const cgst = gstCollected / 2
    const sgst = gstCollected / 2

    return c.json({
      gst_applicable: true,
      gst_rate: gstRate,
      gstin: tc.gstin,
      total_fee_collection: Math.round(totalCollection * 100) / 100,
      taxable_amount: Math.round(taxableAmount * 100) / 100,
      gst_collected: Math.round(gstCollected * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      payment_count: (payments || []).length,
      period: month && year ? `${month}/${year}` : 'All time',
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
