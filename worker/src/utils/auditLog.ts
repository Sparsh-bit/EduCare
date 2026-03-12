import { SupabaseClient } from '@supabase/supabase-js'
import { Context } from 'hono'
import { Env, Variables } from '../types'

interface AuditLogEntry {
  user_id?: number
  school_id?: number
  action: string
  entity_type: string
  entity_id?: number
  old_value?: unknown
  new_value?: unknown
  ip_address?: string
  description?: string
}

export async function createAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      user_id: entry.user_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      old_value: entry.old_value ? JSON.stringify(entry.old_value) : null,
      new_value: entry.new_value ? JSON.stringify(entry.new_value) : null,
      ip_address: entry.ip_address,
      description: entry.description,
    }
    if (entry.school_id !== undefined && entry.school_id !== null) {
      row.school_id = entry.school_id
    }
    await supabase.from('audit_logs').insert(row)
  } catch (error) {
    // Audit log failure must never break the main operation
    console.error('Audit log write failed', { error, action: entry.action })
  }
}

export function getClientIp(c: Context<{ Bindings: Env; Variables: Variables }>): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') || 'unknown'
}
