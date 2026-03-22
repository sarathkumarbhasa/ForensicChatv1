import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function FileUpload({ sessionId, onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    // Show "waking up" message after 5 seconds
    const wakeTimer = setTimeout(() => {
      setError('⏳ Backend is waking up (Render cold start). This can take 30–60 seconds. Please wait...');
    }, 5000);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://forensichat-backend.onrender.com';
      const response = await axios.post(`${apiUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minute timeout for Render cold starts
        onUploadProgress: (progressEvent) => {
          clearTimeout(wakeTimer);
          setError(null);
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      clearTimeout(wakeTimer);
      onUploadSuccess(response.data);
    } catch (err) {
      clearTimeout(wakeTimer);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('⏱️ Request timed out. The backend may still be waking up — please try uploading again in 30 seconds.');
      } else {
        setError(err.response?.data?.detail || `Upload failed: ${err.message || 'Please ensure the backend is running.'}`);
      }
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
    </div>
  );
}
