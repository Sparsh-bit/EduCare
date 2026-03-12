interface SMSPayload {
  phone: string
  message: string
  templateId?: string
}

export async function sendSMS(
  env: { MSG91_AUTH_KEY: string; MSG91_SENDER_ID: string; MSG91_TEMPLATE_ID: string },
  payload: SMSPayload
): Promise<boolean> {
  if (!env.MSG91_AUTH_KEY) {
    console.warn('MSG91 auth key not configured. SMS not sent.', { phone: payload.phone })
    return false
  }

  const sanitizedPhone = payload.phone.replace(/\D/g, '').replace(/^91/, '')
  if (sanitizedPhone.length < 10 || sanitizedPhone.length > 12) {
    console.warn('Invalid phone number for SMS', { phone: payload.phone })
    return false
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: payload.templateId || env.MSG91_TEMPLATE_ID,
        sender: env.MSG91_SENDER_ID,
        short_url: '0',
        mobiles: `91${sanitizedPhone}`,
        message: payload.message,
      }),
    })
    return response.ok
  } catch (error) {
    console.error('SMS sending failed', { phone: payload.phone, error: (error as Error).message })
    return false
  }
}

export async function sendAbsentAlert(
  env: { MSG91_AUTH_KEY: string; MSG91_SENDER_ID: string; MSG91_TEMPLATE_ID: string },
  studentName: string,
  parentPhone: string,
  date: string
): Promise<boolean> {
  return sendSMS(env, {
    phone: parentPhone,
    message: `Dear Parent, your ward ${studentName} was marked absent on ${date}. - EduCare ERP by Concilio`,
  })
}

export async function sendFeeDueReminder(
  env: { MSG91_AUTH_KEY: string; MSG91_SENDER_ID: string; MSG91_TEMPLATE_ID: string },
  studentName: string,
  parentPhone: string,
  amount: number,
  dueDate: string
): Promise<boolean> {
  return sendSMS(env, {
    phone: parentPhone,
    message: `Dear Parent, fee of Rs.${amount} for ${studentName} is due on ${dueDate}. Please clear the dues. - EduCare ERP by Concilio`,
  })
}
