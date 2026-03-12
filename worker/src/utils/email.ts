const EMAIL_FROM = 'EduCare by Concilio <noreply@educareerp.com>'

export async function sendEmail(
  env: { RESEND_API_KEY: string },
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('Email not sent: RESEND_API_KEY not configured')
    return false
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    })
    if (!response.ok) {
      const err = await response.json()
      console.error('Resend email failed', { status: response.status, error: err, to, subject })
      return false
    }
    return true
  } catch (err) {
    console.error('Email send failed', { error: (err as Error).message, to })
    return false
  }
}

export function passwordResetEmailHtml(schoolName: string, ownerName: string, resetUrl: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#2d3a2e;padding:28px 36px;text-align:center;"><span style="color:#f5f2ec;font-size:18px;font-weight:600;">Concilio EduCare</span></td></tr>
        <tr><td style="padding:36px;">
          <p style="font-size:22px;font-weight:300;color:#2d3a2e;">Password Reset Request</p>
          <p style="font-size:14px;color:#666;">Hello ${ownerName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;">We received a request to reset the password for your <strong>${schoolName}</strong> ERP account. Click the button below. This link is valid for <strong>1 hour</strong>.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;">Reset My Password</a>
          </div>
          <p style="font-size:12px;color:#999;">If you didn't request this, ignore this email. This link expires in 1 hour.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function welcomeEmailHtml(
  schoolName: string, ownerName: string, schoolCode: string,
  username: string, password: string, loginUrl: string
): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#2d3a2e;padding:28px 36px;text-align:center;"><span style="color:#f5f2ec;font-size:18px;font-weight:600;">Concilio EduCare</span></td></tr>
        <tr><td style="padding:36px;">
          <p style="font-size:22px;font-weight:300;color:#2d3a2e;">Welcome to EduCare ERP!</p>
          <p style="font-size:14px;color:#666;">Hello ${ownerName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;">Your school <strong>${schoolName}</strong> has been successfully registered.</p>
          <div style="background:#f5f2ec;border-radius:10px;padding:18px 22px;margin:20px 0;">
            <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Your Login Credentials</p>
            <p><strong>School Code:</strong> ${schoolCode}</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p style="font-size:11px;color:#aaa;">Please change your password after first login.</p>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;">Sign In to Your ERP</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function otpEmailHtml(ownerName: string, otp: string, schoolName: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#2d3a2e;padding:28px 36px;text-align:center;"><span style="color:#f5f2ec;font-size:18px;font-weight:600;">Concilio EduCare</span></td></tr>
        <tr><td style="padding:36px;">
          <p style="font-size:22px;font-weight:300;color:#2d3a2e;">Verify your email</p>
          <p style="font-size:14px;color:#666;">Hello ${ownerName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;">Please verify your email for <strong>${schoolName}</strong>. Code valid for <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:32px 0;">
            <div style="display:inline-block;background:#f5f2ec;border-radius:12px;padding:20px 40px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#2d3a2e;font-family:'Courier New',monospace;">${otp}</span>
            </div>
          </div>
          <p style="font-size:12px;color:#999;">This code expires in 10 minutes and can only be used once.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function employeeCredentialsEmailHtml(
  schoolName: string, employeeName: string, schoolCode: string,
  username: string, password: string, role: string, loginUrl: string
): string {
  const roleName = role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#2d3a2e;padding:28px 36px;text-align:center;"><span style="color:#f5f2ec;font-size:18px;font-weight:600;">Concilio EduCare</span></td></tr>
        <tr><td style="padding:36px;">
          <p style="font-size:22px;font-weight:300;color:#2d3a2e;">Welcome to ${schoolName}!</p>
          <p style="font-size:14px;color:#666;">Hello ${employeeName},</p>
          <p style="font-size:14px;color:#555;line-height:1.6;">You have been added as <strong>${roleName}</strong> on the <strong>${schoolName}</strong> EduCare ERP.</p>
          <div style="background:#f5f2ec;border-radius:10px;padding:18px 22px;margin:20px 0;">
            <p><strong>School Code:</strong> ${schoolCode}</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Role:</strong> ${roleName}</p>
            <p style="font-size:11px;color:#aaa;">Please change your password after first login.</p>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;">Sign In Now</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
