'use client';

import { useState } from 'react';
import ConversationList from '@/components/inbox/ConversationList';
import ChatWindow from '@/components/inbox/ChatWindow';

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On mobile, track whether to show chat panel
  const [mobileShowChat, setMobileShowChat] = useState(false);

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileShowChat(true);
  }

  function handleBack() {
    setMobileShowChat(false);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — conversation list */}
      <div
        className={`
          flex-shrink-0 w-full md:w-80
          ${mobileShowChat ? 'hidden md:flex' : 'flex'}
          flex-col
        `}
      >
        <ConversationList selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* Right panel — chat window */}
      <div
        className={`
          flex-1 min-w-0
          ${!mobileShowChat ? 'hidden md:flex' : 'flex'}
          flex-col
        `}
      >
        {selectedId ? (
          <ChatWindow
            key={selectedId}
            conversationId={selectedId}
            onBack={handleBack}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Select a conversation</p>
        <p className="text-xs text-gray-400 mt-1">
          Choose a conversation from the list to start chatting
        </p>
      </div>
    </div>
  );
}
