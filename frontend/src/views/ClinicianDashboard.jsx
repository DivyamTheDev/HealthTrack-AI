import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  Users, User, Heart, Search, FileText, Send, Sparkles, Check, X, Edit2, 
  TrendingUp, Calendar, AlertTriangle, ShieldCheck, RefreshCw, LogOut, ArrowRight, Activity, ChevronRight
} from 'lucide-react';

const ClinicianDashboard = () => {
  const { logout, profile, token, API_URL } = useAuth();
  
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState('LDL');
  const [chartData, setChartData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'timeline', 'audit'

  // Input states
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editedAiText, setEditedAiText] = useState('');
  const [isEditingAi, setIsEditingAi] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Global refresh
  const [loading, setLoading] = useState(true);

  // Patient detailed values
  const [latestValues, setLatestValues] = useState({
    LDL: { value: '--', unit: 'mg/dL', status: 'normal', min: 0, max: 100 },
    'Vitamin D': { value: '--', unit: 'ng/mL', status: 'normal', min: 30, max: 100 },
    HbA1c: { value: '--', unit: '%', status: 'normal', min: 4.0, max: 5.6 }
  });

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_URL}/patients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
        if (data.length > 0 && !selectedPatient) {
          setSelectedPatient(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = async () => {
    if (!selectedPatient) return;
    try {
      // 1. Fetch Latest Lab Results
      const resResults = await fetch(`${API_URL}/patients/${selectedPatient._id}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataResults = await resResults.json();
      
      const tempLatest = {
        LDL: { value: '--', unit: 'mg/dL', status: 'normal', min: 0, max: 100 },
        'Vitamin D': { value: '--', unit: 'ng/mL', status: 'normal', min: 30, max: 100 },
        HbA1c: { value: '--', unit: '%', status: 'normal', min: 4.0, max: 5.6 }
      };

      if (Array.isArray(dataResults)) {
        dataResults.forEach(r => {
          const name = r.biomarkerId?.name;
          if (name && tempLatest[name] && tempLatest[name].value === '--') {
            const val = r.value;
            const refMin = r.biomarkerId.referenceMin;
            const refMax = r.biomarkerId.referenceMax;
            let status = 'normal';
            if (val > refMax) status = 'high';
            else if (val < refMin) status = 'low';

            tempLatest[name] = {
              value: val,
              unit: r.biomarkerId.unit,
              status,
              min: refMin,
              max: refMax
            };
          }
        });
      }
      setLatestValues(tempLatest);

      // 2. Fetch Timeline
      const resTimeline = await fetch(`${API_URL}/patients/${selectedPatient._id}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTimeline = await resTimeline.json();
      if (Array.isArray(dataTimeline)) {
        setTimeline(dataTimeline);
        
        // Find most recent draft AI summary
        const draftSummary = dataTimeline.find(item => item.type === 'ai_summary');
        if (draftSummary) {
          setAiSummary({
            _id: draftSummary.id.replace('summary-', ''),
            summaryText: draftSummary.details.summary,
            status: draftSummary.details.status
          });
          setEditedAiText(draftSummary.details.summary);
        } else {
          setAiSummary(null);
          setEditedAiText('');
        }
      }

      // 3. Fetch Selected Biomarker History for charts
      fetchChartHistory(selectedBiomarker);

    } catch (err) {
      console.error('Error fetching patient details:', err);
    }
  };

  const fetchChartHistory = async (biomarkerName) => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(`${API_URL}/patients/${selectedPatient._id}/biomarkers/${biomarkerName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && Array.isArray(data.history)) {
        setChartData(data.history);
      }
    } catch (err) {
      console.error(`Error loading chart history for ${biomarkerName}:`, err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientDetails();
      setIsEditingAi(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      fetchChartHistory(selectedBiomarker);
    }
  }, [selectedBiomarker]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Actions
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedPatient) return;

    setNoteLoading(true);
    try {
      const response = await fetch(`${API_URL}/clinical-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          note: newNote.trim()
        })
      });

      if (response.ok) {
        setNewNote('');
        await fetchPatientDetails();
        await fetchAuditLogs();
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setNoteLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    try {
      const response = await fetch(`${API_URL}/ai/summaries/${selectedPatient._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data);
        setEditedAiText(data.summaryText);
        await fetchPatientDetails();
        await fetchAuditLogs();
      }
    } catch (error) {
      console.error('Error generating AI Summary:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleReviewAISummary = async (status) => {
    if (!aiSummary) return;
    setReviewLoading(true);
    try {
      const response = await fetch(`${API_URL}/ai/summaries/${aiSummary._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          editedText: status === 'approved' ? editedAiText : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data);
        setIsEditingAi(false);
        await fetchPatientDetails();
        await fetchAuditLogs();
      }
    } catch (error) {
      console.error(`Error executing AI review (${status}):`, error);
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center">
        <RefreshCw className="h-10 w-10 text-zinc-600 animate-spin mb-4" />
        <span className="text-zinc-400 font-sans text-sm">Initializing clinician console...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col h-screen text-zinc-100 overflow-hidden font-sans">
      
      {/* GLOBAL NAVBAR */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500/10" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">HealthTrack <span className="text-zinc-500 font-normal">AI</span></span>
            <span className="ml-2.5 px-2 py-0.5 text-[10px] font-bold bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50 uppercase tracking-widest">
              Clinician Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 font-semibold text-xs text-white">
              {profile?.name.charAt(0) || 'D'}
            </div>
            <span className="text-xs font-semibold text-zinc-300 hidden md:inline">{profile?.name}</span>
          </div>

          <button 
            onClick={logout}
            className="p-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-1.5 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* DASHBOARD SPLIT PANELS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANEL 1: PATIENTS LIST (SIDEBAR) */}
        <aside className="w-80 border-r border-zinc-850 bg-zinc-900/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-850">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest px-2 mb-2">Patients ({filteredPatients.length})</div>
            {filteredPatients.map((p) => {
              const active = selectedPatient?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between group select-none ${
                    active 
                      ? 'bg-zinc-900 border-zinc-750' 
                      : 'border-transparent hover:bg-zinc-900/50 hover:border-zinc-800'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white group-hover:text-white transition-colors truncate">{p.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{calculateAge(p.dateOfBirth)} y/o • {p.email}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${active ? 'text-zinc-300 translate-x-0.5' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                </div>
              );
            })}
          </div>
        </aside>

        {/* PANEL 2: CLINICAL WORKSPACE */}
        {selectedPatient ? (
          <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950">
            
            {/* WORKSPACE LEFT: HEALTH OVERVIEW & LABS */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
              
              {/* Patient header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{selectedPatient.name}</h2>
                  <p className="text-zinc-400 text-xs mt-1">
                    DOB: {new Date(selectedPatient.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })} • {calculateAge(selectedPatient.dateOfBirth)} y/o
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-mono">ID: {selectedPatient._id}</span>
                </div>
              </div>

              {/* Biomarker Grid */}
              <section className="grid grid-cols-3 gap-4">
                {Object.entries(latestValues).map(([name, item]) => {
                  const isHigh = item.status === 'high';
                  const isLow = item.status === 'low';
                  
                  return (
                    <div 
                      key={name}
                      onClick={() => setSelectedBiomarker(name)}
                      className={`p-4 rounded-2xl border cursor-pointer hover:bg-zinc-900/50 hover:border-zinc-700 transition-all select-none relative card-glow ${
                        selectedBiomarker === name ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-zinc-850'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">{name}</span>
                        {isHigh && <span className="text-xs text-rose-400 flex items-center font-bold">▲</span>}
                        {isLow && <span className="text-xs text-amber-400 flex items-center font-bold">▼</span>}
                        {item.status === 'normal' && item.value !== '--' && <span className="text-xs text-emerald-400 flex items-center font-bold">●</span>}
                      </div>

                      <div className="mt-2 flex items-baseline gap-0.5">
                        <span className="text-2xl font-extrabold text-white">{item.value}</span>
                        <span className="text-[10px] text-zinc-400 font-semibold">{item.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Navigation Tabs */}
              <div className="flex border-b border-zinc-850">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`px-4 py-2.5 text-xs font-semibold select-none border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'chart' 
                      ? 'border-white text-white' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Biomarker Trends</span>
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2.5 text-xs font-semibold select-none border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'timeline' 
                      ? 'border-white text-white' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Chronological Timeline</span>
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-4 py-2.5 text-xs font-semibold select-none border-b-2 -mb-[2px] transition-all flex items-center gap-1.5 ${
                    activeTab === 'audit' 
                      ? 'border-white text-white' 
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Security Audit Log</span>
                </button>
              </div>

              {/* TAB 1: CHART VIEW */}
              {activeTab === 'chart' && (
                <div className="bg-zinc-900/20 border border-zinc-850 p-5 rounded-2xl font-mono text-xs card-glow">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-zinc-400">Plotted: {selectedBiomarker} History</span>
                    <span className="text-[10px] text-zinc-500">Normal Range: {latestValues[selectedBiomarker]?.min} - {latestValues[selectedBiomarker]?.max} {latestValues[selectedBiomarker]?.unit}</span>
                  </div>
                  
                  <div className="h-56 w-full">
                    {chartData.length === 0 ? (
                      <div className="h-full flex justify-center items-center text-zinc-500">No test data recorded.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                          <XAxis dataKey="label" stroke="#52525b" tickLine={false} axisLine={false} dy={8} />
                          <YAxis stroke="#52525b" tickLine={false} axisLine={false} dx={-5} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                            labelClassName="text-zinc-400 font-bold"
                            itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                            formatter={(value) => [`${value} ${latestValues[selectedBiomarker]?.unit}`, selectedBiomarker]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#ffffff" 
                            strokeWidth={2}
                            dot={{ r: 4, stroke: '#09090b', strokeWidth: 1.5, fill: '#ffffff' }}
                            activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 1 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE VIEW */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {timeline.map((item) => {
                    const isBlood = item.type === 'blood_test';
                    const isConsult = item.type === 'consultation';
                    const isSummary = item.type === 'ai_summary';

                    return (
                      <div key={item.id} className="p-4 bg-zinc-900/30 border border-zinc-850 rounded-2xl flex gap-3 relative card-glow">
                        <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center border ${
                          isBlood ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          isConsult ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                          'bg-purple-500/10 border-purple-500/20 text-purple-400'
                        }`}>
                          {isBlood && <Activity className="h-4 w-4" />}
                          {isConsult && <FileText className="h-4 w-4" />}
                          {isSummary && <Sparkles className="h-4 w-4" />}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-white">{item.title}</h4>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{item.description}</p>

                          {isBlood && Array.isArray(item.details) && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {item.details.map((d, index) => (
                                <div key={index} className="p-2 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col">
                                  <span className="text-[9px] font-bold text-zinc-500">{d.biomarker}</span>
                                  <span className={`text-xs font-extrabold mt-0.5 ${d.isOutRange ? 'text-rose-400' : 'text-zinc-300'}`}>
                                    {d.value} <span className="text-[9px] text-zinc-500 font-normal">{d.unit}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {isConsult && item.details && (
                            <div className="mt-2 text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-850 leading-relaxed italic">
                              "{item.details.note}"
                            </div>
                          )}

                          {isSummary && item.details && (
                            <div className="mt-2 text-xs text-zinc-350 bg-zinc-950 p-3 rounded-xl border border-purple-900/30 border-l-2 border-l-purple-500/40 whitespace-pre-line leading-relaxed">
                              {item.details.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL LOG */}
              {activeTab === 'audit' && (
                <div className="bg-zinc-900/10 border border-zinc-850 rounded-2xl overflow-hidden font-mono text-xs card-glow">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 border-b border-zinc-850">
                      <tr>
                        <th className="p-3 text-zinc-400 font-bold uppercase text-[10px]">Timestamp</th>
                        <th className="p-3 text-zinc-400 font-bold uppercase text-[10px]">Actor</th>
                        <th className="p-3 text-zinc-400 font-bold uppercase text-[10px]">Action</th>
                        <th className="p-3 text-zinc-400 font-bold uppercase text-[10px]">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850/50">
                      {auditLogs.slice(0, 15).map((log) => (
                        <tr key={log._id} className="hover:bg-zinc-900/30 text-zinc-300">
                          <td className="p-3 whitespace-nowrap text-zinc-500">
                            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-3 whitespace-nowrap text-zinc-400">
                            {log.username} ({log.role})
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-zinc-400 max-w-xs truncate">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditLogs.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">No logs collected yet.</div>
                  )}
                </div>
              )}

              {/* Form to insert Clinical Note */}
              <form onSubmit={handleAddNote} className="p-5 bg-zinc-900/20 border border-zinc-850 rounded-2xl space-y-3 card-glow">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Add Clinician's Notes</label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter observation notes, treatment plans, or instructions..."
                    disabled={noteLoading}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={noteLoading || !newNote.trim()}
                    className="px-4 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
                  >
                    {noteLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </form>

            </div>

            {/* WORKSPACE RIGHT: AI SUMMARIZER WORKSPACE */}
            <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-zinc-850 bg-zinc-900/20 p-6 flex flex-col overflow-y-auto shrink-0 select-none">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400 fill-purple-400/10" />
                  <span>AI Clinical Synthesis</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Synthesize health history, test trends, and notes into reports.</p>
              </div>

              {/* Generate Trigger Panel */}
              {!aiSummary ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
                  <Sparkles className="h-8 w-8 text-zinc-600 mb-2.5" />
                  <p className="text-xs text-zinc-400 font-semibold mb-4">No AI Health Evaluation summary draft exists for {selectedPatient.name}.</p>
                  <button
                    onClick={handleGenerateAISummary}
                    disabled={aiLoading}
                    className="flex items-center gap-2 py-2 px-4 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {aiLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                        <span>Generate AI Draft</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  
                  {/* Status Indicator */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Draft Status</span>
                      
                      {aiSummary.status === 'draft' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/25 rounded-md flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Pending Review
                        </span>
                      )}
                      {aiSummary.status === 'approved' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-md flex items-center gap-1">
                          <Check className="h-3 w-3 shrink-0" /> Approved
                        </span>
                      )}
                      {aiSummary.status === 'rejected' && (
                        <span className="px-2 py-0.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-md flex items-center gap-1">
                          <X className="h-3 w-3 shrink-0" /> Rejected
                        </span>
                      )}
                    </div>

                    {/* AI Draft Warning */}
                    {aiSummary.status === 'draft' && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/15 text-amber-400 text-[10px] rounded-xl leading-relaxed flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>⚠️ AI-generated draft summaries are decision-support aids and require clinical confirmation and validation.</span>
                      </div>
                    )}

                    {/* Review Text / Editor */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Evaluation Summary</span>
                        {aiSummary.status === 'draft' && !isEditingAi && (
                          <button
                            onClick={() => setIsEditingAi(true)}
                            className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit Text
                          </button>
                        )}
                      </div>

                      {isEditingAi ? (
                        <div className="space-y-2">
                          <textarea
                            rows={12}
                            value={editedAiText}
                            onChange={(e) => setEditedAiText(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-300 font-sans focus:outline-none focus:ring-1 focus:ring-zinc-700 leading-relaxed resize-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditedAiText(aiSummary.summaryText);
                                setIsEditingAi(false);
                              }}
                              className="px-2.5 py-1.5 border border-zinc-850 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => setIsEditingAi(false)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-[10px] font-bold transition-all"
                            >
                              Save Edits
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-zinc-950 border border-zinc-850/60 rounded-2xl text-xs text-zinc-300 whitespace-pre-line leading-relaxed h-[300px] overflow-y-auto font-sans border-l-2 border-purple-500/30">
                          {editedAiText || aiSummary.summaryText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for human-in-the-loop validation */}
                  {aiSummary.status === 'draft' && (
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-850">
                      <button
                        onClick={() => handleReviewAISummary('rejected')}
                        disabled={reviewLoading || isEditingAi}
                        className="py-2.5 border border-zinc-800 hover:border-rose-900/30 hover:bg-rose-500/5 text-zinc-400 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <X className="h-4 w-4" /> Reject Draft
                      </button>
                      <button
                        onClick={() => handleReviewAISummary('approved')}
                        disabled={reviewLoading || isEditingAi}
                        className="py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Approve & Sign
                      </button>
                    </div>
                  )}

                  {/* Re-generate option if summary is already approved/rejected */}
                  {aiSummary.status !== 'draft' && (
                    <div className="pt-4 border-t border-zinc-850 text-center">
                      <button
                        onClick={handleGenerateAISummary}
                        disabled={aiLoading}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors"
                      >
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        <span>Generate New Draft Evaluation</span>
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
          </main>
        ) : (
          <div className="flex-1 flex justify-center items-center bg-zinc-950 text-zinc-500">
            Select a patient from the roster to begin reviews.
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicianDashboard;
