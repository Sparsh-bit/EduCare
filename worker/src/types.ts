export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  RESEND_API_KEY: string
  FRONTEND_URL: string
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  MSG91_AUTH_KEY: string
  MSG91_SENDER_ID: string
  MSG91_TEMPLATE_ID: string
  LATE_FEE_PER_DAY: string
  LATE_FEE_MAX: string
  ERP_API_KEY: string
  RATE_LIMIT_KV: KVNamespace
  BUCKET: R2Bucket
}

export type Variables = {
  user: {
    id: number
    email: string
    role: string
    name: string
    school_id: number
  }
}
