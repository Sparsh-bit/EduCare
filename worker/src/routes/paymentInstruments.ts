import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const piRoles = ['owner', 'co-owner', 'accountant'] as const

// ─── GET /api/payment-instruments ───
router.get('/', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const q = c.req.query()
    const { status, instrument_type, from_date, to_date } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(parseInt(q.limit || '50'), 200)
    const offset = (page - 1) * limit

    // Get school's student ids first for tenant isolation
    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)
    if (studentIds.length === 0) return c.json({ success: true, data: [] })

    let query = supabase.from('fee_payments')
      .select('id, amount_paid, payment_date, instrument_type, instrument_number, bank_name, instrument_status, bounce_penalty, receipt_number, students(name, admission_no)', { count: 'exact' })
      .in('student_id', studentIds)
      .not('instrument_type', 'is', null)
      .order('payment_date', { ascending: false })

    if (status) query = query.eq('instrument_status', status)
    if (instrument_type) query = query.eq('instrument_type', instrument_type)
    if (from_date) query = query.gte('payment_date', from_date)
    if (to_date) query = query.lte('payment_date', to_date)

    const { data, count } = await query.range(offset, offset + limit - 1)
    return c.json({ success: true, data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── PUT /api/payment-instruments/:paymentId/instrument ───
router.put('/:paymentId/instrument', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { paymentId } = c.req.param()
    const { instrument_type, instrument_number, bank_name, instrument_status } = await c.req.json()
    const supabase = getSupabase(c.env)

    // Verify payment belongs to this school via student
    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)

    const { data: payment } = await supabase.from('fee_payments').select('id').eq('id', paymentId).in('student_id', studentIds).single()
    if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)

    await supabase.from('fee_payments').update({
      instrument_type,
      instrument_number,
      bank_name,
      instrument_status: instrument_status || 'pending',
    }).eq('id', paymentId)

    return c.json({ success: true, message: 'Instrument details updated' })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── PUT /api/payment-instruments/:paymentId/clearance ───
router.put('/:paymentId/clearance', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { paymentId } = c.req.param()
    const { status, bounce_penalty, remarks, clearance_date } = await c.req.json()
    const supabase = getSupabase(c.env)

    if (!['cleared', 'bounced', 'returned'].includes(status)) {
      return c.json({ success: false, error: 'Invalid status. Use: cleared, bounced, returned' }, 400)
    }

    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)

    const { data: payment } = await supabase.from('fee_payments').select('*').eq('id', paymentId).in('student_id', studentIds).single()
    if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)
    const p = payment as Record<string, unknown>

    const clearDate = clearance_date || new Date().toISOString()
    const updateData: Record<string, unknown> = { instrument_status: status, clearance_date: clearDate }
    if (status === 'bounced' && bounce_penalty) updateData.bounce_penalty = bounce_penalty

    await supabase.from('fee_payments').update(updateData).eq('id', paymentId)

    // If bounced/returned, create a negative adjustment entry
    if (status === 'bounced' || status === 'returned') {
      await supabase.from('fee_payments').insert({
        student_id: p.student_id,
        installment_id: p.installment_id,
        academic_year_id: p.academic_year_id,
        amount_paid: -(parseFloat(String(p.amount_paid))),
        payment_date: clearDate,
        payment_mode: 'adjustment',
        instrument_type: 'adjustment',
        instrument_status: 'cleared',
        notes: `${status === 'bounced' ? 'Cheque/DD bounced' : 'Instrument returned'} - ref: ${paymentId}${remarks ? '. ' + remarks : ''}`,
      })
    }

    return c.json({ success: true, message: `Instrument marked as ${status}` })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/bounced ───
// Must be defined before /:paymentId routes to avoid param collision
router.get('/bounced', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: students } = await supabase.from('students').select('id, name, admission_no').eq('school_id', schoolId)
    const studentMap = new Map((students || []).map((s: Record<string, unknown>) => [s.id, s]))
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)
    if (studentIds.length === 0) return c.json({ success: true, data: [] })

    const { data } = await supabase.from('fee_payments')
      .select('id, amount_paid, payment_date, instrument_type, instrument_number, bank_name, instrument_status, bounce_penalty, notes, student_id')
      .in('student_id', studentIds)
      .in('instrument_status', ['bounced', 'returned'])
      .order('payment_date', { ascending: false })

    const enriched = (data || []).map((fp: Record<string, unknown>) => {
      const s = studentMap.get(fp.student_id as number) as Record<string, unknown>
      const totalRecoverable = Number(fp.amount_paid || 0) + Number(fp.bounce_penalty || 0)
      return { ...fp, student_name: s?.name, admission_no: s?.admission_no, total_recoverable: totalRecoverable }
    })

    return c.json({ success: true, data: enriched })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/bank-statements/unreconciled ───
router.get('/bank-statements/unreconciled', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data } = await supabase.from('bank_statements')
      .select('*').eq('school_id', schoolId).eq('reconciled', false)
      .order('transaction_date', { ascending: false })

    const total = (data || []).reduce((sum, e: Record<string, unknown>) => sum + Number(e.credit || 0), 0)
    return c.json({ success: true, data: data || [], total_unreconciled: total })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/collection-summary ───
router.get('/collection-summary', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { from_date, to_date } = c.req.query()

    const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)
    if (studentIds.length === 0) return c.json({ success: true, data: { by_instrument: [], bounced: { total_bounced: 0, total_penalty: 0 }, grand_total: 0 } })

    let query = supabase.from('fee_payments').select('instrument_type, amount_paid').in('student_id', studentIds).gt('amount_paid', 0)
    if (from_date) query = query.gte('payment_date', from_date)
    if (to_date) query = query.lte('payment_date', to_date)

    const { data: payments } = await query

    // Group by instrument_type
    const byInstrument: Record<string, { instrument_type: string; total: number; count: number }> = {}
    for (const p of (payments || []) as Record<string, unknown>[]) {
      const it = String(p.instrument_type || 'unknown')
      if (!byInstrument[it]) byInstrument[it] = { instrument_type: it, total: 0, count: 0 }
      byInstrument[it].total += Number(p.amount_paid || 0)
      byInstrument[it].count++
    }

    const { data: bounced } = await supabase.from('fee_payments')
      .select('amount_paid, bounce_penalty').in('student_id', studentIds).in('instrument_status', ['bounced', 'returned'])

    const totalBounced = (bounced || []).reduce((s, b: Record<string, unknown>) => s + Number(b.amount_paid || 0), 0)
    const totalPenalty = (bounced || []).reduce((s, b: Record<string, unknown>) => s + Number(b.bounce_penalty || 0), 0)
    const grandTotal = Object.values(byInstrument).reduce((s, v) => s + v.total, 0)

    return c.json({
      success: true,
      data: {
        by_instrument: Object.values(byInstrument),
        bounced: { total_bounced: totalBounced, total_penalty: totalPenalty },
        grand_total: grandTotal,
      }
    })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/receipt/:paymentId ───
router.get('/receipt/:paymentId', authenticate, authorize('owner', 'co-owner', 'accountant', 'front_desk'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { paymentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: students } = await supabase.from('students').select('id, name, admission_no, father_phone, current_class_id, current_section_id, classes(name), sections(name)').eq('school_id', schoolId)
    const studentMap = new Map((students || []).map((s: Record<string, unknown>) => [s.id, s]))
    const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)

    const { data: payment } = await supabase.from('fee_payments').select('*').eq('id', paymentId).in('student_id', studentIds).single()
    if (!payment) return c.json({ success: false, error: 'Payment not found' }, 404)

    const p = payment as Record<string, unknown>
    const s = studentMap.get(p.student_id as number) as Record<string, unknown>

    const [{ data: taxConfig }, { data: boardConfig }] = await Promise.all([
      supabase.from('tax_config').select('pan_number, gstin').eq('school_id', schoolId).single(),
      supabase.from('board_config').select('board_type').eq('school_id', schoolId).single(),
    ])

    // Generate receipt number if missing — use random to avoid transaction requirement
    let receiptNumber = p.receipt_number as string | null
    if (!receiptNumber) {
      // Get or create sequence
      const { data: seq } = await supabase.from('payment_receipt_sequence').select('*').eq('school_id', schoolId).single()
      let nextSeq = 1
      let prefix = 'RCP'

      if (seq) {
        const seqRow = seq as Record<string, unknown>
        nextSeq = (Number(seqRow.last_receipt_number || 0)) + 1
        prefix = String(seqRow.prefix || 'RCP')
        await supabase.from('payment_receipt_sequence').update({ last_receipt_number: nextSeq }).eq('school_id', schoolId)
      } else {
        await supabase.from('payment_receipt_sequence').insert({ school_id: schoolId, last_receipt_number: 1, prefix: 'RCP' })
      }

      receiptNumber = `${prefix}-${new Date().getFullYear()}-${String(nextSeq).padStart(5, '0')}`
      await supabase.from('fee_payments').update({ receipt_number: receiptNumber }).eq('id', paymentId)
    }

    const cls = s.classes as Record<string, unknown>
    const sec = s.sections as Record<string, unknown>
    const tc = taxConfig as Record<string, unknown>
    const bc = boardConfig as Record<string, unknown>

    return c.json({
      success: true,
      data: {
        receipt_number: receiptNumber,
        payment_date: p.payment_date,
        student_name: s?.name,
        admission_no: s?.admission_no,
        class: `${cls?.name || ''} ${sec?.name || ''}`.trim(),
        father_phone: s?.father_phone,
        amount_paid: p.amount_paid,
        instrument_type: p.instrument_type,
        instrument_number: p.instrument_number,
        bank_name: p.bank_name,
        instrument_status: p.instrument_status,
        school_pan: tc?.pan_number,
        school_gstin: tc?.gstin,
        board_type: bc?.board_type,
      }
    })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/upi-qr/:studentId ───
router.get('/upi-qr/:studentId', authenticate, authorize('owner', 'co-owner', 'accountant', 'front_desk'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id, name').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ success: false, error: 'Student not found' }, 404)

    const { data: qr } = await supabase.from('upi_qr_codes').select('*').eq('school_id', schoolId).eq('student_id', studentId).eq('is_active', true).single()

    const s = student as Record<string, unknown>
    if (qr) return c.json({ success: true, data: qr })
    return c.json({ success: true, data: null, student_name: s.name })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── POST /api/payment-instruments/upi-qr/:studentId ───
router.post('/upi-qr/:studentId', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const { upi_id, school_name } = await c.req.json()

    if (!upi_id || !school_name) return c.json({ success: false, error: 'upi_id and school_name are required' }, 400)
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students').select('id, name').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ success: false, error: 'Student not found' }, 404)
    const s = student as Record<string, unknown>

    // Deactivate old QR codes for this student
    await supabase.from('upi_qr_codes').update({ is_active: false }).eq('school_id', schoolId).eq('student_id', studentId)

    const upiDeeplink = `upi://pay?pa=${encodeURIComponent(upi_id)}&pn=${encodeURIComponent(school_name)}&tn=${encodeURIComponent(String(s.name) + ' Fee')}&cu=INR`

    const { data: qr } = await supabase.from('upi_qr_codes').insert({
      school_id: schoolId,
      student_id: studentId,
      upi_id,
      qr_data: upiDeeplink,
      is_active: true,
    }).select().single()

    return c.json({ success: true, data: qr, upi_deeplink: upiDeeplink })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── GET /api/payment-instruments/bank-statements ───
router.get('/bank-statements', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)
    const { reconciled, from_date, to_date } = c.req.query()

    let query = supabase.from('bank_statements').select('*').eq('school_id', schoolId).order('transaction_date', { ascending: false })
    if (reconciled !== undefined) query = query.eq('reconciled', reconciled === 'true')
    if (from_date) query = query.gte('transaction_date', from_date)
    if (to_date) query = query.lte('transaction_date', to_date)

    const { data } = await query
    return c.json({ success: true, data: data || [] })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── POST /api/payment-instruments/bank-statements ───
router.post('/bank-statements', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { entries } = await c.req.json()

    if (!Array.isArray(entries) || entries.length === 0) return c.json({ success: false, error: 'entries array is required' }, 400)
    if (entries.length > 500) return c.json({ success: false, error: 'Max 500 entries per import' }, 400)

    const supabase = getSupabase(c.env)
    const rows = entries.map((e: Record<string, unknown>) => ({
      school_id: schoolId,
      account_number: e.account_number || null,
      bank_name: e.bank_name || null,
      transaction_date: e.transaction_date,
      description: e.description || null,
      credit: e.credit || 0,
      debit: e.debit || 0,
      balance: e.balance || null,
      reference: e.reference || null,
      reconciled: false,
    }))

    await supabase.from('bank_statements').insert(rows)
    return c.json({ success: true, message: `${rows.length} entries imported` })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

// ─── PUT /api/payment-instruments/bank-statements/:id/reconcile ───
router.put('/bank-statements/:id/reconcile', authenticate, authorize(...piRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ success: false, error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { fee_payment_id } = await c.req.json()
    const supabase = getSupabase(c.env)

    const { data: entry } = await supabase.from('bank_statements').select('id').eq('id', id).eq('school_id', schoolId).single()
    if (!entry) return c.json({ success: false, error: 'Bank statement entry not found' }, 404)

    if (fee_payment_id) {
      const { data: students } = await supabase.from('students').select('id').eq('school_id', schoolId)
      const studentIds = (students || []).map((s: Record<string, unknown>) => s.id as number)
      const { data: payment } = await supabase.from('fee_payments').select('id').eq('id', fee_payment_id).in('student_id', studentIds).single()
      if (!payment) return c.json({ success: false, error: 'Fee payment not found' }, 404)
    }

    await supabase.from('bank_statements').update({ reconciled: true, fee_payment_id: fee_payment_id || null }).eq('id', id)
    return c.json({ success: true, message: 'Entry reconciled' })
  } catch {
    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
})

export default router
