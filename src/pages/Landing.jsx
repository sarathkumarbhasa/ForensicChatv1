import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, MessageSquare, CheckCircle, ArrowRight, FileSpreadsheet, Activity, Network } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const startSession = () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    navigate(`/chat/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0A1628]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold tracking-tight">ForensicChat</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs font-medium text-slate-400 border border-white/10 rounded-full px-3 py-1">
              <span>EN</span> <span className="text-white/20">|</span> <span>TE</span> <span className="text-white/20">|</span> <span>HI</span>
            </div>
            <button onClick={startSession} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Login
            </button>
            <button 
              onClick={startSession}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Enter as Guest
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-xs font-medium text-blue-400 tracking-wide uppercase">Law Enforcement Intelligence Tool</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Turn 3 hours of Excel work <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            into a 2-minute conversation.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Upload CDRs, IPDRs, and Tower Dumps. Ask questions in natural language. Get deterministic, data-backed answers instantly. Zero hallucination risk.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={startSession}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-900/20"
          >
            <span>Start Investigation</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-12 flex items-center justify-center space-x-6 text-sm text-slate-500 font-medium">
          <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> CDR</span>
          <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> IPDR</span>
          <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Tower Dump</span>
        </div>
      </main>

      {/* Features Grid */}
      <section className="border-t border-white/5 bg-[#0D1B2A] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <div className="bg-[#112236] border border-white/5 p-8 rounded-2xl hover:border-blue-500/30 transition-colors">
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <Upload className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Upload Datasets</h3>
              <p className="text-slate-400 leading-relaxed">
                Drag and drop raw Excel or CSV files. The system automatically detects schemas, cleans data, and prepares it for analysis.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#112236] border border-white/5 p-8 rounded-2xl hover:border-blue-500/30 transition-colors">
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Ask Questions</h3>
              <p className="text-slate-400 leading-relaxed">
                Query the data in English, Hindi, or Telugu. "Who did 9876543210 call the most?" or "Show late night calls."
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#112236] border border-white/5 p-8 rounded-2xl hover:border-blue-500/30 transition-colors">
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Get Verified Answers</h3>
              <p className="text-slate-400 leading-relaxed">
                Receive deterministic charts, tables, and network graphs. Every result is strictly calculated from the uploaded data.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
