import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { createAuditLog, getClientIp } from '../utils/auditLog'
import { generateReceiptNo, calculateLateFee, getPaginationParams } from '../utils/helpers'
import { sendFeeDueReminder } from '../utils/sms'
import { hmacSha256 } from '../utils/helpers'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

// POST /api/fees/structure
router.post('/structure', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const { class_id, total_amount, installments_count, installment_dates, description } = await c.req.json()

    if (!class_id || total_amount == null || !installments_count || !Array.isArray(installment_dates)) {
      return c.json({ error: 'class_id, total_amount, installments_count, installment_dates are required' }, 400)
    }
    if (installment_dates.length !== Number(installments_count)) {
      return c.json({ error: `installment_dates must contain exactly ${installments_count} entries` }, 400)
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (!installment_dates.every((d: unknown) => typeof d === 'string' && datePattern.test(d))) {
      return c.json({ error: 'All installment_dates must be in YYYY-MM-DD format' }, 400)
    }
    const dateSet = new Set(installment_dates)
    if (dateSet.size !== installment_dates.length) {
      return c.json({ error: 'Installment dates must be unique' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)
    const { data: schoolClass } = await supabase.from('classes').select('id').eq('id', class_id).eq('school_id', schoolId).single()
    if (!schoolClass) return c.json({ error: 'Invalid class for your school' }, 400)

    const { data: structure, error: structErr } = await supabase.from('fee_structures').insert({
      class_id,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      total_amount,
      installments_count,
      description,
    }).select().single()

    if (structErr) {
      if (structErr.code === '23505') return c.json({ error: 'Fee structure already exists for this class/year' }, 409)
      return c.json({ error: 'Failed to create fee structure' }, 500)
    }

    const installmentAmount = Math.round((total_amount / installments_count) * 100) / 100
    const createdInstallments = installment_dates.map((date: string, i: number) => ({
      fee_structure_id: (structure as Record<string, unknown>).id,
      installment_no: i + 1,
      amount: i === installments_count - 1
        ? total_amount - (installmentAmount * (installments_count - 1))
        : installmentAmount,
      due_date: date,
    }))

    await supabase.from('fee_installments').insert(createdInstallments)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'create', entity_type: 'fee_structure',
      entity_id: (structure as Record<string, unknown>).id as number,
      new_value: { class_id, total_amount }, ip_address: getClientIp(c), description: 'Fee structure created',
    })

    return c.json({ ...(structure as Record<string, unknown>), installments: createdInstallments }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/structure/:classId
router.get('/structure/:classId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { classId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: schoolClass } = await supabase.from('classes').select('id').eq('id', classId).eq('school_id', schoolId).single()
    if (!schoolClass) return c.json({ error: 'Class not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const { data: structure } = await supabase.from('fee_structures')
      .select('*').eq('class_id', classId).eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).is('deleted_at', null).single()
    if (!structure) return c.json({ error: 'Fee structure not found' }, 404)

    const { data: installments } = await supabase.from('fee_installments')
      .select('*').eq('fee_structure_id', (structure as Record<string, unknown>).id as number).order('installment_no')

    return c.json({ ...(structure as Record<string, unknown>), installments: installments || [] })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/fees/pay/cash
router.post('/pay/cash', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const { student_id, installment_id, amount_paid, notes } = await c.req.json()
    if (!student_id || !installment_id || amount_paid == null) {
      return c.json({ error: 'student_id, installment_id, amount_paid are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: student } = await supabase.from('students').select('id, current_class_id').eq('id', student_id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    // Validate installment belongs to student's class
    const { data: installmentRow } = await supabase.from('fee_installments')
      .select('*, fee_structures(class_id, classes(school_id))')
      .eq('id', installment_id).single()
    if (!installmentRow) return c.json({ error: 'Installment not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    // Check duplicate (maybeSingle — 0 rows means not yet paid, which is valid)
    const { data: existingPayment } = await supabase.from('fee_payments').select('id').eq('student_id', student_id).eq('installment_id', installment_id).maybeSingle()
    if (existingPayment) return c.json({ error: 'Payment already recorded for this installment' }, 409)

    const lateFee = calculateLateFee(
      new Date((installmentRow as Record<string, unknown>).due_date as string),
      new Date(),
      parseInt(c.env.LATE_FEE_PER_DAY || '50'),
      parseInt(c.env.LATE_FEE_MAX || '2000')
    )

    const receiptNo = generateReceiptNo()
    const { data: payment, error: payErr } = await supabase.from('fee_payments').insert({
      student_id,
      installment_id,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      amount_paid,
      late_fee: lateFee,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'cash',
      receipt_no: receiptNo,
      notes,
    }).select().single()

    if (payErr) return c.json({ error: 'Failed to record payment' }, 500)

    await createAuditLog(supabase, {
      user_id: user.id, action: 'fee_payment', entity_type: 'fee_payment',
      entity_id: (payment as Record<string, unknown>).id as number,
      new_value: { student_id, amount_paid, late_fee: lateFee, mode: 'cash', receipt_no: receiptNo },
      ip_address: getClientIp(c), description: 'Cash fee payment recorded',
    })

    return c.json(payment, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/fees/pay/initiate — Initiate Razorpay payment
router.post('/pay/initiate', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    if (!c.env.RAZORPAY_KEY_ID || !c.env.RAZORPAY_KEY_SECRET) {
      return c.json({ error: 'Online payments are not configured' }, 503)
    }

    const { student_id, installment_id } = await c.req.json()
    if (!student_id || !installment_id) return c.json({ error: 'student_id and installment_id are required' }, 400)

    const supabase = getSupabase(c.env)
    const { data: student } = await supabase.from('students').select('id, name, current_class_id').eq('id', student_id).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: installmentRow } = await supabase.from('fee_installments').select('*').eq('id', installment_id).single()
    if (!installmentRow) return c.json({ error: 'Installment not found' }, 404)

    const lateFee = calculateLateFee(
      new Date((installmentRow as Record<string, unknown>).due_date as string),
      new Date(),
      parseInt(c.env.LATE_FEE_PER_DAY || '50'),
      parseInt(c.env.LATE_FEE_MAX || '2000')
    )

    const totalAmount = parseFloat((installmentRow as Record<string, unknown>).amount as string) + lateFee

    // Create Razorpay order via HTTP API
    const credentials = btoa(`${c.env.RAZORPAY_KEY_ID}:${c.env.RAZORPAY_KEY_SECRET}`)
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: generateReceiptNo(),
        notes: {
          student_id: String(student_id),
          installment_id: String(installment_id),
          student_name: (student as Record<string, unknown>).name,
        },
      }),
    })

    if (!rzpRes.ok) return c.json({ error: 'Failed to create payment order' }, 500)
    const order = await rzpRes.json() as Record<string, unknown>

    return c.json({
      order_id: order.id,
      amount: totalAmount,
      currency: 'INR',
      key: c.env.RAZORPAY_KEY_ID,
      student_name: (student as Record<string, unknown>).name,
      late_fee: lateFee,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/fees/pay/verify — Verify Razorpay payment
router.post('/pay/verify', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, student_id, installment_id } = await c.req.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !student_id || !installment_id) {
      return c.json({ error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature, student_id, installment_id are required' }, 400)
    }

    // Verify signature using Web Crypto HMAC
    const generated = await hmacSha256(c.env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`)
    if (generated !== razorpay_signature) {
      return c.json({ error: 'Payment verification failed' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: student } = await supabase.from('students').select('id, current_class_id').eq('id', student_id).eq('school_id', schoolId).is('deleted_at', null).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: installmentRow } = await supabase.from('fee_installments').select('*').eq('id', installment_id).single()
    if (!installmentRow) return c.json({ error: 'Installment not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    // Duplicate check (maybeSingle — 0 rows means not yet paid, which is valid)
    const { data: existingPayment } = await supabase.from('fee_payments').select('id').eq('student_id', student_id).eq('installment_id', installment_id).maybeSingle()
    if (existingPayment) return c.json({ error: 'Payment already recorded for this installment' }, 409)

    const lateFee = calculateLateFee(
      new Date((installmentRow as Record<string, unknown>).due_date as string),
      new Date(),
      parseInt(c.env.LATE_FEE_PER_DAY || '50'),
      parseInt(c.env.LATE_FEE_MAX || '2000')
    )

    const receiptNo = generateReceiptNo()
    const { data: payment } = await supabase.from('fee_payments').insert({
      student_id,
      installment_id,
      academic_year_id: (academicYear as Record<string, unknown>).id,
      amount_paid: parseFloat((installmentRow as Record<string, unknown>).amount as string) + lateFee,
      late_fee: lateFee,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'online',
      razorpay_payment_id,
      razorpay_order_id,
      receipt_no: receiptNo,
    }).select().single()

    await createAuditLog(supabase, {
      user_id: user.id, action: 'fee_payment', entity_type: 'fee_payment',
      entity_id: (payment as Record<string, unknown>).id as number,
      new_value: { student_id, mode: 'online', razorpay_id: razorpay_payment_id },
      ip_address: getClientIp(c), description: 'Online fee payment verified',
    })

    return c.json({ message: 'Payment verified', payment })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/student/:studentId
router.get('/student/:studentId', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'parent'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { studentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: student } = await supabase.from('students')
      .select('id, name, current_class_id, classes(name)').eq('id', studentId).eq('school_id', schoolId).single()
    if (!student) return c.json({ error: 'Student not found' }, 404)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const { data: feeStructure } = await supabase.from('fee_structures')
      .select('*').eq('class_id', (student as Record<string, unknown>).current_class_id as number)
      .eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).is('deleted_at', null).single()

    if (!feeStructure) return c.json({ student_name: (student as Record<string, unknown>).name, message: 'No fee structure found' })

    const { data: installments } = await supabase.from('fee_installments')
      .select('*').eq('fee_structure_id', (feeStructure as Record<string, unknown>).id as number).order('installment_no')

    const { data: payments } = await supabase.from('fee_payments')
      .select('*').eq('student_id', (student as Record<string, unknown>).id as number).eq('academic_year_id', (academicYear as Record<string, unknown>).id as number)

    const paymentMap = new Map((payments || []).map((p: Record<string, unknown>) => [p.installment_id, p]))
    const lateFeePerDay = parseInt(c.env.LATE_FEE_PER_DAY || '50')
    const lateFeeMax = parseInt(c.env.LATE_FEE_MAX || '2000')

    const installmentStatus = (installments || []).map((inst: Record<string, unknown>) => {
      const payment = paymentMap.get(inst.id)
      const isOverdue = !payment && new Date(inst.due_date as string) < new Date()
      return {
        ...inst,
        paid: !!payment,
        payment: payment || null,
        is_overdue: isOverdue,
        late_fee_estimate: isOverdue ? calculateLateFee(new Date(inst.due_date as string), new Date(), lateFeePerDay, lateFeeMax) : 0,
      }
    })

    const totalPaid = (payments || []).reduce((sum: number, p: Record<string, unknown>) => sum + parseFloat(p.amount_paid as string), 0)
    const totalDue = parseFloat((feeStructure as Record<string, unknown>).total_amount as string) - totalPaid

    return c.json({
      student_id: (student as Record<string, unknown>).id,
      student_name: (student as Record<string, unknown>).name,
      class_name: ((student as Record<string, unknown>).classes as Record<string, unknown>)?.name,
      total_fee: parseFloat((feeStructure as Record<string, unknown>).total_amount as string),
      total_paid: totalPaid,
      total_due: totalDue > 0 ? totalDue : 0,
      installments: installmentStatus,
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/receipt/:paymentId
router.get('/receipt/:paymentId', authenticate, async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { paymentId } = c.req.param()
    const supabase = getSupabase(c.env)

    const { data: payment } = await supabase.from('fee_payments')
      .select('*, students(name, admission_no, father_name, school_id, classes(name)), fee_installments(*, fee_structures(class_id))')
      .eq('id', paymentId).single()
    if (!payment) return c.json({ error: 'Payment not found' }, 404)

    const studentData = (payment as Record<string, unknown>).students as Record<string, unknown>
    if (Number(studentData?.school_id) !== schoolId) return c.json({ error: 'Payment not found' }, 404)

    return c.json(payment)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/dues
router.get('/dues', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'hr_manager', 'front_desk'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const q = c.req.query()
    const { limit, offset, page } = getPaginationParams(q)

    // Get all active students with fee structures
    const { data: students, count } = await supabase.from('students')
      .select('id, name, admission_no, father_phone, current_class_id, classes(name)', { count: 'exact' })
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)

    const result = []
    for (const student of (students || []) as Record<string, unknown>[]) {
      const { data: feeStructure } = await supabase.from('fee_structures')
        .select('total_amount').eq('class_id', student.current_class_id as number).eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).is('deleted_at', null).maybeSingle()
      if (!feeStructure) continue

      const { data: payments } = await supabase.from('fee_payments').select('amount_paid').eq('student_id', student.id as number).eq('academic_year_id', (academicYear as Record<string, unknown>).id as number)
      const totalPaid = (payments || []).reduce((s: number, p: Record<string, unknown>) => s + parseFloat(p.amount_paid as string), 0)
      const dueAmount = parseFloat((feeStructure as Record<string, unknown>).total_amount as string) - totalPaid
      if (dueAmount > 0) {
        result.push({
          id: student.id, name: student.name, admission_no: student.admission_no,
          father_phone: student.father_phone, class_name: (student.classes as Record<string, unknown>)?.name,
          total_amount: (feeStructure as Record<string, unknown>).total_amount,
          total_paid: totalPaid, due_amount: dueAmount,
        })
      }
    }

    return c.json({ data: result, pagination: { page, limit, total: count || 0 } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/collection-summary
router.get('/collection-summary', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin', 'accountant', 'hr_manager', 'front_desk'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id, year').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)
    const ayId = (academicYear as Record<string, unknown>).id as number

    const { count: totalStudents } = await supabase.from('students')
      .select('id', { count: 'exact', head: true }).eq('status', 'active').eq('academic_year_id', ayId).eq('school_id', schoolId).is('deleted_at', null)

    const today = new Date().toISOString().split('T')[0]

    // Fetch payments for this school's students
    const { data: allPayments } = await supabase.from('fee_payments')
      .select('amount_paid, payment_mode, payment_date, students!inner(school_id)').eq('academic_year_id', ayId).eq('students.school_id', schoolId)

    const payments = (allPayments || []) as Record<string, unknown>[]
    const totalCollected = payments.reduce((s, p) => s + parseFloat(p.amount_paid as string), 0)
    const todayCollected = payments.filter(p => p.payment_date === today).reduce((s, p) => s + parseFloat(p.amount_paid as string), 0)
    const onlineCollected = payments.filter(p => p.payment_mode === 'online').reduce((s, p) => s + parseFloat(p.amount_paid as string), 0)
    const cashCollected = payments.filter(p => p.payment_mode === 'cash').reduce((s, p) => s + parseFloat(p.amount_paid as string), 0)

    const { data: recentPayments } = await supabase.from('fee_payments')
      .select('*, students(name, school_id)').eq('academic_year_id', ayId).order('created_at', { ascending: false }).limit(5)

    return c.json({
      academic_year: (academicYear as Record<string, unknown>).year,
      total_students: totalStudents || 0,
      total_collected: totalCollected,
      today_collected: todayCollected,
      online_collected: onlineCollected,
      cash_collected: cashCollected,
      total_expected: 0, // Complex join — omitted; frontend can calculate
      pending_amount: 0,
      recent_payments: recentPayments || [],
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/fees/send-reminder
router.post('/send-reminder', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json().catch(() => ({}))
    const { student_ids } = body

    if (student_ids && (!Array.isArray(student_ids) || student_ids.length > 500)) {
      return c.json({ error: 'student_ids must be an array with max 500 entries' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)
    const ayId = (academicYear as Record<string, unknown>).id as number

    let studentsQuery = supabase.from('students').select('id, name, father_phone, current_class_id')
      .eq('status', 'active').eq('school_id', schoolId).is('deleted_at', null)
    if (student_ids?.length) studentsQuery = studentsQuery.in('id', student_ids)
    const { data: students } = await studentsQuery

    let sentCount = 0
    for (const student of (students || []) as Record<string, unknown>[]) {
      const { data: feeStructure } = await supabase.from('fee_structures')
        .select('id, total_amount').eq('class_id', student.current_class_id as number).eq('academic_year_id', ayId).is('deleted_at', null).single()
      if (!feeStructure) continue

      const { data: payments } = await supabase.from('fee_payments').select('amount_paid, installment_id').eq('student_id', student.id as number).eq('academic_year_id', ayId)
      const totalPaid = (payments || []).reduce((s: number, p: Record<string, unknown>) => s + parseFloat(p.amount_paid as string), 0)
      const due = parseFloat((feeStructure as Record<string, unknown>).total_amount as string) - totalPaid

      if (due > 0 && student.father_phone) {
        const paidInstallmentIds = (payments || []).map((p: Record<string, unknown>) => p.installment_id)
        const { data: nextInstallment } = await supabase.from('fee_installments')
          .select('due_date').eq('fee_structure_id', (feeStructure as Record<string, unknown>).id as number)
          .not('id', 'in', `(${paidInstallmentIds.join(',') || '0'})`)
          .order('installment_no').limit(1).single()

        if (nextInstallment) {
          sendFeeDueReminder(c.env, student.name as string, student.father_phone as string, due, (nextInstallment as Record<string, unknown>).due_date as string).catch(() => {})
          sentCount++
        }
      }
    }

    return c.json({ message: `Fee reminders sent to ${sentCount} parents` })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/fees/settings
router.get('/settings', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const { data: settings } = await supabase.from('fee_settings')
      .select('*').eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).eq('school_id', schoolId).single()

    if (!settings) {
      return c.json({ late_fine_enabled: false, fine_type: 'fixed', fine_amount: 0, grace_period_days: 7, receipt_prefix: 'REC/', rounding: 'none', allow_partial_payment: true })
    }
    return c.json(settings)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/fees/settings
router.post('/settings', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    if (body.late_fine_enabled === undefined || body.fine_amount == null) {
      return c.json({ error: 'late_fine_enabled and fine_amount are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: academicYear } = await supabase.from('academic_years').select('id').eq('is_current', true).eq('school_id', schoolId).single()
    if (!academicYear) return c.json({ error: 'No active academic year' }, 400)

    const { data: existing } = await supabase.from('fee_settings')
      .select('id').eq('academic_year_id', (academicYear as Record<string, unknown>).id as number).eq('school_id', schoolId).maybeSingle()

    const data = { ...body, school_id: schoolId, academic_year_id: (academicYear as Record<string, unknown>).id }

    if (existing) {
      await supabase.from('fee_settings').update(data).eq('id', (existing as Record<string, unknown>).id as number)
    } else {
      await supabase.from('fee_settings').insert(data)
    }

    await createAuditLog(supabase, {
      user_id: user.id, action: 'update_fee_settings', entity_type: 'fee_settings',
      entity_id: (existing as Record<string, unknown>)?.id as number || 0,
      new_value: data, ip_address: getClientIp(c), description: 'Fee settings updated',
    })

    return c.json({ message: 'Settings updated successfully' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
