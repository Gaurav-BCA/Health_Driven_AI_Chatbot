import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Activity, Clock, HeartPulse, Heart, Thermometer, Droplet, Bot, Bug, Stethoscope, MessageSquarePlus, Sparkles, User, LogOut } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Home = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check auth status
        const checkAuth = () => {
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                } else if (localStorage.getItem('guestMode')) {
                    setUser({ name: 'Guest User' });
                }
            } catch (e) {
                console.error("Auth check failed", e);
            }
        };

        checkAuth();
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guestMode');
        setUser(null);
        navigate('/');
    };

    const handleTopicClick = (topicName) => {
        console.log(`User selected topic: ${topicName}`);
        navigate('/chat', { state: { initialQuery: `Tell me about ${topicName}` } });
    };

    const topics = [
        { name: "Dengue Awareness", icon: <Bug />, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", hoverBg: "hover:bg-red-100 dark:hover:bg-red-900/30" },
        { name: "Malaria Guide", icon: <Shield />, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30" },
        { name: "Diabetes Care", icon: <Droplet />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/30" },
        { name: "Viral Fever", icon: <Thermometer />, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/30" },
        { name: "Hypertension", icon: <Activity />, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20", hoverBg: "hover:bg-violet-100 dark:hover:bg-violet-900/30" },
        { name: "Tuberculosis", icon: <Stethoscope />, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20", hoverBg: "hover:bg-pink-100 dark:hover:bg-pink-900/30" }
    ];

    return (
        <div className="bg-gradient-to-b from-white to-slate-50 min-h-screen dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
            {/* Navbar */}
            <nav className="navbar flex items-center justify-between px-6 h-20 w-full z-50 sticky top-0 bg-white border-b border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                {/* Left Side: Logo */}
                <div className="flex items-center gap-4 animate-slide-down">
                    <div className="bg-gradient-to-br from-green-500 to-green-700 p-2 rounded-xl shadow-lg icon-container">
                        <HeartPulse className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-green-700 dark:text-green-500 leading-tight tracking-tight">Arogya AI</h1>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.15em] uppercase">Health Companion</p>
                    </div>
                </div>

                {/* Center & Right Side: Conditional Rendering based on Auth */}
                {user ? (
                    <>
                        {/* Center: Navigation (Authenticated) */}
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg animate-slide-down delay-75">
                            <div className="px-6 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                                Home
                            </div>
                            <Link
                                to="/chat"
                                className="px-6 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-green-400 hover:shadow-sm transition-all"
                            >
                                Chat
                            </Link>
                        </div>

                        {/* Right: User Profile & Sign Out (Authenticated) */}
                        <div className="flex items-center gap-6 animate-slide-down delay-100">
                            <ThemeToggle />
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">
                                        {user.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {localStorage.getItem('guestMode') ? 'Guest Mode' : 'Online'}
                                    </p>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-all text-sm font-semibold group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 group-hover:stroke-red-600 dark:group-hover:stroke-red-400 transition-colors" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </>
                ) : (
                    /* Right Side: Public Navigation */
                    <div className="flex items-center gap-3 animate-slide-down delay-100">
                        <ThemeToggle />
                        <Link
                            to="/"
                            className="hidden md:flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2.5 rounded-xl font-semibold hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-300 hover:shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Home
                        </Link>
                        <Link
                            to="/login"
                            className="bg-slate-900 dark:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <main className="max-w-6xl mx-auto text-center px-6 pt-12 pb-20">
                {/* Badge */}
                <div className="animate-slide-up inline-block">
                    <div className="hero-badge inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold mb-10 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:shadow-slate-900">
                        <Shield className="w-4 h-4" />
                        <span className="tracking-wide">Trusted Health Information</span>
                    </div>
                </div>

                {/* Main Heading */}
                <h1 className="animate-slide-up delay-100 text-5xl md:text-7xl font-black hero-title mb-8 leading-[1.1] text-slate-900 dark:text-white">
                    Your Personal <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">Health</span><br />
                    <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">Awareness</span> Companion
                </h1>

                {/* Subheading */}
                <p className="animate-slide-up delay-200 text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-14 max-w-2xl mx-auto leading-relaxed font-medium">
                    Discover accurate, simple, and reliable information about common diseases.
                    Arogya AI is designed to empower you with knowledge for a healthier life.
                </p>

                {/* Feature Cards */}
                <div className="animate-slide-up delay-300 grid grid-cols-1 md:grid-cols-3 gap-6 mb-14 max-w-5xl mx-auto">
                    {/* Card 1 - AI Insights */}
                    <div className="feature-card p-8 flex flex-col items-center group dark:bg-slate-800 dark:border dark:border-slate-700">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-5 rounded-2xl mb-6 text-green-600 dark:text-green-400 icon-container">
                            <Bot className="w-9 h-9" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                            AI-Driven Insights
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                            Instant, clear guidance on symptoms and prevention based on WHO standards.
                        </p>
                    </div>

                    {/* Card 2 - Privacy */}
                    <div className="feature-card p-8 flex flex-col items-center group dark:bg-slate-800 dark:border dark:border-slate-700">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-2xl mb-6 text-blue-600 dark:text-blue-400 icon-container">
                            <Shield className="w-9 h-9" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            Privacy First
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                            We don't store your personal health data. Secure and anonymous usage.
                        </p>
                    </div>

                    {/* Card 3 - History */}
                    <div className="feature-card p-8 flex flex-col items-center group dark:bg-slate-800 dark:border dark:border-slate-700">
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-5 rounded-2xl mb-6 text-purple-600 dark:text-purple-400 icon-container">
                            <Clock className="w-9 h-9" strokeWidth={2.5} />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                            History Sync
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                            Optionally log in with multiple accounts to save and access your past queries.
                        </p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="animate-slide-up delay-400 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => navigate('/chat')}
                        className="btn-primary px-10 py-4 text-lg flex items-center gap-3 relative z-10 dark:bg-green-600 dark:hover:bg-green-700"
                    >
                        <Sparkles className="w-5 h-5" />
                        <span>Start a New Chat</span>
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-secondary px-10 py-4 text-lg dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                    >
                        Log In to Save History
                    </button>
                </div>
            </main>

            {/* Health Topics Section */}
            <section className="bg-gradient-to-b from-slate-50 to-white py-24 px-6 relative overflow-hidden dark:from-slate-900 dark:to-slate-950">
                {/* Decorative Background Blobs */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 dark:bg-green-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 animate-blob animation-delay-2000"></div>

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                                Common Health Topics
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">Explore trusted information on widespread conditions</p>
                        </div>
                        <span className="text-green-600 dark:text-green-400 text-sm font-bold flex items-center gap-2 cursor-pointer hover:gap-3 transition-all group">
                            View all topics
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </span>
                    </div>

                    {/* Topic Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topics.map((topic, i) => (
                            <div
                                key={i}
                                onClick={() => handleTopicClick(topic.name)}
                                className="topic-card p-7 flex items-center gap-4 group dark:bg-slate-800 dark:border dark:border-slate-700"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className={`p-4 rounded-2xl ${topic.bg} ${topic.color} topic-icon-wrapper ${topic.hoverBg} transition-colors`}>
                                    {React.cloneElement(topic.icon, { size: 28, strokeWidth: 2.5 })}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                                        {topic.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Symptoms & Prevention
                                    </p>
                                </div>
                                <svg
                                    className="w-5 h-5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 dark:bg-black text-slate-400 py-16 px-6 relative overflow-hidden">
                {/* Decorative Grid Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '50px 50px'
                    }}></div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    {/* Logo */}
                    <div className="inline-flex items-center gap-4 mb-8 text-left">
                        <div className="bg-gradient-to-br from-green-500 to-green-700 p-2 rounded-xl shadow-lg">
                            <HeartPulse className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-extrabold text-green-400 leading-none tracking-tight">Arogya AI</h1>
                            <span className="text-[10px] text-slate-400 font-bold tracking-[0.15em] uppercase">Health Companion</span>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="border-t border-slate-800 pt-8 mb-10">
                        <h4 className="text-white font-bold mb-4 text-lg">Medical Disclaimer</h4>
                        <p className="text-sm leading-relaxed text-slate-500 max-w-2xl mx-auto">
                            Arogya AI provides information for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                        </p>
                    </div>

                    {/* Footer Links */}
                    <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <span className="text-slate-700">•</span>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <span className="text-slate-700">•</span>
                        <a href="#" className="hover:text-white transition-colors">Contact Support</a>
                    </div>

                    {/* Copyright */}
                    <div className="text-xs text-slate-600">
                        © 2026 Arogya AI • Public Health Initiative • Built for a healthier India 🇮🇳
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
