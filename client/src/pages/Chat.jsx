import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Shield, Droplet, Bug, Activity, LogOut, HeartPulse, User, Paperclip, Mic, X, Bot, Settings, Volume2, VolumeX, MapPin } from 'lucide-react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThemeToggle from '../components/ThemeToggle';

const Chat = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [chatHistory, setChatHistory] = useState([]);
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const activeChatId = searchParams.get('chatId');
    // Helper to update active chat ID via URL
    const setActiveChatId = (id) => {
        setSearchParams(prev => {
            if (id) {
                prev.set('chatId', id);
                return prev;
            } else {
                const newParams = new URLSearchParams(prev);
                newParams.delete('chatId');
                return newParams;
            }
        }, { replace: false });
    };
    const [user, setUser] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [historyRetention, setHistoryRetention] = useState(() => {
        return localStorage.getItem('deviceHistoryRetention') || 'off';
    });
    const [lowBandwidthMode, setLowBandwidthMode] = useState(() => {
        return localStorage.getItem('lowBandwidthMode') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('lowBandwidthMode', lowBandwidthMode);
    }, [lowBandwidthMode]);

    // Voice Recognition Setup
    const [isListening, setIsListening] = useState(false);
    const [voiceLang, setVoiceLang] = useState('en-US');
    const recognitionRef = useRef(null);

    // Text-to-Speech Setup
    const [speakingMessageId, setSpeakingMessageId] = useState(null);
    const [voices, setVoices] = useState([]);
    const synth = window.speechSynthesis;

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(prev => prev + ' ' + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => setIsListening(false);
        }

        // Load voices
        const loadVoices = () => {
            setVoices(synth.getVoices());
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Cleanup speech synthesis on unmount
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const toggleVoiceInput = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (recognitionRef.current) {
                recognitionRef.current.lang = voiceLang;
            }
            setIsListening(true);
            recognitionRef.current?.start();
        }
    };

    const handleSpeak = (text, messageIndex) => {
        if (speakingMessageId === messageIndex) {
            synth.cancel();
            setSpeakingMessageId(null);
        } else {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => setSpeakingMessageId(null);

            // Auto-detect Hindi (Devanagari) script to use appropriate voice
            const hasHindiChars = /[\u0900-\u097F]/.test(text);
            if (hasHindiChars) {
                utterance.lang = 'hi-IN';
                // Try to find a better quality Hindi voice
                const hindiVoice = voices.find(v => v.name.includes('Google Hindi'))
                    || voices.find(v => v.name.includes('Microsoft Hemant'))
                    || voices.find(v => v.name.includes('Microsoft Kalpana'))
                    || voices.find(v => v.lang === 'hi-IN' && v.name.includes('Google'))
                    || voices.find(v => v.lang === 'hi-IN');
                if (hindiVoice) {
                    utterance.voice = hindiVoice;
                }
            }

            synth.speak(utterance);
            setSpeakingMessageId(messageIndex);
        }
    };

    // Stop speaking when switching chats or navigating
    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setSpeakingMessageId(null);
        }

        // Clear messages if switching to new chat
        if (!activeChatId) {
            setMessages([]);
        }
    }, [activeChatId]);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Auth & Initial Load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        const guestMode = localStorage.getItem('guestMode');

        if (!token && !guestMode) {
            navigate('/login');
            return;
        }

        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            if (parsedUser.historyRetention) {
                setHistoryRetention(parsedUser.historyRetention);
                localStorage.setItem('deviceHistoryRetention', parsedUser.historyRetention);
            }
            fetchHistory(parsedUser.id);
        }
    }, [navigate]);

    // Load active chat on mount if exists
    useEffect(() => {
        if (activeChatId) {
            loadChatMessages(activeChatId);
        } else {
            // New chat mode, no loading needed
            setIsLoadingChat(false);
        }
    }, [activeChatId]);

    // Handle initial query from Home page
    useEffect(() => {
        if (location.state?.initialQuery) {
            setInput(location.state.initialQuery);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const fetchHistory = async (userId) => {
        if (!userId) return;
        try {
            const response = await fetch(`http://localhost:5000/api/chat/history/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setChatHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    const loadChatMessages = async (chatId) => {
        setIsLoadingChat(true);
        try {
            const response = await fetch(`http://localhost:5000/api/chat/${chatId}`);
            if (!response.ok) throw new Error('Failed to load chat');
            const data = await response.json();

            setMessages(data.messages.map(m => ({
                role: m.role === 'model' ? 'bot' : 'user',
                text: m.content
            })));
        } catch (error) {
            console.error("Error loading chat:", error);
        } finally {
            setIsLoadingChat(false);
        }
    };

    const loadChatObj = (chat) => {
        setActiveChatId(chat._id);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleNewChat = () => {
        setActiveChatId(null);
        setMessages([]);
        if (window.innerWidth < 768) setSidebarOpen(false);
    };

    const handleDeleteChat = async (e, chatId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this chat?")) return;

        try {
            await fetch(`http://localhost:5000/api/chat/${chatId}`, { method: 'DELETE' });
            setChatHistory(prev => prev.filter(c => c._id !== chatId));
            if (activeChatId === chatId) handleNewChat();
        } catch (error) {
            console.error("Failed to delete chat", error);
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guestMode');
        navigate('/login');
    };

    const handleRetentionChange = async (value) => {
        setHistoryRetention(value);
        localStorage.setItem('deviceHistoryRetention', value);

        if (user && user.id) {
            try {
                const response = await fetch('http://localhost:5000/api/auth/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, historyRetention: value })
                });

                if (response.ok) {
                    // Update local user object
                    const updatedUser = { ...user, historyRetention: value };
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            } catch (error) {
                console.error("Failed to update settings", error);
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        const text = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);
        setIsTyping(true);

        try {
            const userId = user?.id || 'guest';
            const response = await fetch('http://localhost:5000/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    chatId: activeChatId,
                    userId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setIsTyping(false);
            setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);

            if (!activeChatId && data.chatId) {
                setActiveChatId(data.chatId);
                fetchHistory(userId);
            }
        } catch (error) {
            console.error('Chat Error:', error);
            setIsTyping(false);
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error. Please try again." }]);
        }
    };

    const handleCardClick = (disease) => {
        setInput(`Tell me about ${disease}`);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMessages(prev => [...prev, { role: 'user', text: `[Attached File: ${file.name}]` }]);
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                setMessages(prev => [...prev, { role: 'bot', text: `I see you've attached "${file.name}". While I can't process files directly yet, I'm ready to answer questions about it!` }]);
            }, 1500);
        }
    };

    // Helper to find hospitals
    const handleFindHospitals = () => {
        window.open('https://www.google.com/maps/search/government+hospitals+near+me', '_blank');
    };

    // Helper to parse risk level from message
    const getRiskLevel = (text) => {
        if (!text) return null;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('risk level: high') || lowerText.includes('जोखिम स्तर: उच्च')) return 'high';
        if (lowerText.includes('risk level: medium') || lowerText.includes('जोखिम स्तर: मध्यम')) return 'medium';
        if (lowerText.includes('risk level: low') || lowerText.includes('जोखिम स्तर: कम')) return 'low';
        return null;
    };

    const diseases = [
        { name: 'Dengue Information', icon: <Bug className="text-red-500" />, color: 'red' },
        { name: 'Malaria Check', icon: <Shield className="text-emerald-500" />, color: 'emerald' },
        { name: 'Diabetes Care', icon: <Droplet className="text-blue-500" />, color: 'blue' },
        { name: 'General Symptoms', icon: <Activity className="text-violet-500" />, color: 'violet' },
    ];

    return (
        <div className={`flex flex-col h-screen transition-colors duration-300 ${lowBandwidthMode ? 'bg-slate-50' : 'bg-slate-50 dark:bg-slate-950'}`}>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="space-y-4">
                                <h4 className="font-semibold text-slate-900 dark:text-white">Accessibility & Modes</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-700 dark:text-slate-200">Low Bandwidth Mode</p>
                                            <p className="text-xs text-slate-500">Text-only, no animations, fast load.</p>
                                        </div>
                                        <button
                                            onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${lowBandwidthMode ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${lowBandwidthMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Disappearing Messages
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                    Automatically delete chat history after a set period.
                                </p>
                                <div className="grid grid-cols-1 gap-3">
                                    {['off', '24h', '3d', '7d', '28d'].map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => handleRetentionChange(option)}
                                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${historyRetention === option
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 font-semibold'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-green-300 text-slate-700 dark:text-slate-200'
                                                }`}
                                        >
                                            <span className="capitalize">{option === 'off' ? 'Off (Never delete)' : option}</span>
                                            {historyRetention === option && <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 flex justify-end">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2 bg-slate-900 dark:bg-green-600 text-white rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-green-700 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-20 shadow-sm shrink-0 transition-colors duration-300">
                <div className="flex items-center gap-4 animate-slide-down">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="bg-green-600 p-2 rounded-xl hover:bg-green-700 transition-all cursor-pointer border-none outline-none shadow-sm hover:shadow-md active:scale-95 group"
                    >
                        <HeartPulse className="w-6 h-6 text-white group-hover:animate-pulse" />
                    </button>
                    <Link to="/" className="flex flex-col group">
                        <h1 className="text-xl font-extrabold text-green-700 dark:text-green-500 leading-none tracking-tight group-hover:text-green-800 transition-colors">Arogya AI</h1>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.15em] uppercase">Health Companion</span>
                    </Link>
                </div>

                <div className="hidden md:flex items-center gap-2 animate-slide-down delay-75">
                    <button
                        onClick={handleFindHospitals}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-all border border-red-200"
                    >
                        <MapPin className="w-4 h-4" />
                        Find Hospitals
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <Link to="/" className="px-6 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-green-400 hover:shadow-sm transition-all">Home</Link>
                    <div className="px-6 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 bg-white dark:bg-slate-700 rounded-md shadow-sm">Chat</div>
                </div>

                <div className="flex items-center gap-6 animate-slide-down delay-100">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <ThemeToggle />
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <User className="w-5 h-5" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">
                                {user?.name || 'Guest User'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Online</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
                    <button onClick={handleSignOut} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-lg transition-all text-sm font-semibold group" title="Sign Out">
                        <LogOut className="w-5 h-5 group-hover:stroke-red-600 dark:group-hover:stroke-red-400 transition-colors" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Container */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300`}>
                    <div className="p-4">
                        <button
                            onClick={handleNewChat}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-green-700 transition-all font-semibold shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                        {chatHistory.length === 0 && (
                            <div className="text-center text-xs text-slate-400 mt-4">No history yet</div>
                        )}
                        {chatHistory.map((chat) => (
                            <div
                                key={chat._id}
                                onClick={() => loadChatObj(chat)}
                                className={`group relative px-4 py-3 rounded-lg cursor-pointer text-sm font-medium transition-all flex items-center gap-3 ${activeChatId === chat._id
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                <span className="truncate flex-1">{chat.title || 'New Chat'}</span>
                                <button
                                    onClick={(e) => handleDeleteChat(e, chat._id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Chat Content */}
                <main className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingChat ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-6">
                                <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg mb-6 shadow-green-200 dark:shadow-green-900/20 animate-slide-up">
                                    <HeartPulse className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 animate-slide-up delay-100">
                                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0] || 'Friend'}! 👋
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mb-12 max-w-lg text-center leading-relaxed animate-slide-up delay-200">
                                    How can I help you today? I can help you identify symptoms, understand diseases, and find prevention tips.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl animate-slide-up delay-300">
                                    {diseases.map((d, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleCardClick(d.name)}
                                            className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-green-500 dark:hover:border-green-500 hover:shadow-md transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-lg bg-${d.color}-50 dark:bg-${d.color}-900/20 text-${d.color}-600 dark:text-${d.color}-400`}>
                                                    {d.icon}
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{d.name}</span>
                                            </div>
                                            <div className="text-slate-300 dark:text-slate-600 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6 max-w-3xl mx-auto">
                                {messages.map((msg, idx) => {
                                    const riskLevel = msg.role === 'bot' ? getRiskLevel(msg.text) : null;
                                    return (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up mb-6`}>
                                            <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Avatar */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    }`}>
                                                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
                                                </div>

                                                {/* Message Bubble + Banner Wrapper */}
                                                <div className="flex flex-col gap-1 w-full">
                                                    {/* Risk Banner */}
                                                    {riskLevel && (
                                                        <div className={`text-xs font-bold px-3 py-1 rounded-t-lg w-max mb-[-4px] z-10 ${riskLevel === 'high' ? 'bg-red-600 text-white' :
                                                            riskLevel === 'medium' ? 'bg-yellow-500 text-white' :
                                                                'bg-green-600 text-white'
                                                            }`}>
                                                            {(() => {
                                                                const isHindi = /[\u0900-\u097F]/.test(msg.text);
                                                                if (riskLevel === 'high') return isHindi ? '⚠️ उच्च जोखिम चेतावनी' : '⚠️ HIGH RISK ALERT';
                                                                if (riskLevel === 'medium') return isHindi ? '⚠️ मध्यम जोखिम' : '⚠️ MEDIUM RISK';
                                                                return isHindi ? '✅ रोकथाम और उपाय' : '✅ PREVENTION & CARE';
                                                            })()}
                                                        </div>
                                                    )}

                                                    <div className={`rounded-2xl px-6 py-4 shadow-sm ${msg.role === 'user'
                                                        ? 'bg-green-600 text-white rounded-br-none'
                                                        : `bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 ${riskLevel ? 'rounded-tl-none' : 'rounded-bl-none'}`
                                                        }`}>
                                                        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                                                            {msg.role === 'user' ? (
                                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                                            ) : (
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2 mt-4" {...props} />,
                                                                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-green-700 dark:text-green-400 mb-2 mt-3" {...props} />,
                                                                        h3: ({ node, ...props }) => <h3 className="text-md font-bold text-green-600 dark:text-green-500 mb-1 mt-2" {...props} />,
                                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                                        strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                                    }}
                                                                >
                                                                    {msg.text}
                                                                </ReactMarkdown>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Speaker Button - Moved OUTSIDE the wrapper to sit next to it */}
                                                {msg.role === 'bot' && (
                                                    <div className="mb-1">
                                                        <button
                                                            onClick={() => handleSpeak(msg.text, idx)}
                                                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-green-600 dark:text-slate-500 dark:hover:text-green-400 transition-colors"
                                                            title={speakingMessageId === idx ? "Stop Reading" : "Read Aloud"}
                                                        >
                                                            {speakingMessageId === idx ? (
                                                                <VolumeX className="w-4 h-4" />
                                                            ) : (
                                                                <Volume2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {isTyping && (
                                    <div className="flex justify-start animate-slide-up">
                                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-none py-4 px-5 shadow-sm flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800">
                                                <Bot className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="flex space-x-1.5">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-950 animate-slide-up delay-400 transition-colors duration-300">
                        <div className="max-w-4xl mx-auto cursor-text bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex items-center p-2 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="Attach File"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                placeholder={isListening ? (voiceLang === 'hi-IN' ? "सुन रहा हूँ..." : "Listening...") : (voiceLang === 'hi-IN' ? "अपने लक्षण लिखें..." : "Type your symptoms or health questions...")}
                                className={`flex-1 bg-transparent border-none outline-none px-4 py-2 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-medium h-12 ${isListening ? 'animate-pulse text-green-600' : ''}`}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />

                            {/* Voice Language Toggle */}
                            <button
                                onClick={() => setVoiceLang(prev => prev === 'en-US' ? 'hi-IN' : 'en-US')}
                                className="px-2 py-1 text-xs font-bold text-slate-500 hover:text-green-600 transition-colors border border-slate-200 dark:border-slate-700 rounded-md mr-1"
                                title="Switch Voice Language"
                            >
                                {voiceLang === 'hi-IN' ? 'हिन्दी' : 'EN'}
                            </button>

                            <button
                                onClick={toggleVoiceInput}
                                className={`p-3 rounded-xl transition-all mr-1 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                title="Voice Input"
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleSend}
                                className="p-3 bg-slate-900 dark:bg-green-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                disabled={!input.trim()}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-3 font-medium">
                            ⚠️ Arogya AI can make mistakes. Always consult a doctor for medical advice.
                        </p>
                    </div>
                </main>
            </div >
        </div >
    );
};

export default Chat;
