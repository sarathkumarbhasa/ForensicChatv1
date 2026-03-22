import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Paperclip, Shield, Globe, Download, Loader2 } from 'lucide-react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import ChatBubble from '../components/ChatBubble';
import { API_BASE_URL } from '../config.js';

export default function Chat() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataUploaded, setDataUploaded] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [language, setLanguage] = useState('en');
  const [isExporting, setIsExporting] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleExportReport = () => {
    if (!dataUploaded || messages.length === 0) return;
    setIsExporting(true);

    try {
      const now = new Date().toLocaleString();
      const sessionLabel = sessionId.slice(0, 8).toUpperCase();

      // Collect all Q&A pairs from chat history
      const qaItems = [];
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.sender === 'user') {
          const next = messages[i + 1];
          qaItems.push({
            query: msg.text,
            answer: next?.result?.answer || next?.text || '',
            data: next?.result?.data || [],
            chart_type: next?.result?.chart_type || '',
            timestamp: new Date(msg.timestamp).toLocaleTimeString()
          });
        }
      }

      const renderTable = (data, chartType) => {
        if (!data || data.length === 0 || chartType === 'network') return '';
        const headers = Object.keys(data[0]);
        return `
          <table>
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${data.slice(0, 50).map(row =>
              `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
            ).join('')}</tbody>
          </table>
          ${data.length > 50 ? `<p class="note">Showing 50 of ${data.length} records.</p>` : ''}
        `;
      };

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>ForensicChat Investigation Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; }
    .cover { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); color: white; padding: 60px 50px 40px; min-height: 200px; }
    .cover h1 { font-size: 28px; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 6px; }
    .cover p { font-size: 13px; opacity: 0.7; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; font-size: 11px; padding: 4px 12px; margin-top: 16px; }
    .content { padding: 40px 50px; max-width: 900px; margin: 0 auto; }
    .query-block { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); page-break-inside: avoid; }
    .query-header { background: #f1f5f9; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .query-text { font-weight: 700; font-size: 14px; color: #0f172a; }
    .query-time { font-size: 11px; color: #94a3b8; }
    .query-number { font-size: 11px; font-weight: 600; color: #2563eb; background: #dbeafe; padding: 2px 10px; border-radius: 999px; }
    .answer { padding: 16px 20px; font-size: 13px; color: #334155; line-height: 1.6; border-bottom: 1px solid #f1f5f9; font-style: italic; }
    .table-wrap { padding: 0 20px 20px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #f8fafc; text-align: left; padding: 8px 12px; color: #475569; font-weight: 700; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; }
    td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafafa; }
    .note { font-size: 11px; color: #94a3b8; padding: 6px 0; }
    .empty { padding: 16px 20px; font-size: 13px; color: #94a3b8; font-style: italic; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 30px; border-top: 1px solid #e2e8f0; margin-top: 20px; }
    @media print { body { background: white; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>🔍 ForensicChat Investigation Report</h1>
    <p>Generated: ${now}</p>
    <p>Session: ${sessionLabel}</p>
    <p>Dataset: ${metadata?.row_count?.toLocaleString() || '?'} records · ${metadata?.columns?.join(', ') || ''}</p>
    <div class="badge">CONFIDENTIAL — LAW ENFORCEMENT USE ONLY</div>
  </div>

  <div class="content">
    <h2 style="font-size:15px;color:#475569;margin-bottom:24px;font-weight:600;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
      ${qaItems.length} Analytic Quer${qaItems.length === 1 ? 'y' : 'ies'} in This Session
    </h2>

    ${qaItems.length === 0 ? '<p style="color:#94a3b8;font-style:italic;">No queries found in this session.</p>' : 
      qaItems.map((item, idx) => `
      <div class="query-block">
        <div class="query-header">
          <span class="query-number">Q${idx + 1}</span>
          <span class="query-text">${item.query}</span>
          <span class="query-time">${item.timestamp}</span>
        </div>
        ${item.answer ? `<div class="answer">${item.answer.replace(/\n/g, '<br/>')}</div>` : ''}
        ${item.data && item.data.length > 0 && item.chart_type !== 'network'
          ? `<div class="table-wrap">${renderTable(item.data, item.chart_type)}</div>`
          : item.chart_type === 'network' ? '<div class="empty">Network graph — data not exportable in table format.</div>'
          : '<div class="empty">No tabular data for this query.</div>'
        }
      </div>
    `).join('')}
  </div>

  <div class="footer">ForensicChat · Telecom Intelligence Platform · ${now}</div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      // Trigger print dialog after load for instant PDF saving
      if (win) {
        win.onload = () => {
          setTimeout(() => win.print(), 600);
        };
      }
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadSuccess = (data) => {
    setDataUploaded(true);
    setMetadata(data.metadata);
    setMessages([
      {
        id: Date.now(),
        sender: 'system',
        text: `Successfully processed ${data.metadata.row_count.toLocaleString()} rows. What would you like to know?`,
        timestamp: Date.now()
      }
    ]);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // In production, point to real FastAPI backend
      const response = await axios.post(`${API_BASE_URL}/api/query`, {
        session_id: sessionId,
        query: userMsg.text,
        language: language
      });

      const sysMsg = {
        id: Date.now() + 1,
        sender: 'system',
        result: response.data,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, sysMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'system',
        result: { error: error.response?.data?.detail || 'Failed to connect to analytics engine.' },
        timestamp: Date.now()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#0A1628] text-white flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-white/10 flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <span className="font-bold tracking-tight">ForensicChat</span>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Session Info</div>
          <div className="bg-white/5 rounded-lg p-3 text-sm text-slate-300 mb-6">
            <p className="truncate text-xs text-slate-500 mb-1">ID: {sessionId}</p>
            {metadata ? (
              <>
                <p className="text-emerald-400 flex items-center mt-2"><span className="h-2 w-2 rounded-full bg-emerald-400 mr-2"></span>Data Active</p>
                <p className="mt-1">{metadata.row_count.toLocaleString()} rows</p>
              </>
            ) : (
              <p className="text-amber-400 flex items-center mt-2"><span className="h-2 w-2 rounded-full bg-amber-400 mr-2"></span>Awaiting Upload</p>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Language</div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="te">Telugu (తెలుగు)</option>
          </select>
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleExportReport}
            disabled={!dataUploaded || isExporting}
            className={`w-full flex items-center justify-center space-x-2 text-sm py-2 rounded-lg transition-colors ${
              dataUploaded && !isExporting
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-white/5 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC]">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="font-semibold text-slate-800">Investigation Workspace</h2>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Globe className="h-4 w-4" />
            <span>Secure Connection</span>
          </div>
        </header>

        {/* Chat Messages / Upload Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {!dataUploaded ? (
              <div className="mt-10">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Telecom Data</h2>
                  <p className="text-slate-500">Provide CDR, IPDR, or Tower Dump files to begin analysis.</p>
                </div>
                <FileUpload sessionId={sessionId} onUploadSuccess={handleUploadSuccess} />
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
                {isProcessing && (
                  <div className="flex justify-start mb-6">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-slate-600">Analyzing data...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSend} className="flex items-end space-x-2">
              <div className="flex-1 relative bg-slate-50 border border-slate-300 rounded-2xl focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={dataUploaded ? "Ask a question about the data..." : "Upload data first to ask questions..."}
                  disabled={!dataUploaded || isProcessing}
                  className="w-full max-h-32 min-h-[56px] bg-transparent border-none focus:ring-0 resize-none py-4 pl-4 pr-12 text-slate-800 placeholder-slate-400"
                  rows={1}
                />
                <button 
                  type="button"
                  disabled={!dataUploaded}
                  className="absolute right-3 bottom-3 p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!input.trim() || !dataUploaded || isProcessing}
                className="h-14 w-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-colors shadow-sm"
              >
                <Send className="h-5 w-5 ml-1" />
              </button>
            </form>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400">ForensicChat uses deterministic algorithms. No LLM hallucination risk.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
