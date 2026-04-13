export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'sticker';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'open' | 'assigned' | 'resolved' | 'archived';
export type AgentRole = 'admin' | 'agent';
export type AgentAvailability = 'online' | 'away' | 'offline';
export type AttachmentFileType = 'image' | 'video' | 'audio' | 'document';
export type AutomationResult = 'success' | 'failed';
export interface Team {
    id: string;
    name: string;
    description: string | null;
    color: string;
    created_at: string;
}
export interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: AgentRole;
    team_id: string | null;
    availability: AgentAvailability;
    max_chats: number;
    created_at: string;
}
export interface Campaign {
    id: string;
    name: string;
    channel: string | null;
    source: string | null;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    created_by: string | null;
    created_at: string;
}
export interface Contact {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    company: string | null;
    channel: string | null;
    source: string | null;
    campaign_id: string | null;
    tags: string[];
    pipeline_stage: string;
    deal_value: number | null;
    assigned_agent_id: string | null;
    created_at: string;
    last_seen_at: string | null;
}
export interface Conversation {
    id: string;
    contact_id: string;
    wa_conversation_id: string | null;
    status: ConversationStatus;
    assigned_agent_id: string | null;
    assigned_team_id: string | null;
    channel: string | null;
    last_message_at: string | null;
    created_at: string;
}
export interface Message {
    id: string;
    conversation_id: string;
    wa_message_id: string | null;
    direction: MessageDirection;
    type: MessageType;
    content: string | null;
    media_url: string | null;
    media_mime: string | null;
    extracted_text: string | null;
    sent_by: string | null;
    status: MessageStatus;
    created_at: string;
}
export interface WaTemplate {
    id: string;
    meta_id: string;
    name: string;
    category: string | null;
    status: string | null;
    language: string | null;
    components: Record<string, unknown> | null;
    last_synced_at: string;
}
export interface InternalTemplate {
    id: string;
    title: string;
    content: string;
    category: string | null;
    language: string;
    trigger_rule: Record<string, unknown> | null;
    is_auto: boolean;
    created_by: string | null;
    created_at: string;
}
export interface Attachment {
    id: string;
    message_id: string;
    contact_id: string | null;
    file_name: string | null;
    file_type: AttachmentFileType | null;
    mime_type: string | null;
    storage_path: string | null;
    file_size: number | null;
    extracted_text: string | null;
    media_url: string | null;
    created_at: string;
}
export interface ReadyDoc {
    id: string;
    title: string;
    content: string;
    category: string | null;
    language: string;
    created_by: string | null;
    created_at: string;
}
export type AutomationTriggerType = 'message_received' | 'conversation_opened' | 'conversation_resolved' | 'keyword_match' | 'no_reply_timeout';
export type AutomationConditionField = 'contact.channel' | 'contact.source' | 'contact.tags' | 'message.content' | 'conversation.assigned_agent_id' | 'conversation.assigned_team_id';
export type AutomationConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
export interface AutomationCondition {
    field: AutomationConditionField;
    operator: AutomationConditionOperator;
    value: string;
}
export type AutomationActionType = 'send_message' | 'assign_agent' | 'assign_team' | 'add_tag' | 'change_stage' | 'send_wa_template';
export interface AutomationAction {
    type: AutomationActionType;
    config: {
        message?: string;
        agentId?: string;
        teamId?: string;
        tag?: string;
        stage?: string;
        templateName?: string;
        templateLanguage?: string;
    };
}
export interface AutomationTriggerConfig {
    keyword?: string;
    timeout_minutes?: number;
}
export interface AutomationRule {
    id: string;
    name: string;
    is_active: boolean;
    trigger_type: AutomationTriggerType;
    trigger_config: AutomationTriggerConfig;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    last_run_at: string | null;
    created_by: string | null;
    created_at: string;
}
export interface AutomationLog {
    id: string;
    rule_id: string | null;
    conversation_id: string;
    result: AutomationResult;
    error_message: string | null;
    created_at: string;
}
