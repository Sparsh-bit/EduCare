import axios from 'axios';
import { config } from '../config';
import logger from '../config/logger';

interface SMSPayload {
    phone: string;
    message: string;
    templateId?: string;
}

export async function sendSMS(payload: SMSPayload): Promise<boolean> {
    if (!config.msg91.authKey) {
        logger.warn('MSG91 auth key not configured. SMS not sent.', { phone: payload.phone });
        return false;
    }

    // Sanitize phone to digits only, strip leading country code if present
    const sanitizedPhone = payload.phone.replace(/\D/g, '').replace(/^91/, '');
    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 12) {
        logger.warn('Invalid phone number for SMS', { phone: payload.phone });
        return false;
    }

    try {
        const response = await axios.post(
            'https://api.msg91.com/api/v5/flow/',
            {
                template_id: payload.templateId || config.msg91.templateId,
                sender: config.msg91.senderId,
                short_url: '0',
                mobiles: `91${sanitizedPhone}`,
                message: payload.message,
            },
            {
                headers: {
                    'authkey': config.msg91.authKey,
                    'Content-Type': 'application/json',
                },
            }
        );

        logger.info('SMS sent successfully', { phone: payload.phone, response: response.data });
        return true;
    } catch (error: any) {
        logger.error('SMS sending failed', { phone: payload.phone, error: error.message });
        return false;
    }
}

export async function sendAbsentAlert(studentName: string, parentPhone: string, date: string): Promise<boolean> {
    return sendSMS({
        phone: parentPhone,
        message: `Dear Parent, your ward ${studentName} was marked absent on ${date}. - EduCare ERP by Concilio`,
    });
}

export async function sendFeeDueReminder(studentName: string, parentPhone: string, amount: number, dueDate: string): Promise<boolean> {
    return sendSMS({
        phone: parentPhone,
        message: `Dear Parent, fee of Rs.${amount} for ${studentName} is due on ${dueDate}. Please clear the dues. - EduCare ERP by Concilio`,
    });
}
