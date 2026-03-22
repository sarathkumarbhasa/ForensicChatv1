import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Database, Zap, Download, Table as TableIcon, ShieldAlert } from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function ResultCard({ result }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!result) return null;

  const isDataBacked = result.label === 'DATA-BACKED' || !result.error;

  const handleExportCSV = () => {
    if (!result.data || result.data.length === 0) return;
    
    // Skip network chart data (nested structure)
    const data = result.chart_type === 'network' ? [] : result.data;
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          // Wrap in quotes if contains commas or newlines
          return String(val).includes(',') ? `"${val}"` : val;
        }).join(',')
      )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forensichat_${result.intent || 'export'}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (result.error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 font-medium px-4 py-3 rounded-xl flex items-center mb-4">
          <ShieldAlert className="h-5 w-5 mr-3" />
          {result.error}
        </div>
      );
    }
    
    if (!result.data || result.data.length === 0) {
      return <p className="text-sm text-slate-500 mt-4 italic text-center">No matching records found in dataset.</p>;
    }
    
    switch (result.chart_type) {
      case 'bar':
        return (
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={Object.keys(result.data[0])[0]} tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                {Object.keys(result.data[0]).slice(1).map((key, i) => (
                    <Bar key={key} dataKey={key} fill={i === 0 ? "#2563EB" : "#9333EA"} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'timeline':
        return (
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={Object.keys(result.data[0])[0]} tick={{fontSize: 10}} />
                <YAxis tick={{fontSize: 10}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey={Object.keys(result.data[0])[1]} stroke="#2563EB" strokeWidth={3} dot={{r: 4, fill: '#2563EB', strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case 'table':
        const columns = Object.keys(result.data[0]);
        return (
          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 font-bold">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-4 py-3 text-slate-600 uppercase tracking-tight">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {result.data.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {columns.map(col => (
                      <td key={col} className="px-4 py-2 text-slate-700 truncate max-w-[150px]">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'network':
        return (
          <div className="h-80 w-full mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
             <NetworkGraph data={result.data[0]} />
          </div>
        );
      default:
        return <p className="text-sm text-slate-500 mt-4 italic">Unsupported visual format.</p>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden w-full max-w-2xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 text-sm">{result.title}</h3>
        
        {/* Label Badge */}
        <div className={`flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider
          ${isDataBacked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}
        `}>
          {isDataBacked ? <Database className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
          {result.label}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {renderChart()}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-4">
          <span>Rows analyzed: <strong className="text-slate-700">{result.row_count?.toLocaleString() || 0}</strong></span>
          <span>Time: {new Date(result.timestamp).toLocaleTimeString()}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Accuracy Score Badge */}
          {result.accuracy_score !== undefined && (
            <div 
              className="relative group flex items-center space-x-1 cursor-help"
              title={result.accuracy_reasons?.join(' · ')}
            >
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                result.accuracy_color === 'green' ? 'bg-emerald-100 text-emerald-700' :
                result.accuracy_color === 'amber' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                <span>{result.accuracy_score}%</span>
                <span>Accuracy · {result.accuracy_label}</span>
              </div>
              {/* Tooltip on hover */}
              <div className="absolute bottom-6 right-0 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded-lg px-3 py-2 w-56 shadow-xl z-50">
                {result.accuracy_reasons?.map((r, i) => (
                  <div key={i} className="flex items-start space-x-1 mb-1 last:mb-0">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.type !== 'table' && (
            <button 
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center hover:text-blue-600 transition-colors"
            >
              <TableIcon className="w-3.5 h-3.5 mr-1" />
              Raw Data
            </button>
          )}
          <button 
            onClick={handleExportCSV}
            disabled={!result.data || result.data.length === 0 || result.chart_type === 'network'}
            className="flex items-center hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Raw Data Expansion */}
      {showRaw && result.type !== 'table' && result.data && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 max-h-60 overflow-y-auto text-xs">
          <pre className="text-slate-600">{JSON.stringify(result.data.slice(0, 5), null, 2)}</pre>
          {result.data.length > 5 && <p className="text-slate-400 mt-2 italic">...and {result.data.length - 5} more records</p>}
        </div>
      )}
    </div>
  );
}
