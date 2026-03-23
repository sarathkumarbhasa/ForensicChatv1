import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, AlertCircle, FlaskConical } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

export default function FileUpload({ sessionId, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);
    setUploaded(true); // Show demo banner immediately

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          setError(null);
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      onUploadSuccess(response.data);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('⏱️ Upload timed out. Please try again.');
      } else {
        setError(err.response?.data?.detail || `Upload failed: ${err.message || 'Please ensure the backend is running.'}`);
      }
      setUploaded(false); // Hide banner if it failed early
    } finally {
      setUploading(false);
    }
  }, [sessionId, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-lg font-medium text-slate-700">
          {isDragActive ? "Drop the file here..." : "Drag & drop telecom data here"}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Supports .csv, .xls, .xlsx (CDR, IPDR, Tower Dumps)
        </p>
      </div>

      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Uploading and analyzing schema...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {uploaded && (
        <div className="mt-5 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start text-amber-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <FlaskConical className={`h-5 w-5 mr-3 flex-shrink-0 mt-0.5 text-amber-500 ${uploading ? 'animate-pulse' : ''}`} />
          <div>
            <p className="font-semibold text-sm">
              {uploading ? "🏗️ Demo Version — Processing Dataset…" : "🚧 Demo Version — Ready to Query"}
            </p>
            <p className="text-xs mt-1 text-amber-700">
              {uploading 
                ? "This is an early demo. We're currently processing your file (cold starts may take 30-60s). Please stay on this page."
                : "Your dataset has been processed successfully. You can now try querying it below with natural language."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
