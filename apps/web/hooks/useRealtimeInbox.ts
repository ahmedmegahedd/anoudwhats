'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, Conversation } from '@anoud-job/types';

interface UseRealtimeInboxOptions {
  conversationId: string | null;
  onNewMessage?: (message: Message) => void;
  onConversationUpdate?: (conversation: Conversation) => void;
}

export function useRealtimeInbox({
  conversationId,
  onNewMessage,
  onConversationUpdate,
}: UseRealtimeInboxOptions): void {
  // Stable refs so we don't re-subscribe when inline callbacks change identity
  const onNewMessageRef = useRef(onNewMessage);
  const onConversationUpdateRef = useRef(onConversationUpdate);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onConversationUpdateRef.current = onConversationUpdate;
  }, [onConversationUpdate]);

  // ── Messages subscription (scoped to active conversation) ─────────────────
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessageRef.current?.(payload.new as Message);
        },
      )
      // Also subscribe to status UPDATEs on this conversation's messages
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Re-use onNewMessage to signal a full refresh isn't needed —
          // ChatWindow will handle the diff by id
          onNewMessageRef.current?.(payload.new as Message);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ── Conversations subscription (global, for list updates) ─────────────────
  useEffect(() => {
    if (!onConversationUpdate) return;

    const supabase = createClient();
    const channel = supabase
      .channel('conversations:all:updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          onConversationUpdateRef.current?.(payload.new as Conversation);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          onConversationUpdateRef.current?.(payload.new as Conversation);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — ref keeps callback fresh
}
