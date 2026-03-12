import { Hono } from 'hono'
import { Env, Variables } from '../types'
import { authenticate, authorize } from '../middleware/auth'
import { getSupabase } from '../utils/supabase'
import { getPaginationParams } from '../utils/helpers'

const router = new Hono<{ Bindings: Env; Variables: Variables }>()

const acctRoles = ['tenant_admin', 'owner', 'co-owner', 'admin', 'accountant']

// GET /api/accounts/income
router.get('/income', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const q = c.req.query()
    const { category, payment_mode, from_date, to_date } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '25')))
    const offset = (page - 1) * limit

    const supabase = getSupabase(c.env)
    let query = supabase.from('income_entries').select('*', { count: 'exact' }).eq('school_id', schoolId)
    if (category) query = query.eq('category', category)
    if (payment_mode) query = query.eq('payment_mode', payment_mode)
    if (from_date) query = query.gte('date', from_date)
    if (to_date) query = query.lte('date', to_date)

    const { data, count } = await query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    // Sum total
    let sumQuery = supabase.from('income_entries').select('amount').eq('school_id', schoolId)
    if (category) sumQuery = sumQuery.eq('category', category)
    if (from_date) sumQuery = sumQuery.gte('date', from_date)
    if (to_date) sumQuery = sumQuery.lte('date', to_date)
    const { data: allAmounts } = await sumQuery
    const totalAmount = (allAmounts || []).reduce((s: number, r: Record<string, unknown>) => s + parseFloat(r.amount as string || '0'), 0)

    return c.json({ data: data || [], summary: { total_amount: totalAmount }, pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/accounts/income
router.post('/income', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    if (!body.date || !body.category || body.amount == null || !body.payment_mode) {
      return c.json({ error: 'date, category, amount, payment_mode are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: entry } = await supabase.from('income_entries').insert({ ...body, created_by: user.id, school_id: schoolId }).select().single()

    await supabase.from('notices').insert({
      title: 'Accounts: New Income Recorded',
      content: `${user.name} recorded an income of ₹${(entry as Record<string, unknown>).amount} (Category: ${(entry as Record<string, unknown>).category}).`,
      target_audience: 'staff', created_by: user.id, school_id: schoolId,
    })

    return c.json({ message: 'Income recorded', data: entry }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/accounts/income/:id
router.put('/income/:id', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)
    const { data: updated } = await supabase.from('income_entries').update(body).eq('id', id).eq('school_id', schoolId).select().single()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json({ message: 'Income updated', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/accounts/income/:id
router.delete('/income/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)
    await supabase.from('income_entries').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Income entry deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/accounts/expenses
router.get('/expenses', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const q = c.req.query()
    const { category, payment_mode, from_date, to_date } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '25')))
    const offset = (page - 1) * limit

    const supabase = getSupabase(c.env)
    let query = supabase.from('expense_entries').select('*', { count: 'exact' }).eq('school_id', schoolId)
    if (category) query = query.eq('category', category)
    if (payment_mode) query = query.eq('payment_mode', payment_mode)
    if (from_date) query = query.gte('date', from_date)
    if (to_date) query = query.lte('date', to_date)

    const { data, count } = await query.order('date', { ascending: false }).range(offset, offset + limit - 1)

    let sumQuery = supabase.from('expense_entries').select('amount').eq('school_id', schoolId)
    if (category) sumQuery = sumQuery.eq('category', category)
    if (from_date) sumQuery = sumQuery.gte('date', from_date)
    if (to_date) sumQuery = sumQuery.lte('date', to_date)
    const { data: allAmounts } = await sumQuery
    const totalAmount = (allAmounts || []).reduce((s: number, r: Record<string, unknown>) => s + parseFloat(r.amount as string || '0'), 0)

    return c.json({ data: data || [], summary: { total_amount: totalAmount }, pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/accounts/expenses
router.post('/expenses', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    if (!body.date || !body.category || body.amount == null || !body.paid_to || !body.payment_mode) {
      return c.json({ error: 'date, category, amount, paid_to, payment_mode are required' }, 400)
    }

    const supabase = getSupabase(c.env)
    const { data: entry } = await supabase.from('expense_entries').insert({ ...body, created_by: user.id, school_id: schoolId }).select().single()

    await supabase.from('notices').insert({
      title: 'Accounts: New Expense Recorded',
      content: `${user.name} recorded an expense of ₹${(entry as Record<string, unknown>).amount} paid to ${(entry as Record<string, unknown>).paid_to} (Category: ${(entry as Record<string, unknown>).category}).`,
      target_audience: 'staff', created_by: user.id, school_id: schoolId,
    })

    return c.json({ message: 'Expense recorded', data: entry }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/accounts/expenses/:id
router.put('/expenses/:id', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const body = await c.req.json()
    const supabase = getSupabase(c.env)
    const { data: updated } = await supabase.from('expense_entries').update(body).eq('id', id).eq('school_id', schoolId).select().single()
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json({ message: 'Expense updated', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// DELETE /api/accounts/expenses/:id
router.delete('/expenses/:id', authenticate, authorize('tenant_admin', 'owner', 'co-owner', 'admin'), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const supabase = getSupabase(c.env)
    await supabase.from('expense_entries').delete().eq('id', id).eq('school_id', schoolId)
    return c.json({ message: 'Expense deleted' })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/accounts/vendors
router.get('/vendors', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const { data: vendors } = await supabase.from('vendors').select('*').eq('school_id', schoolId).order('name')

    // Compute aggregates from vendor_bills
    const { data: bills } = await supabase.from('vendor_bills').select('vendor_id, total_amount, amount_paid, balance_due').eq('school_id', schoolId)

    const vendorsWithAggs = (vendors || []).map((v: Record<string, unknown>) => {
      const vBills = (bills || []).filter((b: Record<string, unknown>) => b.vendor_id === v.id)
      return {
        ...v,
        total_billed: vBills.reduce((s: number, b: Record<string, unknown>) => s + parseFloat(b.total_amount as string || '0'), 0),
        total_paid: vBills.reduce((s: number, b: Record<string, unknown>) => s + parseFloat(b.amount_paid as string || '0'), 0),
        total_outstanding: vBills.reduce((s: number, b: Record<string, unknown>) => s + parseFloat(b.balance_due as string || '0'), 0),
      }
    })

    return c.json(vendorsWithAggs)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/accounts/vendors
router.post('/vendors', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const body = await c.req.json()
    if (!body.name) return c.json({ error: 'name is required' }, 400)
    const supabase = getSupabase(c.env)
    const { data: vendor } = await supabase.from('vendors').insert({ ...body, school_id: schoolId }).select().single()
    return c.json({ message: 'Vendor added', data: vendor }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/accounts/vendor-bills
router.get('/vendor-bills', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const q = c.req.query()
    const { status, vendor_id } = q
    const page = Math.max(1, parseInt(q.page || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(q.limit || '25')))
    const offset = (page - 1) * limit

    const supabase = getSupabase(c.env)
    let query = supabase.from('vendor_bills').select('*, vendors(name)', { count: 'exact' }).eq('school_id', schoolId)
    if (status) query = query.eq('status', status)
    if (vendor_id) query = query.eq('vendor_id', vendor_id)

    const { data, count } = await query.order('bill_date', { ascending: false }).range(offset, offset + limit - 1)
    return c.json({ data: data || [], pagination: { total: count || 0, page, limit } })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/accounts/vendor-bills
router.post('/vendor-bills', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)

    const body = await c.req.json()
    const { vendor_id, bill_number, bill_date, due_date, total_amount, items, ...rest } = body
    if (!vendor_id || !bill_number || !bill_date || !due_date || total_amount == null) {
      return c.json({ error: 'vendor_id, bill_number, bill_date, due_date, total_amount are required' }, 400)
    }

    const supabase = getSupabase(c.env)

    // Validate vendor belongs to school
    const { data: vendor } = await supabase.from('vendors').select('id, name').eq('id', vendor_id).eq('school_id', schoolId).single()
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404)

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.description || item.quantity == null || item.unit_price == null) {
          return c.json({ error: 'Each vendor bill item must have description, quantity, and unit_price' }, 400)
        }
        if (Number(item.quantity) <= 0 || Number(item.unit_price) < 0) {
          return c.json({ error: 'Item quantity must be positive and unit_price must be non-negative' }, 400)
        }
      }
    }

    const amountPaid = parseFloat(rest.amount_paid || '0')
    const balanceDue = parseFloat(total_amount) - amountPaid
    const billStatus = balanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'

    const { data: bill } = await supabase.from('vendor_bills').insert({
      vendor_id, bill_number, bill_date, due_date, total_amount,
      ...rest, balance_due: balanceDue, status: billStatus,
      created_by: user.id, school_id: schoolId,
    }).select().single()

    if (bill && items?.length) {
      await supabase.from('vendor_bill_items').insert(items.map((item: Record<string, unknown>) => ({
        ...item, vendor_bill_id: (bill as Record<string, unknown>).id, school_id: schoolId,
      })))
    }

    await supabase.from('notices').insert({
      title: 'Accounts: New Vendor Bill Created',
      content: `${user.name} created a vendor bill for ${(vendor as Record<string, unknown>).name} amounting to ₹${total_amount}.`,
      target_audience: 'staff', created_by: user.id, school_id: schoolId,
    })

    return c.json({ message: 'Vendor bill created', data: bill }, 201)
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// PUT /api/accounts/vendor-bills/:id/pay
router.put('/vendor-bills/:id/pay', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const { id } = c.req.param()
    const { amount } = await c.req.json()
    if (amount == null) return c.json({ error: 'amount is required' }, 400)

    const supabase = getSupabase(c.env)
    const { data: bill } = await supabase.from('vendor_bills').select('*').eq('id', id).eq('school_id', schoolId).single()
    if (!bill) return c.json({ error: 'Bill not found' }, 404)

    const newPaid = parseFloat((bill as Record<string, unknown>).amount_paid as string) + parseFloat(amount)
    const newBalance = parseFloat((bill as Record<string, unknown>).total_amount as string) - newPaid
    const newStatus = newBalance <= 0 ? 'paid' : 'partial'

    const { data: updated } = await supabase.from('vendor_bills').update({ amount_paid: newPaid, balance_due: Math.max(0, newBalance), status: newStatus }).eq('id', id).select().single()
    return c.json({ message: 'Payment recorded', data: updated })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/accounts/dashboard
router.get('/dashboard', authenticate, authorize(...acctRoles), async (c) => {
  try {
    const user = c.get('user')
    const schoolId = user.school_id
    if (!schoolId) return c.json({ error: 'User is not mapped to a school' }, 403)
    const supabase = getSupabase(c.env)

    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date().toISOString().substring(0, 7)

    const [incomeAll, expenseAll, incomeToday, expenseToday, incomeMonth, expenseMonth, vendorBills, feePayments] = await Promise.all([
      supabase.from('income_entries').select('amount').eq('school_id', schoolId),
      supabase.from('expense_entries').select('amount').eq('school_id', schoolId),
      supabase.from('income_entries').select('amount').eq('school_id', schoolId).eq('date', today),
      supabase.from('expense_entries').select('amount').eq('school_id', schoolId).eq('date', today),
      supabase.from('income_entries').select('amount').eq('school_id', schoolId).gte('date', `${thisMonth}-01`).lt('date', `${thisMonth}-32`),
      supabase.from('expense_entries').select('amount').eq('school_id', schoolId).gte('date', `${thisMonth}-01`).lt('date', `${thisMonth}-32`),
      supabase.from('vendor_bills').select('balance_due, status').eq('school_id', schoolId),
      supabase.from('fee_payments').select('amount_paid, students!inner(school_id)').eq('students.school_id', schoolId),
    ])

    const sum = (arr: Record<string, unknown>[] | null, field: string) =>
      (arr || []).reduce((s, r) => s + parseFloat(r[field] as string || '0'), 0)

    const totalIncome = sum(incomeAll.data, 'amount')
    const totalExpense = sum(expenseAll.data, 'amount')

    const vendorOutstanding = (vendorBills.data || [])
      .filter((b: Record<string, unknown>) => b.status !== 'paid')
      .reduce((s: number, b: Record<string, unknown>) => s + parseFloat(b.balance_due as string || '0'), 0)

    // Category breakdown
    const incomeByCat: Record<string, number> = {}
    for (const r of (incomeAll.data || []) as Record<string, unknown>[]) {
      const cat = String(r.category || 'Other')
      incomeByCat[cat] = (incomeByCat[cat] || 0) + parseFloat(r.amount as string || '0')
    }

    const expenseByCat: Record<string, number> = {}
    for (const r of (expenseAll.data || []) as Record<string, unknown>[]) {
      const cat = String(r.category || 'Other')
      expenseByCat[cat] = (expenseByCat[cat] || 0) + parseFloat(r.amount as string || '0')
    }

    return c.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      net_position: totalIncome - totalExpense,
      today_income: sum(incomeToday.data, 'amount'),
      today_expense: sum(expenseToday.data, 'amount'),
      month_income: sum(incomeMonth.data, 'amount'),
      month_expense: sum(expenseMonth.data, 'amount'),
      vendor_outstanding: vendorOutstanding,
      fee_collected: sum(feePayments.data as Record<string, unknown>[], 'amount_paid'),
      income_by_category: Object.entries(incomeByCat).map(([category, total]) => ({ category, total })),
      expense_by_category: Object.entries(expenseByCat).map(([category, total]) => ({ category, total })),
    })
  } catch {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default router
