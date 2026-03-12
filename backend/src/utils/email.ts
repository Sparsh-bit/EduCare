import logger from '../config/logger';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'EduCare by Concilio <onboarding@resend.dev>';

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!RESEND_API_KEY) {
        logger.warn('Email not sent: RESEND_API_KEY not configured');
        return false;
    }
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
        });
        if (!response.ok) {
            const err = await response.json();
            logger.error('Resend email failed', { status: response.status, error: err, to, subject });
            return false;
        }
        logger.info('Email sent via Resend', { to, subject });
        return true;
    } catch (err) {
        logger.error('Email send failed', { error: (err as Error).message, to });
        return false;
    }
}

export function passwordResetEmailHtml(schoolName: string, ownerName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:#2d3a2e;padding:28px 36px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
              <td style="width:36px;height:36px;background:#f5f2ec;border-radius:8px;text-align:center;line-height:36px;font-weight:bold;color:#2d3a2e;font-size:16px;">C</td><td style="width:10px;"></td>
              <td style="color:#f5f2ec;font-size:18px;font-weight:600;letter-spacing:-0.3px;white-space:nowrap;">Concilio EduCare</td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:22px;font-weight:300;color:#2d3a2e;">Password Reset Request</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">Hello ${ownerName},</p>
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
              We received a request to reset the password for your <strong>${schoolName}</strong> ERP account.
              Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:0.3px;">
                Reset My Password
              </a>
            </div>
            <p style="margin:20px 0 0;font-size:12px;color:#999;line-height:1.6;">
              If you didn't request this, ignore this email — your password will remain unchanged.<br>
              For security, this link expires in 1 hour and can only be used once.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
              EduCare ERP by Concilio &nbsp;·&nbsp; Automated message — do not reply
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function welcomeEmailHtml(schoolName: string, ownerName: string, schoolCode: string, username: string, password: string, loginUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#2d3a2e;padding:28px 36px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
              <td style="width:36px;height:36px;background:#f5f2ec;border-radius:8px;text-align:center;line-height:36px;font-weight:bold;color:#2d3a2e;font-size:16px;">C</td><td style="width:10px;"></td>
              <td style="color:#f5f2ec;font-size:18px;font-weight:600;letter-spacing:-0.3px;white-space:nowrap;">Concilio EduCare</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:22px;font-weight:300;color:#2d3a2e;">Welcome to EduCare ERP!</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">Hello ${ownerName},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
              Your school <strong>${schoolName}</strong> has been successfully registered on EduCare ERP.
              Your classes, sections, and academic year have been set up and the ERP is ready to use.
            </p>
            <div style="background:#f5f2ec;border-radius:10px;padding:18px 22px;margin:20px 0;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Your Login Credentials</p>
              <table style="width:100%;font-size:13px;color:#2d3a2e;">
                <tr><td style="padding:4px 0;color:#888;width:110px;">School Code</td><td style="padding:4px 0;font-weight:700;font-size:16px;letter-spacing:2px;">${schoolCode}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Username</td><td style="padding:4px 0;font-weight:600;">${username}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Password</td><td style="padding:4px 0;font-weight:600;">${password}</td></tr>
              </table>
              <p style="margin:10px 0 0;font-size:11px;color:#aaa;">Please change your password after first login.</p>
            </div>
            <div style="text-align:center;margin:32px 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:0.3px;">
                Sign In to Your ERP
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
              EduCare ERP by Concilio &nbsp;&middot;&nbsp; Automated message — do not reply
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function otpEmailHtml(ownerName: string, otp: string, schoolName: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#2d3a2e;padding:28px 36px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
              <td style="width:36px;height:36px;background:#f5f2ec;border-radius:8px;text-align:center;line-height:36px;font-weight:bold;color:#2d3a2e;font-size:16px;">C</td><td style="width:10px;"></td>
              <td style="color:#f5f2ec;font-size:18px;font-weight:600;letter-spacing:-0.3px;white-space:nowrap;">Concilio EduCare</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:22px;font-weight:300;color:#2d3a2e;">Verify your email</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">Hello ${ownerName},</p>
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
              Please verify your email address for your <strong>${schoolName}</strong> EduCare ERP account.
              Enter the code below — it is valid for <strong>10 minutes</strong>.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <div style="display:inline-block;background:#f5f2ec;border-radius:12px;padding:20px 40px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#2d3a2e;font-family:'Courier New',monospace;">${otp}</span>
              </div>
            </div>
            <p style="margin:20px 0 0;font-size:12px;color:#999;line-height:1.6;">
              If you didn't create an account, ignore this email.<br>
              For security, this code expires in 10 minutes and can only be used once.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
              EduCare ERP by Concilio &nbsp;&middot;&nbsp; Automated message — do not reply
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function employeeCredentialsEmailHtml(
    schoolName: string, employeeName: string, schoolCode: string,
    username: string, password: string, role: string, loginUrl: string
): string {
    const roleName = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:#2d3a2e;padding:28px 36px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
              <td style="width:36px;height:36px;background:#f5f2ec;border-radius:8px;text-align:center;line-height:36px;font-weight:bold;color:#2d3a2e;font-size:16px;">C</td><td style="width:10px;"></td>
              <td style="color:#f5f2ec;font-size:18px;font-weight:600;letter-spacing:-0.3px;white-space:nowrap;">Concilio EduCare</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 6px;font-size:22px;font-weight:300;color:#2d3a2e;">Welcome to ${schoolName}!</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">Hello ${employeeName},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
              You have been added as <strong>${roleName}</strong> on the <strong>${schoolName}</strong> EduCare ERP.
              Below are your login credentials.
            </p>
            <div style="background:#f5f2ec;border-radius:10px;padding:18px 22px;margin:20px 0;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#888;">Your Login Credentials</p>
              <table style="width:100%;font-size:13px;color:#2d3a2e;">
                <tr><td style="padding:4px 0;color:#888;width:110px;">School Code</td><td style="padding:4px 0;font-weight:700;font-size:16px;letter-spacing:2px;">${schoolCode}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Username</td><td style="padding:4px 0;font-weight:600;">${username}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Password</td><td style="padding:4px 0;font-weight:600;">${password}</td></tr>
                <tr><td style="padding:4px 0;color:#888;">Role</td><td style="padding:4px 0;font-weight:600;">${roleName}</td></tr>
              </table>
              <p style="margin:10px 0 0;font-size:11px;color:#aaa;">Please change your password after your first login.</p>
            </div>
            <div style="text-align:center;margin:32px 0;">
              <a href="${loginUrl}" style="display:inline-block;background:#2d3a2e;color:#f5f2ec;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:500;letter-spacing:0.3px;">
                Sign In Now
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px;">
            <p style="margin:0;font-size:11px;color:#bbb;text-align:center;">
              EduCare ERP by Concilio &nbsp;&middot;&nbsp; Automated message — do not reply
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
