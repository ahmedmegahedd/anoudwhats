import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { SettingsService } from '../settings/settings.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
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

interface LogsFilters {
  rule_id?: string;
  result?: 'success' | 'failed';
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════
  // ── Rule CRUD ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async findAllRules(): Promise<AutomationRule[]> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as AutomationRule[];
  }

  async findOneRule(id: string): Promise<AutomationRule> {
    const db = this.supabaseService.getClient();
    const { data, error } = await db
      .from('automation_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Rule ${id} not found`);
    return data as AutomationRule;
  }

  async createRule(dto: CreateRuleDto): Promise<AutomationRule> {
    const db = this.supabaseService.getClient();
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
    if (error) throw new BadRequestException(error.message);
    return data as AutomationRule;
  }

  async updateRule(id: string, dto: UpdateRuleDto): Promise<AutomationRule> {
    const db = this.supabaseService.getClient();
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
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException(`Rule ${id} not found`);
    return data as AutomationRule;
  }

  async deleteRule(id: string): Promise<{ success: boolean }> {
    const db = this.supabaseService.getClient();
    const { error } = await db.from('automation_rules').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async toggleRule(id: string, isActive: boolean): Promise<AutomationRule> {
    return this.updateRule(id, { is_active: isActive });
  }

  async findLogs(filters?: LogsFilters): Promise<(AutomationLog & { rule_name: string | null })[]> {
    const db = this.supabaseService.getClient();
    let query = db
      .from('automation_logs')
      .select('*, automation_rules(name), conversations(contacts(name, phone))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.rule_id) query = query.eq('rule_id', filters.rule_id);
    if (filters?.result) query = query.eq('result', filters.result);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    return (data ?? []).map((row: Record<string, unknown>) => {
      const rule = row.automation_rules as { name: string } | null;
      return {
        ...(row as unknown as AutomationLog),
        rule_name: rule?.name ?? null,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // ── Evaluation Engine ─────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════

  async evaluateAndRun(context: AutomationContext): Promise<void> {
    const db = this.supabaseService.getClient();

    // 1. Look up contact once (reused by templates and rules)
    const { data: contactData } = await db
      .from('contacts')
      .select('id, phone, channel, source, tags, pipeline_stage')
      .eq('id', context.contactId)
      .maybeSingle();
    const contact = contactData as ContactRow | null;

    if (!contact?.phone) {
      this.logger.warn(`Automation: contact ${context.contactId} has no phone`);
      return;
    }

    // ── A) Internal template auto-responses ────────────────────────────
    try {
      const { data: templates, error } = await db
        .from('internal_templates')
        .select('*')
        .eq('is_auto', true);

      if (!error && templates && templates.length > 0) {
        for (const template of templates as InternalTemplate[]) {
          try {
            if (!this.matchesTemplateTrigger(template, context)) continue;
            await this.fireTemplate(template, contact.phone, context);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Template "${template.title}" evaluation failed: ${msg}`,
            );
          }
        }
      } else if (error) {
        this.logger.error(`Failed to fetch auto templates: ${error.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Template evaluation wrapper failed: ${msg}`);
    }

    // ── B) Automation rules ─────────────────────────────────────────────
    try {
      const { data: rules, error } = await db
        .from('automation_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        this.logger.error(`Failed to fetch rules: ${error.message}`);
        return;
      }
      if (!rules || rules.length === 0) return;

      // Load conversation once for rule evaluation
      const { data: convData } = await db
        .from('conversations')
        .select('id, assigned_agent_id, assigned_team_id')
        .eq('id', context.conversationId)
        .maybeSingle();
      const conversation = convData as ConversationRow | null;

      for (const rule of rules as AutomationRule[]) {
        try {
          if (!this.matchesRuleTrigger(rule, context)) continue;
          if (!this.evaluateConditions(rule.conditions ?? [], context, contact, conversation)) {
            continue;
          }
          await this.executeActions(rule, contact, context);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Rule "${rule.name}" failed: ${msg}`);
          await this.logRule(rule.id, context.conversationId, 'failed', msg);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Rules evaluation wrapper failed: ${msg}`);
    }
  }

  // ── Template trigger matching (legacy, unchanged behavior) ───────────

  private matchesTemplateTrigger(
    template: InternalTemplate,
    context: AutomationContext,
  ): boolean {
    const rule = template.trigger_rule as TemplateTriggerRule | null;
    if (!rule || !rule.type) return false;

    switch (rule.type) {
      case 'first_message':
        return context.isFirstMessage === true;
      case 'outside_hours':
        return context.isOutsideHours === true;
      case 'keyword': {
        const kw = rule.keyword?.toLowerCase().trim();
        if (!kw) return false;
        return context.messageContent.toLowerCase().includes(kw);
      }
      case 'always':
        return true;
      default:
        return false;
    }
  }

  private async fireTemplate(
    template: InternalTemplate,
    contactPhone: string,
    context: AutomationContext,
  ): Promise<void> {
    const db = this.supabaseService.getClient();
    try {
      const waMessageId = await this.sendWhatsAppText(contactPhone, template.content);

      this.logger.log(
        `[AUTOMATION] Template "${template.title}" → ${contactPhone} (${waMessageId ?? 'no-id'})`,
      );

      await db.from('messages').insert({
        conversation_id: context.conversationId,
        wa_message_id: waMessageId,
        direction: 'outbound',
        type: 'text',
        content: template.content,
        sent_by: null,
        status: 'sent',
      });

      await db.from('automation_logs').insert({
        rule_id: null,
        conversation_id: context.conversationId,
        result: 'success',
        error_message: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Template "${template.title}" send failed: ${msg}`);
      await this.logRule(null, context.conversationId, 'failed', msg);
    }
  }

  // ── Rule trigger matching ────────────────────────────────────────────

  private matchesRuleTrigger(rule: AutomationRule, context: AutomationContext): boolean {
    const type = rule.trigger_type as AutomationTriggerType;
    switch (type) {
      case 'message_received':
        return true;
      case 'conversation_opened':
        return context.isFirstMessage === true;
      case 'keyword_match': {
        const kw = rule.trigger_config?.keyword?.toLowerCase().trim();
        if (!kw) return false;
        return context.messageContent.toLowerCase().includes(kw);
      }
      case 'conversation_resolved':
        // Handled by conversation-status hook (not implemented yet)
        return false;
      case 'no_reply_timeout':
        // Requires a scheduler — coming soon
        return false;
      default:
        return false;
    }
  }

  // ── Condition evaluation ─────────────────────────────────────────────

  private evaluateConditions(
    conditions: AutomationCondition[],
    context: AutomationContext,
    contact: ContactRow,
    conversation: ConversationRow | null,
  ): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) return true;

    for (const cond of conditions) {
      if (!this.evaluateCondition(cond, context, contact, conversation)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(
    cond: AutomationCondition,
    context: AutomationContext,
    contact: ContactRow,
    conversation: ConversationRow | null,
  ): boolean {
    const raw = this.getFieldValue(cond.field, context, contact, conversation);
    return this.applyOperator(cond.operator, raw, cond.value);
  }

  private getFieldValue(
    field: AutomationConditionField,
    context: AutomationContext,
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
        return context.messageContent ?? '';
      case 'conversation.assigned_agent_id':
        return conversation?.assigned_agent_id ?? null;
      case 'conversation.assigned_team_id':
        return conversation?.assigned_team_id ?? null;
      default:
        return null;
    }
  }

  private applyOperator(
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

  // ── Action execution ─────────────────────────────────────────────────

  private async executeActions(
    rule: AutomationRule,
    contact: ContactRow,
    context: AutomationContext,
  ): Promise<void> {
    const actions = (rule.actions ?? []) as AutomationAction[];
    if (actions.length === 0) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, contact, context);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Rule "${rule.name}" action ${action.type} failed: ${msg}`,
        );
        await this.logRule(rule.id, context.conversationId, 'failed', msg);
        throw err;
      }
    }

    // All actions succeeded
    const db = this.supabaseService.getClient();
    await db
      .from('automation_rules')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', rule.id);
    await this.logRule(rule.id, context.conversationId, 'success', null);
    this.logger.log(`[AUTOMATION] Rule "${rule.name}" fired successfully`);
  }

  private async executeAction(
    action: AutomationAction,
    contact: ContactRow,
    context: AutomationContext,
  ): Promise<void> {
    const db = this.supabaseService.getClient();

    switch (action.type) {
      case 'send_message': {
        const body = action.config?.message;
        if (!body) throw new Error('send_message: config.message missing');
        const waMessageId = await this.sendWhatsAppText(contact.phone, body);
        await db.from('messages').insert({
          conversation_id: context.conversationId,
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
          .eq('id', context.conversationId);
        if (error) throw new Error(error.message);
        return;
      }

      case 'assign_team': {
        const teamId = action.config?.teamId;
        if (!teamId) throw new Error('assign_team: config.teamId missing');
        const { error } = await db
          .from('conversations')
          .update({ assigned_team_id: teamId })
          .eq('id', context.conversationId);
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
        contact.tags = next; // keep in-memory view in sync
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
        const waMessageId = await this.sendWhatsAppTemplate(contact.phone, name, language);
        await db.from('messages').insert({
          conversation_id: context.conversationId,
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
        throw new Error(`Unknown action type: ${(action as AutomationAction).type}`);
    }
  }

  // ── Logging helper ───────────────────────────────────────────────────

  private async logRule(
    ruleId: string | null,
    conversationId: string,
    result: 'success' | 'failed',
    errorMessage: string | null,
  ): Promise<void> {
    try {
      const db = this.supabaseService.getClient();
      await db.from('automation_logs').insert({
        rule_id: ruleId,
        conversation_id: conversationId,
        result,
        error_message: errorMessage,
      });
    } catch {
      /* swallow — never crash the webhook */
    }
  }

  // ── Meta API helpers ─────────────────────────────────────────────────

  private async sendWhatsAppText(to: string, body: string): Promise<string | null> {
    const phoneNumberId = this.config.getOrThrow<string>('META_PHONE_NUMBER_ID');
    const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const { data } = await firstValueFrom(
      this.httpService.post(
        url,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );
    return (data as { messages?: { id: string }[] })?.messages?.[0]?.id ?? null;
  }

  private async sendWhatsAppTemplate(
    to: string,
    name: string,
    language: string,
  ): Promise<string | null> {
    const phoneNumberId = this.config.getOrThrow<string>('META_PHONE_NUMBER_ID');
    const accessToken = this.config.getOrThrow<string>('META_ACCESS_TOKEN');
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const { data } = await firstValueFrom(
      this.httpService.post(
        url,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name,
            language: { code: language },
            components: [],
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );
    return (data as { messages?: { id: string }[] })?.messages?.[0]?.id ?? null;
  }

  // ── Business hours helper (unchanged) ────────────────────────────────

  /**
   * Delegates to SettingsService (which reads from app_settings
   * with a 30-second cache).
   */
  isOutsideBusinessHours(): Promise<boolean> {
    return this.settingsService.isOutsideBusinessHours();
  }
}
