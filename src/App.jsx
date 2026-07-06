import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Settings,
  MessageSquare,
  Database,
  Terminal,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
  Eye,
  Table,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const BACKEND_URL = 'http://localhost:8000';
const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899'];

export default function App() {
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFileMetadata, setActiveFileMetadata] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // API Key & Model Config Settings
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [model, setModel] = useState('gpt-4o-mini');

  // Tabs: 'preview' or 'analyst'
  const [activeTab, setActiveTab] = useState('preview');

  // Chat/Query state
  const [queryText, setQueryText] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  
  // Chat history indexed by file_id
  const [chatHistories, setChatHistories] = useState({});
  const [expandedCodes, setExpandedCodes] = useState({});

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch file list on load
  useEffect(() => {
    fetchFiles();
  }, []);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, activeFileId]);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const fetchFilePreview = async (fileId) => {
    setFileLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/files/${fileId}/preview`);
      if (res.ok) {
        const data = await res.json();
        setActiveFileMetadata(data.metadata);
        
        // Initialize chat history for this file if not already present
        if (!chatHistories[fileId]) {
          setChatHistories(prev => ({
            ...prev,
            [fileId]: [
              {
                sender: 'ai',
                explanation: `Hello! I've analyzed **${data.filename}** (${data.metadata.rows} rows, ${data.metadata.columns_count} columns). Ask me questions to analyze, aggregate, or visualize this dataset.`,
                timestamp: new Date().toLocaleTimeString(),
                chart_suggestion: { type: 'none' }
              }
            ]
          }));
        }
      } else {
        const errData = await res.json();
        alert(`Failed to load file: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
      alert('Failed to connect to backend server. Make sure it is running on port 8000.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleFileSelect = (fileId) => {
    setActiveFileId(fileId);
    fetchFilePreview(fileId);
    setActiveTab('preview');
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await fetchFiles();
        setActiveFileId(data.file_id);
        setActiveFileMetadata(data.metadata);
        
        // Setup initial chat message
        setChatHistories(prev => ({
          ...prev,
          [data.file_id]: [
            {
              sender: 'ai',
              explanation: `Successfully uploaded **${data.filename}**! I'm ready to analyze its ${data.metadata.rows} rows of data. What would you like to explore?`,
              timestamp: new Date().toLocaleTimeString(),
              chart_suggestion: { type: 'none' }
            }
          ]
        }));
        
        setActiveTab('preview');
      } else {
        const err = await res.json();
        alert(`Upload failed: ${err.detail || 'Could not upload file'}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Network error uploading file. Verify backend is running.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (e, fileId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setFiles(prev => prev.filter(f => f.file_id !== fileId));
        if (activeFileId === fileId) {
          setActiveFileId(null);
          setActiveFileMetadata(null);
        }
        // Clean up chat
        setChatHistories(prev => {
          const updated = { ...prev };
          delete updated[fileId];
          return updated;
        });
      }
    } catch (err) {
      console.error('Delete file error:', err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
  };

  const loadSample = async (sampleType) => {
    let csvContent = '';
    let filename = '';

    if (sampleType === 'sales') {
      filename = 'company_sales_sample.csv';
      csvContent = `Date,Product,Category,Sales,Quantity,Region
2026-01-01,Wireless Mouse,Electronics,450.0,15,North
2026-01-02,Mechanical Keyboard,Electronics,899.0,10,East
2026-01-03,Leather Journal,Office Supplies,120.0,8,South
2026-01-04,Wireless Mouse,Electronics,300.0,10,West
2026-01-05,Gel Pens 12-Pack,Office Supplies,75.0,25,North
2026-01-06,Mechanical Keyboard,Electronics,1348.5,15,West
2026-01-07,Ergonomic Chair,Furniture,2450.0,5,East
2026-01-08,Leather Journal,Office Supplies,150.0,10,North
2026-01-09,Ergonomic Chair,Furniture,1960.0,4,South
2026-01-10,Gel Pens 12-Pack,Office Supplies,90.0,30,East
2026-01-11,Wireless Mouse,Electronics,600.0,20,South
2026-01-12,Mechanical Keyboard,Electronics,1798.0,20,North
2026-01-13,Ergonomic Chair,Furniture,1470.0,3,West
2026-01-14,Leather Journal,Office Supplies,225.0,15,East`;
    } else if (sampleType === 'reviews') {
      filename = 'gadget_reviews_sample.csv';
      csvContent = `Gadget,Rating,Review_Length,Recommend,Price
VaporSmart Watch,4.5,120,Yes,199.99
EchoBuds Pro,3.8,85,No,79.99
TitanTablet 10,4.2,210,Yes,349.99
VaporSmart Watch,4.8,150,Yes,199.99
LuminaProjector,4.0,95,Yes,129.99
EchoBuds Pro,4.1,65,Yes,79.99
TitanTablet 10,3.5,180,No,349.99
LuminaProjector,4.7,240,Yes,129.99
SolarPowerBank,4.9,75,Yes,39.99
SolarPowerBank,4.3,110,Yes,39.99
VaporSmart Watch,4.2,130,Yes,199.99
EchoBuds Pro,4.5,100,Yes,79.99`;
    } else {
      filename = 'employee_engagement_sample.csv';
      csvContent = `Employee_ID,Department,Tenure_Years,Satisfaction_Score,Performance_Rating
EMP001,Engineering,3,4.2,Exceeds
EMP002,Sales,1,3.5,Meets
EMP003,Marketing,5,4.8,Exceeds
EMP004,Engineering,2,3.9,Meets
EMP005,HR,4,4.5,Exceeds
EMP006,Sales,2,2.8,Meets
EMP007,Engineering,6,4.9,Exceeds
EMP008,Marketing,3,3.8,Meets
EMP009,HR,1,4.0,Meets
EMP010,Engineering,4,4.1,Meets
EMP011,Sales,3,3.9,Meets
EMP012,Engineering,5,4.6,Exceeds`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], filename, { type: 'text/csv' });
    await handleUpload(file);
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!queryText.trim() || !activeFileId || queryLoading) return;

    const userQuery = queryText;
    setQueryText('');
    setQueryLoading(true);

    // Append user query to chat feed instantly
    const userMsg = {
      sender: 'user',
      explanation: userQuery,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setChatHistories(prev => ({
      ...prev,
      [activeFileId]: [...(prev[activeFileId] || []), userMsg]
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: activeFileId,
          query: userQuery,
          openai_api_key: apiKey.trim() || null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const aiMsg = {
          sender: 'ai',
          explanation: result.explanation,
          code: result.code,
          chart_suggestion: result.chart_suggestion,
          data: result.data,
          columns: result.columns,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistories(prev => ({
          ...prev,
          [activeFileId]: [...(prev[activeFileId] || []), aiMsg]
        }));
      } else {
        // Handle error message
        const errMsg = {
          sender: 'ai',
          error: true,
          explanation: `**Analysis Failed:** ${result.detail || 'An unexpected error occurred during execution.'}`,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistories(prev => ({
          ...prev,
          [activeFileId]: [...(prev[activeFileId] || []), errMsg]
        }));
      }
    } catch (err) {
      console.error('Query error:', err);
      const networkErrMsg = {
        sender: 'ai',
        error: true,
        explanation: `**Connection Error:** Could not contact the analysis server. Please check your backend.`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistories(prev => ({
        ...prev,
        [activeFileId]: [...(prev[activeFileId] || []), networkErrMsg]
      }));
    } finally {
      setQueryLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Code copied to clipboard!');
  };

  const downloadResultCSV = (data, filename = 'query_results.csv') => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val === null || val === undefined ? '' : val)).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.click();
  };

  const toggleCodeExpansion = (msgIndex) => {
    setExpandedCodes(prev => ({
      ...prev,
      [msgIndex]: !prev[msgIndex]
    }));
  };

  // Helper to render Recharts dynamically
  const renderRecharts = (suggestion, data) => {
    if (!suggestion || suggestion.type === 'none' || !data || data.length === 0) return null;
    const { type, x_key, y_keys, title } = suggestion;

    const firstY = y_keys && y_keys[0];
    if (!firstY) return null;

    const chartHeight = 280;

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey={x_key} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {y_keys.map((key, idx) => (
                <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey={x_key} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {y_keys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={data} margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
              <defs>
                {y_keys.map((key, idx) => (
                  <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey={x_key} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#fff', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {y_keys.map((key, idx) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={data}
                dataKey={firstY}
                nameKey={x_key}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ScatterChart margin={{ top: 15, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis type="number" dataKey={x_key} name={x_key} stroke="#94a3b8" fontSize={11} />
              <YAxis type="number" dataKey={firstY} name={firstY} stroke="#94a3b8" fontSize={11} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Scatter name={`${firstY} vs ${x_key}`} data={data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const activeFile = files.find(f => f.file_id === activeFileId);
  const activeChat = chatHistories[activeFileId] || [];

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden text-slate-100 bg-slate-950 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900 bg-opacity-70 backdrop-blur-xl shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                AI Data Analyst
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">FastAPI + Pandas + React</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSettings 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                : 'text-slate-400 border-slate-800 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title="Configure API Keys"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* API Settings Box (Collapsible) */}
        {showSettings && (
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 transition-all duration-300">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">AI Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-... (leave blank to use server env)"
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Model Selection</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 focus:outline-none focus:border-indigo-500 text-slate-300 transition-colors"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Faster, cost-efficient)</option>
                  <option value="gpt-4o">gpt-4o (Most intelligent)</option>
                </select>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                If no API Key is provided here, the backend will default to the `OPENAI_API_KEY` defined in the server's `.env` configuration.
              </p>
            </div>
          </div>
        )}

        {/* File Upload Zone */}
        <div className="p-4 border-b border-slate-800">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            className={`group cursor-pointer border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-500/5' 
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={(e) => handleUpload(e.target.files[0])}
              className="hidden"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center py-2">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-xs text-slate-300 font-medium">Processing CSV...</p>
              </div>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-slate-400 transition-colors mb-2" />
                <p className="text-xs font-semibold text-slate-300">Upload CSV File</p>
                <p className="text-[10px] text-slate-500 mt-1">Drag & drop or click to browse</p>
              </>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Datasets</h3>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
              {files.length}
            </span>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-slate-800/40 bg-slate-950/20">
              <FileSpreadsheet className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No datasets uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => {
                const isActive = f.file_id === activeFileId;
                return (
                  <div
                    key={f.file_id}
                    onClick={() => handleFileSelect(f.file_id)}
                    className={`group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                        : 'bg-slate-950/30 border-slate-800/60 hover:bg-slate-800/30 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate pr-2">{f.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {f.rows} rows • {f.columns_count} cols
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteFile(e, f.file_id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
        
        {/* Connection status bar */}
        <div className="px-6 py-2 border-b border-slate-900 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-slate-400">Analysis Engine: Online</span>
          </div>
          {activeFile && (
            <span className="text-[10px] font-mono text-slate-500 font-medium">
              Current File: <span className="text-indigo-400 font-semibold">{activeFile.filename}</span>
            </span>
          )}
        </div>

        {!activeFileId ? (
          /* EMPTY STATE HERO PANEL */
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 md:p-12">
            <div className="max-w-2xl text-center">
              <div className="inline-flex p-3 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner mb-6 animate-bounce">
                <Database className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                AI-Powered Analytics Dashboard
              </h2>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xl mx-auto">
                Upload raw CSV data and interrogate it using natural language. Python executes safe Pandas aggregations, generating summaries and visual charts instantly.
              </p>

              {/* Steps overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-lg mx-auto">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">STEP 1</span>
                  <h4 className="text-xs font-semibold text-white mt-2">Upload CSV</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Upload files securely to the server database.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">STEP 2</span>
                  <h4 className="text-xs font-semibold text-white mt-2">Ask Questions</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Request custom charts, trends, or stats in natural language.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-left">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">STEP 3</span>
                  <h4 className="text-xs font-semibold text-white mt-2">Get Insights</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Review dynamically computed graphs, summaries, and source code.</p>
                </div>
              </div>

              {/* Sample loader */}
              <div className="mt-12">
                <p className="text-xs text-slate-400 font-semibold mb-4">Don't have a dataset? Try one of our samples:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => loadSample('sales')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-indigo-300 hover:bg-slate-800 hover:border-slate-700 hover:text-white transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Company Sales
                  </button>
                  <button
                    onClick={() => loadSample('reviews')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 hover:bg-slate-800 hover:border-slate-700 hover:text-white transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Tech Reviews
                  </button>
                  <button
                    onClick={() => loadSample('employees')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-purple-300 hover:bg-slate-800 hover:border-slate-700 hover:text-white transition-all shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> HR Engagement
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ACTIVE DATASET WORKSPACE */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Workspace Header Panel */}
            <div className="px-6 py-4 bg-slate-900 bg-opacity-40 border-b border-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-md font-bold text-white truncate max-w-md">{activeFile?.filename}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activeFileMetadata?.rows} rows • {activeFileMetadata?.columns_count} columns
                  </p>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'preview'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  Data Preview
                </button>
                <button
                  onClick={() => setActiveTab('analyst')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'analyst'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  AI Analyst
                </button>
              </div>
            </div>

            {/* Workspace Content Tabs */}
            <div className="flex-1 overflow-hidden">
              
              {fileLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading dataset details...</p>
                  </div>
                </div>
              ) : activeTab === 'preview' ? (
                /* TAB 1: DATA PREVIEW & SCHEMA */
                <div className="h-full overflow-y-auto p-6 space-y-6">
                  
                  {/* KPI Quick Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Rows</p>
                      <p className="text-xl font-bold text-white mt-1">{activeFileMetadata?.rows}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Columns</p>
                      <p className="text-xl font-bold text-white mt-1">{activeFileMetadata?.columns_count}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Column List</p>
                      <p className="text-xs text-indigo-300 truncate mt-1.5" title={activeFileMetadata?.columns.map(c=>c.name).join(', ')}>
                        {activeFileMetadata?.columns.map(c => c.name).join(', ')}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Source Type</p>
                      <p className="text-xs text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> CSV Database
                      </p>
                    </div>
                  </div>

                  {/* Sample Rows Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 bg-opacity-40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sample Records (First 10 rows)</h3>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                        Preview Mode
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <th className="p-3 font-semibold">#</th>
                            {activeFileMetadata?.columns.map((col) => (
                              <th key={col.name} className="p-3 font-semibold">{col.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {activeFileMetadata?.preview.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-800/20 text-slate-300">
                              <td className="p-3 font-mono text-slate-500">{index + 1}</td>
                              {activeFileMetadata?.columns.map((col) => (
                                <td key={col.name} className="p-3 truncate max-w-[200px]" title={row[col.name]}>
                                  {row[col.name] === null || row[col.name] === undefined ? (
                                    <span className="text-slate-600 font-mono italic">null</span>
                                  ) : (
                                    String(row[col.name])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Columns Schema details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Columns Schema & Data Types</h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {activeFileMetadata?.columns.map((col) => (
                          <div key={col.name} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/60">
                            <div>
                              <p className="text-xs font-semibold text-slate-300">{col.name}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Type: <span className="font-mono text-indigo-400">{col.type}</span> • Uniques: <span className="text-slate-400">{col.uniques}</span>
                              </p>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
                              {col.nulls > 0 ? `${col.nulls} Nulls` : 'Full'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Statistical Summary</h3>
                      <div className="flex-1 overflow-x-auto">
                        {Object.keys(activeFileMetadata?.summary || {}).length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-xs text-slate-500 italic">No summary statistics available.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500">
                                <th className="py-2 pr-4 font-medium">Metric</th>
                                {Object.keys(activeFileMetadata?.summary || {}).slice(0, 3).map((colName) => (
                                  <th key={colName} className="py-2 px-3 font-semibold text-slate-300 truncate max-w-[120px]">{colName}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/40 font-mono text-slate-400">
                              {['count', 'mean', 'std', 'min', '50%', 'max'].map((metric) => (
                                <tr key={metric} className="hover:bg-slate-800/10">
                                  <td className="py-2 pr-4 text-xs font-sans text-slate-500 font-medium capitalize">{metric}</td>
                                  {Object.keys(activeFileMetadata?.summary || {}).slice(0, 3).map((colName) => {
                                    const val = activeFileMetadata.summary[colName][metric];
                                    return (
                                      <td key={colName} className="py-2 px-3">
                                        {val === '' || val === null || val === undefined 
                                          ? '-' 
                                          : (typeof val === 'number' ? val.toFixed(2) : String(val))}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-sans">
                          Showing summary statistics for up to 3 columns. Ask the AI Analyst for complex correlation, distribution, or outliers.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* TAB 2: AI ANALYST CHAT & INTERACTION */
                <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
                  
                  {/* Chat Message Feed */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {activeChat.map((msg, idx) => {
                      const isAi = msg.sender === 'ai';
                      const hasChart = isAi && msg.chart_suggestion && msg.chart_suggestion.type !== 'none' && msg.data;
                      const hasTable = isAi && msg.data && msg.data.length > 0;
                      const showCode = expandedCodes[idx];

                      return (
                        <div
                          key={idx}
                          className={`flex gap-4 max-w-4xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-xs font-bold ${
                            msg.sender === 'user'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : msg.error 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}>
                            {msg.sender === 'user' ? 'U' : msg.error ? '!' : 'AI'}
                          </div>

                          {/* Message Content Bubble */}
                          <div className="space-y-3 min-w-0 max-w-[85%]">
                            
                            {/* Explanation */}
                            <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : msg.error
                                  ? 'bg-rose-950 bg-opacity-40 border border-rose-900/50 text-rose-200 rounded-tl-none'
                                  : 'glass border border-slate-800/80 text-slate-300 rounded-tl-none'
                            }`}>
                              {/* Simple Markdown Bold parsing helper */}
                              {msg.explanation.split('\n').map((para, pIdx) => {
                                // Basic translation of markdown **text** to JSX strong
                                const parts = para.split(/\*\*([^*]+)\*\*/g);
                                return (
                                  <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
                                    {parts.map((part, partIdx) => 
                                      partIdx % 2 === 1 ? <strong key={partIdx} className="text-white font-semibold">{part}</strong> : part
                                    )}
                                  </p>
                                );
                              })}
                              
                              <span className="block text-[9px] text-slate-500 mt-2 font-mono text-right">
                                {msg.timestamp}
                              </span>
                            </div>

                            {/* Render AI Insights, Charts, Tables, and Code */}
                            {isAi && !msg.error && (
                              <div className="space-y-4">
                                
                                {/* Dynamic Chart */}
                                {hasChart && (
                                  <div className="glass rounded-xl p-4 border border-slate-850 shadow-md">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-xs font-bold text-slate-300 font-sans">
                                        📊 {msg.chart_suggestion.title || 'Data Visualization'}
                                      </h4>
                                      <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded capitalize font-mono">
                                        {msg.chart_suggestion.type} chart
                                      </span>
                                    </div>
                                    <div className="w-full flex justify-center bg-slate-950 bg-opacity-30 rounded-lg p-2">
                                      {renderRecharts(msg.chart_suggestion, msg.data)}
                                    </div>
                                  </div>
                                )}

                                {/* Processed Results Table */}
                                {hasTable && (
                                  <div className="glass rounded-xl border border-slate-850 overflow-hidden shadow-md">
                                    <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
                                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Computed Query Output</h4>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => downloadResultCSV(msg.data, `analysis_${idx}.csv`)}
                                          className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
                                        >
                                          <Download className="w-2.5 h-2.5" /> CSV
                                        </button>
                                      </div>
                                    </div>
                                    <div className="max-h-52 overflow-auto">
                                      <table className="w-full text-left text-[11px] border-collapse">
                                        <thead>
                                          <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-mono">
                                            {msg.columns.map((col) => (
                                              <th key={col} className="p-2 font-medium">{col}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-850">
                                          {msg.data.slice(0, 10).map((row, rIdx) => (
                                            <tr key={rIdx} className="hover:bg-slate-900/30 text-slate-300">
                                              {msg.columns.map((col) => (
                                                <td key={col} className="p-2 truncate max-w-[150px]">
                                                  {row[col] === null || row[col] === undefined ? '-' : String(row[col])}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                          {msg.data.length > 10 && (
                                            <tr className="bg-slate-900 bg-opacity-20">
                                              <td colSpan={msg.columns.length} className="p-1.5 text-center text-[10px] text-slate-500 italic">
                                                Showing top 10 of {msg.data.length} records. Download CSV to view all.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                                {/* Collapsible Code Inspector */}
                                {msg.code && (
                                  <div className="rounded-xl border border-slate-850 overflow-hidden glass">
                                    <button
                                      onClick={() => toggleCodeExpansion(idx)}
                                      className="w-full px-4 py-2.5 bg-slate-900 bg-opacity-40 text-left flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                                        {showCode ? 'Hide Executed Python Code' : 'Inspect Executed Python Code'}
                                      </span>
                                      {showCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>

                                    {showCode && (
                                      <div className="p-4 bg-slate-950 border-t border-slate-850">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Safe AST Sandbox Executed
                                          </span>
                                          <button
                                            onClick={() => copyToClipboard(msg.code)}
                                            className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-slate-900 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors"
                                          >
                                            <Copy className="w-2.5 h-2.5" /> Copy Code
                                          </button>
                                        </div>
                                        <pre className="text-[11px] font-mono text-indigo-200/90 overflow-x-auto p-3 bg-slate-900 rounded-lg leading-relaxed border border-slate-850">
                                          {msg.code}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}

                    {queryLoading && (
                      <div className="flex gap-4 max-w-4xl">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center border bg-slate-900 text-indigo-400 border-slate-800">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                        <div className="glass border border-slate-800/80 p-4 rounded-2xl rounded-tl-none max-w-[80%] text-xs flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span>AI is generating safe Pandas analysis code and querying model...</span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <div className="p-4 border-t border-slate-900 bg-slate-900 bg-opacity-30 shrink-0">
                    <form onSubmit={handleSendQuery} className="flex gap-3">
                      <input
                        type="text"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder={`Ask a question about ${activeFile?.filename} (e.g. "What is the correlation of price vs sales?")`}
                        disabled={queryLoading}
                        className="flex-1 px-4 py-3 bg-slate-900 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-xs placeholder-slate-500 disabled:opacity-50 transition-all text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!queryText.trim() || queryLoading}
                        className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                      >
                        {queryLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Analyze</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                      Python code executes in a sandbox checking Abstract Syntax Trees (AST) to filter malicious imports and functions.
                    </p>
                  </div>

                </div>
              )}

            </div>
            
          </div>
        )}

      </main>
    </div>
  );
}
