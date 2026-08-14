import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { 
  Activity, Calendar, LogOut, ChevronRight, User, Heart, AlertTriangle, 
  CheckCircle, FileText, Sparkles, TrendingUp, Info, RefreshCw 
} from 'lucide-react';

const PatientDashboard = () => {
  const { logout, profile, token, API_URL } = useAuth();
  
  const [results, setResults] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState('LDL');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Group latest biomarker values
  const [latestValues, setLatestValues] = useState({
    LDL: { value: '--', unit: 'mg/dL', status: 'normal', min: 0, max: 100 },
    'Vitamin D': { value: '--', unit: 'ng/mL', status: 'normal', min: 30, max: 100 },
    HbA1c: { value: '--', unit: '%', status: 'normal', min: 4.0, max: 5.6 }
  });

  const fetchData = async () => {
    if (!profile) return;
    try {
      // 1. Fetch Lab Results
      const resResults = await fetch(`${API_URL}/patients/${profile._id}/results`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataResults = await resResults.json();
      
      // Calculate latest values
      if (Array.isArray(dataResults)) {
        setResults(dataResults);
        
        const tempLatest = { ...latestValues };
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
        setLatestValues(tempLatest);
      }

      // 2. Fetch Timeline
      const resTimeline = await fetch(`${API_URL}/patients/${profile._id}/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataTimeline = await resTimeline.json();
      if (Array.isArray(dataTimeline)) {
        setTimeline(dataTimeline);
      }

      // 3. Fetch Selected Biomarker History for Chart
      fetchChartData(selectedBiomarker);

    } catch (err) {
      console.error('Failed to load patient dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchChartData = async (biomarkerName) => {
    if (!profile) return;
    try {
      const res = await fetch(`${API_URL}/patients/${profile._id}/biomarkers/${biomarkerName}`, {
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

  useEffect(() => {
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      fetchChartData(selectedBiomarker);
    }
  }, [selectedBiomarker]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center">
        <RefreshCw className="h-10 w-10 text-zinc-600 animate-spin mb-4" />
        <span className="text-zinc-400 font-sans text-sm">Loading health profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row relative">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-zinc-900 border-b md:border-b-0 md:border-r border-zinc-800 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <Heart className="h-6 w-6 text-rose-500 fill-rose-500/10" />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-white">HealthTrack</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Patient Panel</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-sans">Active Account</p>
              <p className="text-sm font-semibold text-white truncate max-w-[130px]">{profile?.name || 'Patient'}</p>
            </div>
          </div>

          <div className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest px-2 mb-2">Navigation</div>
          <button className="w-full text-left flex items-center gap-3 px-3 py-2 bg-zinc-800 border border-zinc-700/50 text-white rounded-xl text-sm font-semibold transition-all">
            <Activity className="h-4 w-4 text-zinc-300" />
            <span>Health Dashboard</span>
          </button>
        </div>

        <button 
          onClick={logout}
          className="mt-6 flex items-center justify-between px-3 py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-sm font-semibold transition-all"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </div>
          <ChevronRight className="h-4 w-4" />
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Hello, {profile?.name}</h2>
            <p className="text-zinc-500 text-sm mt-1">Here is the preventive review of your health biomarker trends.</p>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-900 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </header>

        {/* LATEST MEASUREMENTS CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Object.entries(latestValues).map(([name, item]) => {
            const isHigh = item.status === 'high';
            const isLow = item.status === 'low';
            const isNormal = item.status === 'normal';

            return (
              <div 
                key={name}
                onClick={() => { if (item.value !== '--') setSelectedBiomarker(name); }}
                className={`p-6 bg-zinc-900/40 border rounded-3xl cursor-pointer hover:bg-zinc-900/70 hover:border-zinc-700 transition-all select-none relative card-glow ${
                  selectedBiomarker === name ? 'border-zinc-700 bg-zinc-900/80' : 'border-zinc-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{name}</span>
                  {isNormal && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      Optimal
                    </span>
                  )}
                  {isHigh && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> High
                    </span>
                  )}
                  {isLow && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Low
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white tracking-tight">{item.value}</span>
                  <span className="text-sm text-zinc-400 font-semibold">{item.unit}</span>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>Reference: {item.min} - {item.max} {item.unit}</span>
                </div>

                {selectedBiomarker === name && (
                  <div className="absolute bottom-2 right-4 w-1.5 h-1.5 rounded-full bg-zinc-400"></div>
                )}
              </div>
            );
          })}
        </section>

        {/* TRENDS CHART */}
        <section className="bg-zinc-900/30 border border-zinc-850 p-6 rounded-3xl card-glow">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-400" />
                <span>Biomarker Trends</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Historical analysis of your blood biomarker levels over time.</p>
            </div>
            
            {/* Chart toggle buttons */}
            <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
              {Object.keys(latestValues).map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedBiomarker(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all ${
                    selectedBiomarker === name 
                      ? 'bg-zinc-800 text-white shadow-md' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full font-mono text-xs">
            {chartData.length === 0 ? (
              <div className="h-full flex justify-center items-center text-zinc-500">
                No history data available for {selectedBiomarker}.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4d4d8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#d4d4d8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#52525b" 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    tickLine={false} 
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelClassName="text-zinc-400 font-bold"
                    itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                    formatter={(value) => [`${value} ${latestValues[selectedBiomarker]?.unit}`, selectedBiomarker]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#d4d4d8" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    dot={{ r: 4, stroke: '#09090b', strokeWidth: 1.5, fill: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* HEALTH TIMELINE */}
        <section className="bg-zinc-900/30 border border-zinc-850 p-6 rounded-3xl card-glow">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span>Health Timeline</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Chronological record of lab work, doctor updates, and clinical assessments.</p>
          </div>

          {timeline.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">Your health events will appear here as tests are completed.</p>
          ) : (
            <div className="relative border-l border-zinc-800 ml-4 pl-6 space-y-8">
              {timeline.map((item) => {
                const isBlood = item.type === 'blood_test';
                const isConsult = item.type === 'consultation';
                const isSummary = item.type === 'ai_summary';

                return (
                  <div key={item.id} className="relative group select-none">
                    
                    {/* Circle timeline bullet */}
                    <span className={`absolute -left-[35px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border ring-8 ring-zinc-950 transition-all ${
                      isBlood ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                      isConsult ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                      'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    }`}>
                      {isBlood && <Activity className="h-3 w-3" />}
                      {isConsult && <FileText className="h-3 w-3" />}
                      {isSummary && <Sparkles className="h-3 w-3" />}
                    </span>

                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">{item.title}</h4>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{item.description}</p>

                      {/* Timeline detail cards */}
                      {isBlood && Array.isArray(item.details) && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {item.details.map((d, index) => (
                            <div key={index} className="p-3 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-zinc-500">{d.biomarker}</span>
                              <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-sm font-extrabold ${d.isOutRange ? 'text-rose-400' : 'text-zinc-300'}`}>
                                  {d.value}
                                </span>
                                <span className="text-[10px] text-zinc-500">{d.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {isConsult && item.details && (
                        <div className="mt-3 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl">
                          <p className="text-xs text-zinc-300 leading-relaxed italic">
                            "{item.details.note}"
                          </p>
                          <p className="text-[10px] text-zinc-500 mt-2 text-right">
                            — {item.details.doctorName} ({item.details.specialization})
                          </p>
                        </div>
                      )}

                      {isSummary && item.details && (
                        <div className="mt-3 p-4 bg-zinc-950 border border-zinc-900 rounded-2xl border-l-2 border-l-purple-500/40">
                          <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                            {item.details.summary}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PatientDashboard;
