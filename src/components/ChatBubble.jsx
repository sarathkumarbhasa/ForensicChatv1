import React from 'react';
import { User, ShieldAlert } from 'lucide-react';
import ResultCard from './ResultCard';

export default function ChatBubble({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
          ${isUser ? 'bg-blue-600 ml-3' : 'bg-slate-800 mr-3'}
        `}>
          {isUser ? <User className="h-5 w-5 text-white" /> : <ShieldAlert className="h-5 w-5 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {message.text && (
            <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm
              ${isUser 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }
            `}>
              {message.text}
            </div>
          )}

          {/* Plain English Answer */}
          {message.result && message.result.answer && (
            <div className="bg-white text-slate-800 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm text-sm mb-2 max-w-2xl">
              {message.result.answer}
            </div>
          )}

          {/* Result Card (if any) */}
          {message.result && !message.result.error && message.result.data && message.result.data.length > 0 && (
            <div className="mt-1 w-full">
              <ResultCard result={message.result} />
            </div>
          )}

          {/* Error/Clarification */}
          {message.result && message.result.error && (
            <div className="mt-2 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl rounded-tl-none text-sm shadow-sm">
              {message.result.error}
            </div>
          )}
          
          <span className="text-xs text-slate-400 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
      </div>
    </div>
  );
}
