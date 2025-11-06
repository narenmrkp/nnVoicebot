import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChatBubbleLeftIcon } from './icons/ChatBubbleLeftIcon';


interface ChatHistorySidebarProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onNewChat: () => void;
    onSelectSession: (sessionId: string) => void;
    onDeleteSession: (sessionId: string) => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({ sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession }) => {
    
    const handleDelete = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation(); // Prevent onSelectSession from firing
        if (window.confirm('Are you sure you want to delete this chat?')) {
            onDeleteSession(sessionId);
        }
    }

    return (
        <aside className="w-64 bg-gray-50/80 backdrop-blur-sm border-r border-gray-200 flex flex-col h-full shadow-lg">
            <div className="p-4 border-b border-gray-200">
                <button 
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-100 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Chat
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
                <ul className="p-2 space-y-1">
                    {sessions.map(session => (
                        <li key={session.id}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); onSelectSession(session.id); }}
                                className={`group flex items-center justify-between w-full px-3 py-2 text-left text-sm rounded-md transition-colors ${
                                    activeSessionId === session.id 
                                    ? 'bg-purple-100 text-purple-800 font-semibold' 
                                    : 'text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <ChatBubbleLeftIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                                <span className="flex-1 truncate" title={session.title}>{session.title}</span>
                                <button onClick={(e) => handleDelete(e, session.id)} className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default ChatHistorySidebar;
