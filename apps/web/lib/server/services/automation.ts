import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditionField,
  AutomationConditionOperator,
  AutomationLog,
  AutomationRule,
  AutomationTriggerType,
  InternalTemplate,
} from '@anoud-job/types';
import { getSupabaseAdmin } from '../supabase';
import { BadRequestError, NotFoundError } from '../errors';
import { sendWhatsAppText, sendWhatsAppTemplate } from '../meta';
import { isOutsideBusinessHours } from './settings';

export interface AutomationContext {
  conversationId: string;
  contactId: string;
  messageContent: string;
  messageType: string;
  isFirstMessage: boolean;
  isOutsideHours: boolean;
  channel: string;
}

interface TemplateTriggerRule {
  type: 'first_message' | 'outside_hours' | 'keyword' | 'always';
  keyword?: string;
  hours?: { start: string; end: string };
}

interface ContactRow {
  id: string;
  phone: string;
  channel: string | null;
  source: string | null;
  tags: string[] | null;
  pipeline_stage: string | null;
}

interface ConversationRow {
  id: string;
  assigned_agent_id: string | null;
  assigned_team_id: string | null;
}

export interface CreateRuleInput {
  name: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: Record<string, unknown>;
  conditions?: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
  is_active?: boolean;
}

export type UpdateRuleInput = Partial<CreateRuleInput>;

export async function findAllRules(): Promise<AutomationRule[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('automation_rules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new BadRequestError(error.message);
  return (data ?? []) as AutomationRule[];
}

export async function findRule(id: string): Promise<AutomationRule> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('automation_rules')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Rule ${id} not found`);
  return data as AutomationRule;
}

export async function createRule(dto: CreateRuleInput): Promise<AutomationRule> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from('automation_rules')
    .insert({
      name: dto.name,
      trigger_type: dto.trigger_type,
      trigger_config: dto.trigger_config ?? {},
      conditions: dto.conditions ?? [],
      actions: dto.actions ?? [],
      is_active: dto.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  return data as AutomationRule;
}

export async function updateRule(
  id: string,
  dto: UpdateRuleInput,
): Promise<AutomationRule> {
  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (dto.name !== undefined) patch.name = dto.name;
  if (dto.trigger_type !== undefined) patch.trigger_type = dto.trigger_type;
  if (dto.trigger_config !== undefined) patch.trigger_config = dto.trigger_config;
  if (dto.conditions !== undefined) patch.conditions = dto.conditions;
  if (dto.actions !== undefined) patch.actions = dto.actions;
  if (dto.is_active !== undefined) patch.is_active = dto.is_active;
  const { data, error } = await db
    .from('automation_rules')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new BadRequestError(error.message);
  if (!data) throw new NotFoundError(`Rule ${id} not found`);
  return data as AutomationRule;
}

export async function deleteRule(id: string) {
  const db = getSupabaseAdmin();
  const { error } = await db.from('automation_rules').delete().eq('id', id);
  if (error) throw new BadRequestError(error.message);
  return { success: true };
}

export async function toggleRule(id: string, isActive: boolean) {
  return updateRule(id, { is_active: isActive });
}

export async function findAutomationLogs(filters: {
  rule_id?: string;
  result?: 'success' | 'failed';
}): Promise<(AutomationLog & { rule_name: string | null })[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (filters.rule_id) query = query.eq('rule_id', filters.rule_id);
  if (filters.result) query = query.eq('result', filters.result);
  const { data, error } = await query;
  if (error) throw new BadRequestError(error.message);
  const rows = (data ?? []) as AutomationLog[];
  if (rows.length === 0) return [];

  const ruleIds = Array.from(
    new Set(rows.map((r) => r.rule_id).filter((v): v is string => !!v)),
  );
  const ruleNameMap = new Map<string, string>();
  if (ruleIds.length > 0) {
    const { data: rules } = await db
      .from('automation_rules')
      .select('id, name')
      .in('id', ruleIds);
    for (const r of rules ?? []) {
      ruleNameMap.set(r.id as string, (r.name as string) ?? '');
    }
  }

  return rows.map((row) => ({
    ...row,
    rule_name: row.rule_id ? ruleNameMap.get(row.rule_id) ?? null : null,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// Evaluation engine — called from webhook
// ═══════════════════════════════════════════════════════════════════════

async function logRuleOutcome(
  ruleId: string | null,
  conversationId: string,
  result: 'success' | 'failed',
  errorMessage: string | null,
): Promise<void> {
  try {
    const db = getSupabaseAdmin();
    await db.from('automation_logs').insert({
      rule_id: ruleId,
      conversation_id: conversationId,
      result,
      error_message: errorMessage,
    });
  } catch {
    /* swallow */
  }
}

function matchesTemplateTrigger(
  template: InternalTemplate,
  ctx: AutomationContext,
): boolean {
  const rule = template.trigger_rule as TemplateTriggerRule | null;
  if (!rule || !rule.type) return false;
  switch (rule.type) {
    case 'first_message':
      return ctx.isFirstMessage === true;
    case 'outside_hours':
      return ctx.isOutsideHours === true;
    case 'keyword': {
      const kw = rule.keyword?.toLowerCase().trim();
      if (!kw) return false;
      return ctx.messageContent.toLowerCase().includes(kw);
    }
    case 'always':
      return true;
    default:
      return false;
  }
}

async function fireTemplate(
  template: InternalTemplate,
  contactPhone: string,
  ctx: AutomationContext,
): Promise<void> {
  const db = getSupabaseAdmin();
  try {
    const waMessageId = await sendWhatsAppText(contactPhone, template.content);
    console.log(
      `[AUTOMATION] Template "${template.title}" → ${contactPhone} (${waMessageId ?? 'no-id'})`,
    );
    await db.from('messages').insert({
      conversation_id: ctx.conversationId,
      wa_message_id: waMessageId,
      direction: 'outbound',
      type: 'text',
      content: template.content,
      sent_by: null,
      status: 'sent',
    });
    await db.from('automation_logs').insert({
      rule_id: null,
      conversation_id: ctx.conversationId,
      result: 'success',
      error_message: null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Template "${template.title}" send failed: ${msg}`);
    await logRuleOutcome(null, ctx.conversationId, 'failed', msg);
  }
}

function matchesRuleTrigger(
  rule: AutomationRule,
  ctx: AutomationContext,
): boolean {
  switch (rule.trigger_type as AutomationTriggerType) {
    case 'message_received':
      return true;
    case 'conversation_opened':
      return ctx.isFirstMessage === true;
    case 'keyword_match': {
      const kw = rule.trigger_config?.keyword?.toLowerCase().trim();
      if (!kw) return false;
      return ctx.messageContent.toLowerCase().includes(kw);
    }
    case 'conversation_resolved':
    case 'no_reply_timeout':
      return false;
    default:
      return false;
  }
}

function getFieldValue(
  field: AutomationConditionField,
  ctx: AutomationContext,
  contact: ContactRow,
  conversation: ConversationRow | null,
): string | string[] | null {
  switch (field) {
    case 'contact.channel':
      return contact.channel ?? null;
    case 'contact.source':
      return contact.source ?? null;
    case 'contact.tags':
      return contact.tags ?? [];
    case 'message.content':
      return ctx.messageContent ?? '';
    case 'conversation.assigned_agent_id':
      return conversation?.assigned_agent_id ?? null;
    case 'conversation.assigned_team_id':
      return conversation?.assigned_team_id ?? null;
    default:
      return null;
  }
}

function applyOperator(
  op: AutomationConditionOperator,
  raw: string | string[] | null,
  value: string,
): boolean {
  const isArray = Array.isArray(raw);
  const str = isArray ? '' : (raw as string | null) ?? '';
  const arr = isArray ? (raw as string[]) : [];
  switch (op) {
    case 'equals':
      return isArray ? arr.includes(value) : str === value;
    case 'not_equals':
      return isArray ? !arr.includes(value) : str !== value;
    case 'contains':
      return isArray
        ? arr.some((v) => v.toLowerCase().includes(value.toLowerCase()))
        : str.toLowerCase().includes(value.toLowerCase());
    case 'not_contains':
      return isArray
        ? !arr.some((v) => v.toLowerCase().includes(value.toLowerCase()))
        : !str.toLowerCase().includes(value.toLowerCase());
    case 'is_empty':
      return isArray ? arr.length === 0 : !str;
    case 'is_not_empty':
      return isArray ? arr.length > 0 : !!str;
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: AutomationCondition[],
  ctx: AutomationContext,
  contact: ContactRow,
  conversation: ConversationRow | null,
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  for (const cond of conditions) {
    const raw = getFieldValue(cond.field, ctx, contact, conversation);
    if (!applyOperator(cond.operator, raw, cond.value)) return false;
  }
  return true;
}

async function executeAction(
  action: AutomationAction,
  contact: ContactRow,
  ctx: AutomationContext,
): Promise<void> {
  const db = getSupabaseAdmin();
  switch (action.type) {
    case 'send_message': {
      const body = action.config?.message;
      if (!body) throw new Error('send_message: config.message missing');
      const waMessageId = await sendWhatsAppText(contact.phone, body);
      await db.from('messages').insert({
        conversation_id: ctx.conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        type: 'text',
        content: body,
        sent_by: null,
        status: 'sent',
      });
      return;
    }
    case 'assign_agent': {
      const agentId = action.config?.agentId;
      if (!agentId) throw new Error('assign_agent: config.agentId missing');
      const { error } = await db
        .from('conversations')
        .update({ assigned_agent_id: agentId, status: 'assigned' })
        .eq('id', ctx.conversationId);
      if (error) throw new Error(error.message);
      return;
    }
    case 'assign_team': {
      const teamId = action.config?.teamId;
      if (!teamId) throw new Error('assign_team: config.teamId missing');
      const { error } = await db
        .from('conversations')
        .update({ assigned_team_id: teamId })
        .eq('id', ctx.conversationId);
      if (error) throw new Error(error.message);
      return;
    }
    case 'add_tag': {
      const tag = action.config?.tag?.trim();
      if (!tag) throw new Error('add_tag: config.tag missing');
      const existing = contact.tags ?? [];
      if (existing.includes(tag)) return;
      const next = [...existing, tag];
      const { error } = await db
        .from('contacts')
        .update({ tags: next })
        .eq('id', contact.id);
      if (error) throw new Error(error.message);
      contact.tags = next;
      return;
    }
    case 'change_stage': {
      const stage = action.config?.stage;
      if (!stage) throw new Error('change_stage: config.stage missing');
      const { error } = await db
        .from('contacts')
        .update({ pipeline_stage: stage })
        .eq('id', contact.id);
      if (error) throw new Error(error.message);
      return;
    }
    case 'send_wa_template': {
      const name = action.config?.templateName;
      if (!name) throw new Error('send_wa_template: config.templateName missing');
      const language = action.config?.templateLanguage ?? 'en';
      const waMessageId = await sendWhatsAppTemplate(contact.phone, name, language);
      await db.from('messages').insert({
        conversation_id: ctx.conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        type: 'template',
        content: name,
        sent_by: null,
        status: 'sent',
      });
      return;
    }
    default:
      throw new Error(
        `Unknown action type: ${(action as AutomationAction).type}`,
      );
  }
}

async function executeActions(
  rule: AutomationRule,
  contact: ContactRow,
  ctx: AutomationContext,
): Promise<void> {
  const actions = (rule.actions ?? []) as AutomationAction[];
  if (actions.length === 0) return;
  for (const action of actions) {
    try {
      await executeAction(action, contact, ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Rule "${rule.name}" action ${action.type} failed: ${msg}`);
      await logRuleOutcome(rule.id, ctx.conversationId, 'failed', msg);
      throw err;
    }
  }
  const db = getSupabaseAdmin();
  await db
    .from('automation_rules')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', rule.id);
  await logRuleOutcome(rule.id, ctx.conversationId, 'success', null);
  console.log(`[AUTOMATION] Rule "${rule.name}" fired successfully`);
}

export async function evaluateAndRun(ctx: AutomationContext): Promise<void> {
  const db = getSupabaseAdmin();
  const { data: contactData } = await db
    .from('contacts')
    .select('id, phone, channel, source, tags, pipeline_stage')
    .eq('id', ctx.contactId)
    .maybeSingle();
  const contact = contactData as ContactRow | null;
  if (!contact?.phone) {
    console.warn(`[automation] contact ${ctx.contactId} has no phone`);
    return;
  }

  try {
    const { data: templates, error } = await db
      .from('internal_templates')
      .select('*')
      .eq('is_auto', true);
    if (!error && templates && templates.length > 0) {
      for (const template of templates as InternalTemplate[]) {
        try {
          if (!matchesTemplateTrigger(template, ctx)) continue;
          await fireTemplate(template, contact.phone, ctx);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `Template "${template.title}" evaluation failed: ${msg}`,
          );
        }
      }
    } else if (error) {
      console.error(`Failed to fetch auto templates: ${error.message}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Template evaluation wrapper failed: ${msg}`);
  }

  try {
    const { data: rules, error } = await db
      .from('automation_rules')
      .select('*')
      .eq('is_active', true);
    if (error) {
      console.error(`Failed to fetch rules: ${error.message}`);
      return;
    }
    if (!rules || rules.length === 0) return;

    const { data: convData } = await db
      .from('conversations')
      .select('id, assigned_agent_id, assigned_team_id')
      .eq('id', ctx.conversationId)
      .maybeSingle();
    const conversation = convData as ConversationRow | null;

    for (const rule of rules as AutomationRule[]) {
      try {
        if (!matchesRuleTrigger(rule, ctx)) continue;
        if (
          !evaluateConditions(rule.conditions ?? [], ctx, contact, conversation)
        ) {
          continue;
        }
        await executeActions(rule, contact, ctx);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Rule "${rule.name}" failed: ${msg}`);
        await logRuleOutcome(rule.id, ctx.conversationId, 'failed', msg);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Rules evaluation wrapper failed: ${msg}`);
  }
}

export { isOutsideBusinessHours };
