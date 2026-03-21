export const validators = {
    required: (v: string) => !v?.trim() ? 'This field is required' : null,

    phone: (v: string) =>
        !/^[6-9]\d{9}$/.test(v?.replace(/\s/g, ''))
            ? 'Enter a valid 10-digit Indian mobile number'
            : null,

    email: (v: string) =>
        v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
            ? 'Enter a valid email address'
            : null,

    aadhaar: (v: string) =>
        v && !/^\d{12}$/.test(v?.replace(/\s/g, ''))
            ? 'Aadhaar must be 12 digits'
            : null,

    pin: (v: string) =>
        !/^\d{6}$/.test(v)
            ? 'PIN code must be 6 digits'
            : null,

    pan: (v: string) =>
        v && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)
            ? 'Invalid PAN format (e.g., ABCDE1234F)'
            : null,

    minLen: (min: number) => (v: string) =>
        v?.length < min
            ? `Minimum ${min} characters required`
            : null,

    maxLen: (max: number) => (v: string) =>
        v?.length > max
            ? `Maximum ${max} characters allowed`
            : null,

    positiveNum: (v: string | number) =>
        Number(v) <= 0
            ? 'Must be a positive number'
            : null,
};
