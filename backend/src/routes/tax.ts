import { Router, Response } from 'express';
import { body } from 'express-validator';
import db from '../config/database';
import { authenticate, AuthRequest, authorize, ownerOnly } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paramId } from '../middleware/paramValidation';
import logger from '../config/logger';

const router = Router();

// Income tax slabs FY 2024-25 (Old Regime)
function calcAnnualTDS(grossAnnual: number, deduction80c: number, hraExemption: number): number {
    const standardDeduction = 50000;
    const taxableIncome = Math.max(0, grossAnnual - hraExemption - deduction80c - standardDeduction);

    let tax = 0;
    if (taxableIncome <= 250000) tax = 0;
    else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05;
    else if (taxableIncome <= 1000000) tax = 12500 + (taxableIncome - 500000) * 0.20;
    else tax = 112500 + (taxableIncome - 1000000) * 0.30;

    // 4% education cess
    tax = tax * 1.04;
    return Math.round(tax);
}

function calcProfessionalTax(grossSalary: number, slabs: any[], month: number): number {
    for (const slab of slabs) {
        const max = slab.max_salary === null ? Infinity : Number(slab.max_salary);
        if (grossSalary >= Number(slab.min_salary) && grossSalary <= max) {
            return month === 2 && slab.feb_tax !== null ? Number(slab.feb_tax) : Number(slab.monthly_tax);
        }
    }
    return 0;
}

// ─── TAX CONFIG ───
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const config = await db('tax_config').where({ school_id: req.user!.school_id }).first();
        res.json(config || {});
    } catch (error) {
        logger.error('Get tax config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/config', authenticate, ownerOnly(), async (req: AuthRequest, res: Response) => {
    try {
        const data = { ...req.body };
        delete data.id;
        data.school_id = req.user!.school_id;

        const existing = await db('tax_config').where({ school_id: req.user!.school_id }).first();
        if (existing) {
            await db('tax_config').where({ school_id: req.user!.school_id }).update(data);
        } else {
            await db('tax_config').insert(data);
        }
        res.json({ message: 'Tax configuration saved' });
    } catch (error) {
        logger.error('Save tax config error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PROFESSIONAL TAX SLABS ───
router.get('/pt-slabs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const slabs = await db('professional_tax_slabs')
            .where({ school_id: req.user!.school_id })
            .orderBy('min_salary');
        res.json({ data: slabs });
    } catch (error) {
        logger.error('Get PT slabs error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/pt-slabs', authenticate, ownerOnly(), async (req: AuthRequest, res: Response) => {
    try {
        const { state, slabs } = req.body;
        if (!Array.isArray(slabs)) return res.status(400).json({ error: 'slabs must be an array' });

        // Delete existing slabs for this school/state and re-insert
        await db('professional_tax_slabs').where({ school_id: req.user!.school_id }).delete();
        const inserts = slabs.map((s: any) => ({
            school_id: req.user!.school_id,
            state: state || s.state,
            min_salary: s.min_salary,
            max_salary: s.max_salary || null,
            monthly_tax: s.monthly_tax,
            feb_tax: s.feb_tax || null,
        }));
        await db('professional_tax_slabs').insert(inserts);

        res.json({ message: `${inserts.length} PT slabs saved` });
    } catch (error) {
        logger.error('Save PT slabs error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── SALARY STRUCTURE ───
router.get('/salary-structure/:staffId', authenticate, validate([paramId('staffId')]), async (req: AuthRequest, res: Response) => {
    try {
        const structure = await db('salary_structure')
            .where({ school_id: req.user!.school_id, staff_id: req.params.staffId })
            .first();
        res.json(structure || {});
    } catch (error) {
        logger.error('Get salary structure error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/salary-structure', authenticate, authorize('owner', 'co-owner', 'hr_manager'), validate([
    body('staff_id').isInt(),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { staff_id, basic, hra, da, ta, medical_allowance, special_allowance, other_allowance, pf_applicable, esi_applicable, pt_applicable, tds_applicable, declared_investment_80c, declared_hra_exemption } = req.body;

        const staffMember = await db('staff').where({ id: staff_id, school_id: req.user!.school_id }).first();
        if (!staffMember) return res.status(404).json({ error: 'Staff member not found' });

        const gross = Number(basic || 0) + Number(hra || 0) + Number(da || 0) + Number(ta || 0) + Number(medical_allowance || 0) + Number(special_allowance || 0) + Number(other_allowance || 0);

        const data = { basic, hra, da, ta, medical_allowance, special_allowance, other_allowance, gross_salary: gross, pf_applicable: pf_applicable ?? true, esi_applicable: esi_applicable ?? true, pt_applicable: pt_applicable ?? true, tds_applicable: tds_applicable ?? false, declared_investment_80c: declared_investment_80c || 0, declared_hra_exemption: declared_hra_exemption || 0 };

        const existing = await db('salary_structure').where({ school_id: req.user!.school_id, staff_id }).first();
        if (existing) {
            await db('salary_structure').where({ id: existing.id }).update(data);
        } else {
            await db('salary_structure').insert({ school_id: req.user!.school_id, staff_id, ...data });
        }
        // Also update staff.salary
        await db('staff').where({ id: staff_id, school_id: req.user!.school_id }).update({ salary: gross });

        res.json({ message: 'Salary structure saved', gross_salary: gross });
    } catch (error) {
        logger.error('Save salary structure error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PAYROLL ───
router.get('/payroll', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { month, year, status } = req.query;
        let q = db('payroll_records')
            .join('staff', 'payroll_records.staff_id', 'staff.id')
            .where({ 'payroll_records.school_id': req.user!.school_id })
            .select('payroll_records.*', 'staff.name as staff_name', 'staff.employee_id', 'staff.designation');
        if (month) q = q.where('payroll_records.month', month);
        if (year) q = q.where('payroll_records.year', year);
        if (status) q = q.where('payroll_records.status', status);
        const records = await q.orderBy('staff.name');
        res.json({ data: records });
    } catch (error) {
        logger.error('Get payroll error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/payroll/process', authenticate, authorize('owner', 'co-owner', 'hr_manager'), validate([
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2020 }),
    body('working_days').isInt({ min: 1 }),
]), async (req: AuthRequest, res: Response) => {
    try {
        const { month, year, working_days, staff_ids } = req.body;
        const schoolId = req.user!.school_id;

        const taxConfig = await db('tax_config').where({ school_id: schoolId }).first();
        const ptSlabs = await db('professional_tax_slabs').where({ school_id: schoolId }).orderBy('min_salary');

        let staffQuery = db('staff')
            .join('salary_structure', function () {
                this.on('staff.id', 'salary_structure.staff_id')
                    .andOn('salary_structure.school_id', db.raw('?', [schoolId]));
            })
            .where({ 'staff.school_id': schoolId, 'staff.status': 'active' })
            .select('staff.*', 'salary_structure.*', 'staff.id as staff_id');

        if (Array.isArray(staff_ids) && staff_ids.length > 0) {
            staffQuery = staffQuery.whereIn('staff.id', staff_ids);
        }

        const staffList = await staffQuery;
        const processed: number[] = [];

        for (const s of staffList) {
            const presentDays = s.present_days ?? working_days;
            const lopDays = Math.max(0, working_days - presentDays);
            const factor = lopDays > 0 ? (working_days - lopDays) / working_days : 1;

            const basicEarned = Number(s.basic || 0) * factor;
            const hraEarned = Number(s.hra || 0) * factor;
            const daEarned = Number(s.da || 0) * factor;
            const taEarned = Number(s.ta || 0) * factor;
            const medEarned = Number(s.medical_allowance || 0) * factor;
            const specEarned = Number(s.special_allowance || 0) * factor;
            const otherEarned = Number(s.other_allowance || 0) * factor;
            const grossEarned = basicEarned + hraEarned + daEarned + taEarned + medEarned + specEarned + otherEarned;

            // PF
            const pfWageCeiling = taxConfig?.pf_wage_ceiling || 15000;
            const pfBase = Math.min(basicEarned, pfWageCeiling);
            const pfEmployee = s.pf_applicable && taxConfig?.pf_applicable ? pfBase * (Number(taxConfig?.pf_employee_rate || 12) / 100) : 0;
            const pfEmployer = s.pf_applicable && taxConfig?.pf_applicable ? pfBase * (Number(taxConfig?.pf_employer_rate || 12) / 100) : 0;

            // ESI
            const esiWageCeiling = taxConfig?.esi_wage_ceiling || 21000;
            const esiEmployee = s.esi_applicable && taxConfig?.esi_applicable && grossEarned <= esiWageCeiling
                ? grossEarned * (Number(taxConfig?.esi_employee_rate || 0.75) / 100) : 0;
            const esiEmployer = s.esi_applicable && taxConfig?.esi_applicable && grossEarned <= esiWageCeiling
                ? grossEarned * (Number(taxConfig?.esi_employer_rate || 3.25) / 100) : 0;

            // PT
            const pt = s.pt_applicable ? calcProfessionalTax(grossEarned, ptSlabs, month) : 0;

            // TDS
            const annualGross = grossEarned * 12;
            const annualTDS = s.tds_applicable
                ? calcAnnualTDS(annualGross, Number(s.declared_investment_80c || 0), Number(s.declared_hra_exemption || 0))
                : 0;
            const monthlyTDS = Math.round(annualTDS / 12);

            const totalDeductions = pfEmployee + esiEmployee + pt + monthlyTDS;
            const netSalary = grossEarned - totalDeductions;

            // Upsert payroll record
            await db('payroll_records')
                .insert({
                    school_id: schoolId, staff_id: s.staff_id, month, year,
                    working_days, present_days: presentDays, lop_days: lopDays,
                    basic_earned: Math.round(basicEarned * 100) / 100,
                    hra_earned: Math.round(hraEarned * 100) / 100,
                    da_earned: Math.round(daEarned * 100) / 100,
                    ta_earned: Math.round(taEarned * 100) / 100,
                    medical_earned: Math.round(medEarned * 100) / 100,
                    special_earned: Math.round(specEarned * 100) / 100,
                    other_earned: Math.round(otherEarned * 100) / 100,
                    gross_earned: Math.round(grossEarned * 100) / 100,
                    pf_employee: Math.round(pfEmployee * 100) / 100,
                    pf_employer: Math.round(pfEmployer * 100) / 100,
                    esi_employee: Math.round(esiEmployee * 100) / 100,
                    esi_employer: Math.round(esiEmployer * 100) / 100,
                    professional_tax: pt,
                    tds: monthlyTDS,
                    other_deductions: 0,
                    total_deductions: Math.round(totalDeductions * 100) / 100,
                    net_salary: Math.round(netSalary * 100) / 100,
                    status: 'draft',
                    processed_by: req.user!.id,
                })
                .onConflict(['school_id', 'staff_id', 'month', 'year'])
                .merge();

            processed.push(s.staff_id);
        }

        res.json({ message: `Payroll processed for ${processed.length} employees`, count: processed.length });
    } catch (error) {
        logger.error('Process payroll error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/payroll/:id', authenticate, authorize('owner', 'co-owner', 'hr_manager'), async (req: AuthRequest, res: Response) => {
    try {
        const { status, payment_date, payment_mode, transaction_ref, other_deductions } = req.body;
        const record = await db('payroll_records').where({ id: req.params.id, school_id: req.user!.school_id }).first();
        if (!record) return res.status(404).json({ error: 'Payroll record not found' });

        await db('payroll_records').where({ id: req.params.id, school_id: req.user!.school_id }).update({
            status, payment_date, payment_mode, transaction_ref,
            ...(other_deductions !== undefined ? {
                other_deductions,
                total_deductions: Number(record.pf_employee) + Number(record.esi_employee) + Number(record.professional_tax) + Number(record.tds) + Number(other_deductions),
                net_salary: Number(record.gross_earned) - (Number(record.pf_employee) + Number(record.esi_employee) + Number(record.professional_tax) + Number(record.tds) + Number(other_deductions)),
            } : {}),
        });

        res.json({ message: 'Payroll record updated' });
    } catch (error) {
        logger.error('Update payroll error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/payroll/:id/slip', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const slip = await db('payroll_records')
            .join('staff', 'payroll_records.staff_id', 'staff.id')
            .where({ 'payroll_records.id': req.params.id, 'payroll_records.school_id': req.user!.school_id })
            .select('payroll_records.*', 'staff.name', 'staff.employee_id', 'staff.designation', 'staff.department', 'staff.bank_name', 'staff.bank_account_number', 'staff.bank_ifsc')
            .first();
        if (!slip) return res.status(404).json({ error: 'Payslip not found' });

        const taxConfig = await db('tax_config').where({ school_id: req.user!.school_id }).first();
        const school = await db('schools').where({ id: req.user!.school_id }).first();

        res.json({
            slip,
            school: { name: school?.name, pan: taxConfig?.pan_number, epf_id: taxConfig?.epf_establishment_id },
        });
    } catch (error) {
        logger.error('Get payslip error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── FORM 16 ───
// List route MUST come before the :staffId param route to avoid collision
router.get('/form16/list/:financialYear', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // Normalize "2025-26" → "2025" (DB stores year as integer start year)
        const fyParam = String(req.params.financialYear);
        const fyYear = Number(fyParam.includes('-') ? fyParam.split('-')[0] : fyParam);
        const certs = await db('tds_certificates')
            .join('staff', 'tds_certificates.staff_id', 'staff.id')
            .where({ 'tds_certificates.school_id': req.user!.school_id, 'tds_certificates.financial_year_start': fyYear })
            .select('tds_certificates.*', 'staff.name', 'staff.employee_id', 'staff.designation')
            .orderBy('staff.name');
        res.json({ data: certs });
    } catch (error) {
        logger.error('List Form 16 error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/form16/:staffId/:financialYear', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        // Normalize "2025-26" → "2025"
        const fyParam = String(req.params.financialYear);
        const fyYear = Number(fyParam.includes('-') ? fyParam.split('-')[0] : fyParam);
        const cert = await db('tds_certificates')
            .join('staff', 'tds_certificates.staff_id', 'staff.id')
            .where({
                'tds_certificates.school_id': req.user!.school_id,
                'tds_certificates.staff_id': req.params.staffId,
                'tds_certificates.financial_year_start': fyYear,
            })
            .select('tds_certificates.*', 'staff.name', 'staff.employee_id', 'staff.designation')
            .first();
        if (!cert) return res.status(404).json({ error: 'Form 16 not generated yet' });
        res.json(cert);
    } catch (error) {
        logger.error('Get Form 16 error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/form16/generate/:financialYear', authenticate, authorize('owner', 'co-owner'), async (req: AuthRequest, res: Response) => {
    try {
        const schoolId = req.user!.school_id;
        // Normalize "2025-26" → 2025
        const fyParam = String(req.params.financialYear);
        const fyRaw = fyParam.includes('-') ? fyParam.split('-')[0] : fyParam;
        const fyStart = Number(fyRaw);

        // Sum payroll records Apr (month 4) fyStart to Mar (month 3) fyStart+1
        const payrollData = await db('payroll_records')
            .join('salary_structure', function () {
                this.on('payroll_records.staff_id', 'salary_structure.staff_id')
                    .andOn('salary_structure.school_id', db.raw('?', [schoolId]));
            })
            .where({ 'payroll_records.school_id': schoolId, 'payroll_records.status': 'paid' })
            .where(function () {
                this.where(function () {
                    this.where('payroll_records.year', fyStart).andWhere('payroll_records.month', '>=', 4);
                }).orWhere(function () {
                    this.where('payroll_records.year', fyStart + 1).andWhere('payroll_records.month', '<=', 3);
                });
            })
            .groupBy('payroll_records.staff_id', 'salary_structure.declared_investment_80c', 'salary_structure.declared_hra_exemption')
            .select(
                'payroll_records.staff_id',
                db.raw('SUM(payroll_records.gross_earned) as annual_gross'),
                db.raw('SUM(payroll_records.tds) as total_tds'),
                'salary_structure.declared_investment_80c',
                'salary_structure.declared_hra_exemption'
            );

        const generated: number[] = [];
        for (const pd of payrollData) {
            const annualGross = Number(pd.annual_gross);
            const exemHRA = Number(pd.declared_hra_exemption || 0);
            const ded80c = Number(pd.declared_investment_80c || 0);
            const taxable = Math.max(0, annualGross - exemHRA - ded80c - 50000);
            const totalTDS = Number(pd.total_tds);
            const eduCess = Math.round(totalTDS * 0.04 * 100) / 100;

            await db('tds_certificates')
                .insert({
                    school_id: schoolId,
                    staff_id: pd.staff_id,
                    financial_year_start: fyStart,
                    gross_salary: Math.round(annualGross * 100) / 100,
                    exemptions_hra: exemHRA,
                    deductions_80c: ded80c,
                    standard_deduction: 50000,
                    taxable_income: Math.round(taxable * 100) / 100,
                    total_tds: totalTDS,
                    education_cess: eduCess,
                    status: 'issued',
                    issue_date: new Date().toISOString().split('T')[0],
                })
                .onConflict(['school_id', 'staff_id', 'financial_year_start'])
                .merge();

            generated.push(pd.staff_id);
        }

        res.json({ message: `Form 16 generated for ${generated.length} employees`, count: generated.length });
    } catch (error) {
        logger.error('Generate Form 16 error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GST REPORT ───
router.get('/gst-report', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const taxConfig = await db('tax_config').where({ school_id: req.user!.school_id }).first();

        if (!taxConfig?.gst_applicable) {
            return res.json({ gst_applicable: false, message: 'GST is not configured for this school' });
        }

        let q = db('fee_payments')
            .join('students', 'fee_payments.student_id', 'students.id')
            .where({ 'students.school_id': req.user!.school_id, 'fee_payments.status': 'paid' });

        if (month && year) {
            q = q.whereRaw('EXTRACT(MONTH FROM fee_payments.payment_date) = ? AND EXTRACT(YEAR FROM fee_payments.payment_date) = ?', [month, year]);
        }

        const payments = await q.select(
            db.raw('SUM(fee_payments.amount_paid) as total_collection'),
            db.raw('COUNT(*) as payment_count')
        ).first();

        const totalCollection = Number(payments?.total_collection || 0);
        const gstRate = Number(taxConfig.gst_rate || 18);
        const taxableAmount = totalCollection / (1 + gstRate / 100);
        const gstCollected = totalCollection - taxableAmount;
        const cgst = gstCollected / 2;
        const sgst = gstCollected / 2;

        res.json({
            gst_applicable: true,
            gst_rate: gstRate,
            gstin: taxConfig.gstin,
            total_fee_collection: Math.round(totalCollection * 100) / 100,
            taxable_amount: Math.round(taxableAmount * 100) / 100,
            gst_collected: Math.round(gstCollected * 100) / 100,
            cgst: Math.round(cgst * 100) / 100,
            sgst: Math.round(sgst * 100) / 100,
            payment_count: Number(payments?.payment_count || 0),
            period: month && year ? `${month}/${year}` : 'All time',
        });
    } catch (error) {
        logger.error('GST report error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
