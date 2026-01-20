import React, { useState, useEffect, useRef } from 'react';
import { KnowledgeGraph } from '../logic/GraphModel';
import type { Language } from '../logic/translations';

interface AIAssistantProps {
    graph: KnowledgeGraph | null;
    lang: Language;
    isSidebarOpen: boolean;
    initialMessages?: Message[];
    onChatUpdate?: (messages: Message[]) => void;
    // New: Bridge for Local Engine Stats
    aiStats?: {
        loss: number;
        trainingSteps: number;
        isTraining: boolean;
    };
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
    actions?: Array<{ label: string; onClick: () => void }>;
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Typewriter Component for AI Responses
const Typewriter = ({ content, onComplete }: { content: string, onComplete?: () => void }) => {
    const [displayContent, setDisplayContent] = useState('');
    const hasCompletedForCheck = useRef(false);

    useEffect(() => {
        // Reset if content changes completely (new message), but we assume content grows or is static
        // For static content passed in, we animate from 0

        let currentIndex = 0;
        setDisplayContent('');
        hasCompletedForCheck.current = false;

        const timer = setInterval(() => {
            if (currentIndex < content.length) {
                // Adaptive speed: faster for longer content
                const chunkStr = content.slice(currentIndex, currentIndex + 3);
                setDisplayContent(prev => prev + chunkStr);
                currentIndex += 3;
            } else {
                clearInterval(timer);
                setDisplayContent(content);
                if (!hasCompletedForCheck.current) {
                    hasCompletedForCheck.current = true;
                    if (onComplete) onComplete();
                }
            }
        }, 10);

        return () => clearInterval(timer);
    }, [content]); // Re-run if content string reference changes significantly, but typically specific to new message ID

    return (
        <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 text-sm leading-relaxed
            [&>p]:mb-2 [&>p:last-child]:mb-0
            [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2
            [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2
            [&>li]:mb-1
            [&>h3]:text-indigo-600 dark:[&>h3]:text-indigo-300 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>h3]:text-base
            [&>code]:bg-slate-100 dark:[&>code]:bg-slate-700 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs [&>code]:font-mono
            [&>pre]:bg-slate-50 dark:[&>pre]:bg-slate-900 [&>pre]:p-2 [&>pre]:rounded-lg [&>pre]:my-2 [&>pre]:overflow-x-auto
            [&>strong]:text-indigo-700 dark:[&>strong]:text-indigo-200 [&>strong]:font-bold
            [&>table]:w-full [&>table]:border-collapse [&>table]:my-2 [&>table]:text-xs
            [&>th]:border [&>th]:border-slate-300 dark:[&>th]:border-slate-600 [&>th]:bg-slate-100 dark:[&>th]:bg-slate-800 [&>th]:p-1
            [&>td]:border [&>td]:border-slate-300 dark:[&>td]:border-slate-600 [&>td]:p-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
        </div>
    );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ graph, lang, isSidebarOpen, initialMessages = [], onChatUpdate, aiStats }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'ai',
            content: lang === 'zh'
                ? '我是 **Aether Linker**，您的工业语义增强 AI 助手。\n\n我就在这里协助您构建和优化您的 **数字孪生模型**。您可以直接与我对话，或者尝试以下指令：\n* `系统概况`\n* `优化建议`'
                : 'I am **Aether Linker**, your Industrial Semantic Enhancement AI Assistant.\n\nI am here to help you build and optimize your **Digital Twin Model**.',
            timestamp: Date.now()
        }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isFirstRun = useRef(true);

    // Sync with initialMessages from backend (only if provided and non-empty)
    useEffect(() => {
        if (initialMessages && initialMessages.length > 0) {
            setMessages(initialMessages);
        }
    }, [initialMessages]);

    // Handle updates when *local* messages change (persist to backend)
    // We use a separate effect that calls the flush callback
    useEffect(() => {
        // Skip first run to avoid re-saving initial state immediately unless user interaction happened
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (onChatUpdate) {
            onChatUpdate(messages);
        }
    }, [messages, onChatUpdate]);

    // Auto-scroll to bottom logic
    // We only auto-scroll if:
    // 1. A new message arrives (or typing starts)
    // 2. The user was ALREADY at the bottom (or close to it)
    // If the user has scrolled up to read history, we do NOT force scroll down.

    const scrollToBottom = (force = false) => {
        if (!scrollRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold

        if (force || isNearBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // Effect for new messages or thinking state
    useEffect(() => {
        // When messages change, if it's a NEW message (length increased), we generally want to scroll
        // BUT only if user was near bottom. If user is reading old history, don't jump.
        // Exception: If it's the very first load or 'isThinking' start, we might want to ensure visibility.

        // For simplicity: auto-scroll if near bottom.
        scrollToBottom();
    }, [messages, isThinking]);

    // Initial open scroll
    useEffect(() => {
        if (isOpen) {
            // Force scroll on open
            setTimeout(() => scrollToBottom(true), 100);
        }
    }, [isOpen]);

    // ... (generateId, handleSend logic remains mostly same, just ensuring we clean logic)

    // AI Interaction Logic
    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: generateId(), role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            const graphContext = graph ? {
                nodes: Array.from(graph.nodes.values()),
                edges: graph.edges
            } : { nodes: [], edges: [] };

            const apiHistory = messages.slice(-6).map(m => ({
                role: m.role,
                content: m.content
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    graphContext,
                    // Inject AI Engine Stats into Context
                    aiStats,
                    history: apiHistory
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            const aiMsg: Message = {
                id: generateId(),
                role: 'ai',
                content: data.reply,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: generateId(),
                role: 'ai',
                content: lang === 'zh' ? '抱歉，我暂时无法连接到云端大脑。' : 'Sorry, I cannot reach the cloud brain at the moment.',
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const generateId = () => `msg-${Date.now()}-${Math.random()}`;

    return (
        <div className={`absolute bottom-8 z-40 transition-all duration-500 ease-out flex flex-col items-end ${isSidebarOpen ? 'right-[420px]' : 'right-8'} ${isOpen ? 'w-[450px]' : 'w-auto'}`}>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-2xl rounded-2xl p-4 transition-all duration-300 hover:scale-105 active:scale-95 border border-slate-200 dark:border-slate-700 ${isOpen ? 'rounded-b-none w-full' : 'rounded-2xl'}`}
            >
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-400 animate-pulse"></div>
                        <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                </div>
                {isOpen ? (
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-sm tracking-wide">Aether Intelligence</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '语义增强引擎在线' : 'Semantic Engine Online'}</span>
                    </div>
                ) : (
                    <span className="font-bold text-sm pr-2">{lang === 'zh' ? 'AI 助手' : 'AI Assistant'}</span>
                )}
            </button>

            {/* Chat Content */}
            {isOpen && (
                <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 h-[500px]">

                    {/* Messages Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar"
                    >
                        {messages.map((msg, index) => {
                            // Only animate the very last message if it's from AI
                            const isLast = index === messages.length - 1;
                            const shouldAnimate = isLast && msg.role === 'ai';

                            return (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] rounded-2xl px-4 py-3 shadow-md ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                        ) : (
                                            shouldAnimate ? (
                                                <Typewriter content={msg.content} onComplete={() => scrollToBottom(false)} />
                                            ) : (
                                                <div className="prose prose-invert prose-sm max-w-none text-slate-200 text-sm leading-relaxed
                                                    [&>p]:mb-2 [&>p:last-child]:mb-0
                                                    [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2
                                                    [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2
                                                    [&>li]:mb-1
                                                    [&>h3]:text-indigo-300 [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>h3]:text-base
                                                    [&>code]:bg-slate-700 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs [&>code]:font-mono
                                                    [&>pre]:bg-slate-900 [&>pre]:p-2 [&>pre]:rounded-lg [&>pre]:my-2 [&>pre]:overflow-x-auto
                                                    [&>strong]:text-indigo-200 [&>strong]:font-bold
                                                    [&>table]:w-full [&>table]:border-collapse [&>table]:my-2 [&>table]:text-xs
                                                    [&>th]:border [&>th]:border-slate-600 [&>th]:bg-slate-800 [&>th]:p-1
                                                    [&>td]:border [&>td]:border-slate-600 [&>td]:p-1">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-700 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={lang === 'zh' ? "输入指令或提问..." : "Ask AI about the graph..."}
                                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm rounded-xl pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                            />
                            <button
                                onClick={handleSend}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                            <button onClick={() => setInput(lang === 'zh' ? '分析系统概况' : 'System Summary')} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors">
                                {lang === 'zh' ? '🔍 系统概况' : '🔍 System Summary'}
                            </button>
                            <button onClick={() => setInput(lang === 'zh' ? '优化建议' : 'Optimization')} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors">
                                {lang === 'zh' ? '⚡ 优化建议' : '⚡ Optimization'}
                            </button>
                            <button onClick={() => setInput(lang === 'zh' ? '异常检测' : 'Anomaly Check')} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-700 transition-colors">
                                {lang === 'zh' ? '🛡️ 异常检测' : '🛡️ Anomaly Check'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
