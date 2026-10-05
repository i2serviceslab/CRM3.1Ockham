'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save, Users, Brain, ListTodo, FileText, CheckCircle2, Upload, Edit3, X, Plus } from 'lucide-react';

export const MeetingRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Pre-processing
  const [meetingName, setMeetingName] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // View/Edit State
  const [meetingData, setMeetingData] = useState<any | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const [editDoctrines, setEditDoctrines] = useState<any[]>([]);

  const [history, setHistory] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/meetings/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setMeetingData(null);
      setIsEditing(false);
      setSuccessMsg(null);
      setErrorMsg(null);
      setRecordingTime(0);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioFile(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setMeetingData(null);
      setIsEditing(false);
      setSuccessMsg(null);
      setErrorMsg(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleProcessMeeting = async () => {
    if (!audioFile) return;
    setProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsEditing(false);

    try {
      const CHUNK_SIZE = 2 * 1024 * 1024;
      const totalChunks = Math.ceil(audioFile.size / CHUNK_SIZE);
      const fileId = `upload_${Date.now()}`;
      let finalPath = '';

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioFile.size);
        const chunk = audioFile.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileId', fileId);

        const uploadRes = await fetch('/api/meetings/upload-chunk', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        
        if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
        if (uploadData.finalPath) finalPath = uploadData.finalPath;
      }

      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Duration-Seconds': recordingTime.toString(),
        },
        body: JSON.stringify({ finalPath, mimeType: (audioFile as File).type || 'audio/webm', meetingName, extraContext }),
      });

      const data = await res.json();
      if (data.success) {
        setMeetingData(data.result);
        setActiveFileId(data.fileId); // Set the returned fileId
        setSuccessMsg(`Meeting successfully analyzed! Extracted ${data.result.actionItems?.length || 0} action items and ${data.result.aiDoctrines?.length || 0} doctrines.`);
        fetchHistory();
      } else {
        setErrorMsg('Error processing meeting: ' + data.error);
      }
    } catch (e) {
      setErrorMsg('Network error while processing meeting.');
    } finally {
      setProcessing(false);
    }
  };

  const handleHistoryClick = (file: any, parsed: any) => {
    setMeetingData(parsed);
    setActiveFileId(file.id);
    setMeetingName(file.name.replace('.json', ''));
    setIsEditing(false);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const startEditing = () => {
    setEditTitle(meetingName || 'Reunión sin título');
    setEditSummary(meetingData?.summary || '');
    setEditTranscript(meetingData?.transcript || '');
    setEditActionItems(meetingData?.actionItems ? [...meetingData.actionItems] : []);
    setEditDoctrines(meetingData?.aiDoctrines ? [...meetingData.aiDoctrines] : []);
    setIsEditing(true);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = (isEditing ? editTitle : meetingName) || 'Acta_Reunion';
    window.print();
    document.title = originalTitle;
  };

  const saveEdits = async () => {
    if (!activeFileId) return;
    try {
      const res = await fetch('/api/meetings/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: activeFileId,
          title: editTitle,
          summary: editSummary,
          transcript: editTranscript,
          actionItems: editActionItems,
          aiDoctrines: editDoctrines
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setMeetingData({
          ...meetingData,
          summary: editSummary,
          transcript: editTranscript,
          actionItems: editActionItems,
          aiDoctrines: editDoctrines
        });
        setMeetingName(editTitle);
        setIsEditing(false);
        setSuccessMsg('¡Cambios guardados correctamente!');
        fetchHistory();
      } else {
        setErrorMsg('Error al guardar: ' + data.error);
      }
    } catch (e) {
      setErrorMsg('Error de red al guardar.');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:hidden">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 mb-2">
            <Users className="w-6 h-6 text-[#FF002C]" /> Meeting Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Graba o sube reuniones. La IA transcribirá, extraerá tareas, limpiará muletillas y te permitirá editar todo el resultado manualmente.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-sm text-red-200 text-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-sm text-green-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}

        {/* Grabador / Upload */}
        <div className="flex flex-col items-center p-8 rounded-sm bg-[#0f1218] border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF002C] to-transparent opacity-20" />
          
          <div className="text-3xl font-mono font-bold text-white mb-8 tracking-widest">
            {formatTime(recordingTime)}
          </div>

          {!recording ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-[#FF002C] hover:bg-red-700 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,44,0.3)] flex items-center justify-center"
              >
                <Mic className="w-8 h-8 text-white" />
              </button>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-500 font-bold">O</span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-sm border border-white/20 text-slate-300 text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Subir Archivo de Audio
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="audio/*"
                onChange={handleFileUpload} 
              />
            </div>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-slate-800 border-2 border-[#FF002C] hover:bg-slate-700 transition-all flex items-center justify-center animate-pulse"
            >
              <Square className="w-8 h-8 text-[#FF002C] fill-current" />
            </button>
          )}
          <p className="text-xs text-slate-500 font-bold mt-4">
            {recording ? 'Grabando... Toca para detener' : 'Toca el micro para grabar'}
          </p>
        </div>

        {/* Opciones Pre-Procesamiento (Siempre visibles) */}
        {!meetingData && (
          <div className="space-y-4 max-w-lg mx-auto mt-6 w-full print:hidden">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Nombre de la Reunión (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Junta Directiva Q3"
                className="w-full bg-[#0f1218] border border-white/10 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm"
                value={meetingName}
                onChange={(e) => setMeetingName(e.target.value)}
                disabled={processing}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Instrucciones previas para la IA (Opcional)</label>
              <textarea
                placeholder="Ej. Enfócate en la estrategia comercial de 2027..."
                className="w-full bg-[#0f1218] border border-white/10 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 h-20 resize-none text-sm"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                disabled={processing}
              />
            </div>
          </div>
        )}

        {audioUrl && !meetingData && (
          <div className="flex flex-col items-center gap-4 mt-6 print:hidden">
            <audio controls src={audioUrl} className="w-full max-w-md" />
            <button
              onClick={handleProcessMeeting}
              disabled={processing}
              className="px-6 py-3 rounded-sm bg-[#FF002C] text-white font-black text-sm hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              {processing ? 'Extrayendo Inteligencia...' : 'Procesar Reunión con IA'}
            </button>
          </div>
        )}

        {meetingData && (
          <div className="mt-8">
            <div className="flex justify-between mb-4 print:hidden">
              <h2 className="text-xl font-bold text-white">{isEditing ? 'Modo Edición' : meetingName}</h2>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <button onClick={startEditing} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-2 transition-colors">
                      <Edit3 className="w-4 h-4" /> Editar
                    </button>
                    <button onClick={handlePrint} className="bg-[#FF002C] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-2 transition-colors">
                      <FileText className="w-4 h-4" /> Exportar a PDF
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(false)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-2 transition-colors">
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button onClick={saveEdits} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-sm text-xs flex items-center gap-2 transition-colors">
                      <Save className="w-4 h-4" /> Guardar Cambios
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mb-6 p-4 bg-[#0f1218] border border-white/10 rounded-sm print:hidden">
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Título del Acta</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-white/10 rounded-sm py-2 px-3 text-slate-200 focus:outline-none focus:border-red-500 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-400" /> Resumen Ejecutivo
                  </h3>
                  {isEditing ? (
                    <textarea 
                      className="w-full h-32 bg-slate-900 border border-white/10 rounded-sm p-3 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed">{meetingData.summary}</p>
                  )}
                </div>

                {/* Transcript */}
                <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-purple-400" /> Transcripción Completa
                  </h3>
                  {isEditing ? (
                    <textarea 
                      className="w-full h-64 bg-slate-900 border border-white/10 rounded-sm p-3 text-slate-200 text-xs focus:outline-none focus:border-red-500 custom-scrollbar"
                      value={editTranscript}
                      onChange={(e) => setEditTranscript(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {meetingData.transcript?.split('\n').map((line: string, i: number) => {
                        if (!line.trim()) return null;
                        const isSpeaker = line.includes(':');
                        return (
                          <p key={i} className="text-xs text-slate-300 leading-relaxed">
                            {isSpeaker ? (
                              <>
                                <strong className="text-slate-100 font-bold">{line.split(':')[0]}:</strong>
                                {line.substring(line.indexOf(':') + 1)}
                              </>
                            ) : (
                              line
                            )}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Action Items */}
                <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                    <ListTodo className="w-4 h-4 text-green-400" /> Tareas Extraídas
                  </h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      {editActionItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-slate-900 border border-white/10 rounded-sm p-2 text-slate-200 text-xs focus:outline-none focus:border-red-500"
                            value={item}
                            onChange={(e) => {
                              const newArr = [...editActionItems];
                              newArr[idx] = e.target.value;
                              setEditActionItems(newArr);
                            }}
                          />
                          <button onClick={() => setEditActionItems(editActionItems.filter((_, i) => i !== idx))} className="px-3 bg-red-900/50 text-red-400 hover:bg-red-900 rounded-sm"><X className="w-4 h-4"/></button>
                        </div>
                      ))}
                      <button onClick={() => setEditActionItems([...editActionItems, 'Nueva tarea...'])} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-sm flex items-center justify-center gap-2"><Plus className="w-3 h-3"/> Agregar Tarea</button>
                    </div>
                  ) : (
                    meetingData.actionItems && meetingData.actionItems.length > 0 ? (
                      <ul className="space-y-2">
                        {meetingData.actionItems.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900 p-3 border border-white/5 rounded-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No action items detected.</p>
                    )
                  )}
                </div>

                {/* Doctrines */}
                <div className="p-5 rounded-sm bg-[#0f1218] border border-[#FF002C]/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF002C]/5 rounded-full blur-3xl" />
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4 relative z-10">
                    <Brain className="w-4 h-4 text-[#FF002C]" /> Doctrinas Aprendidas
                  </h3>
                  
                  {isEditing ? (
                    <div className="space-y-4 relative z-10">
                      {editDoctrines.map((doc, idx) => (
                        <div key={idx} className="space-y-2 bg-slate-900 p-3 rounded-sm border border-white/5">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase text-slate-500 font-bold">Título de la Regla</label>
                            <button onClick={() => setEditDoctrines(editDoctrines.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X className="w-3 h-3"/></button>
                          </div>
                          <input 
                            type="text" 
                            className="w-full bg-[#0f1218] border border-white/10 rounded-sm p-2 text-[#FF002C] text-xs focus:outline-none focus:border-red-500 font-bold"
                            value={doc.title}
                            onChange={(e) => {
                              const newArr = [...editDoctrines];
                              newArr[idx].title = e.target.value;
                              setEditDoctrines(newArr);
                            }}
                          />
                          <label className="text-[10px] uppercase text-slate-500 font-bold mt-2 block">Descripción</label>
                          <textarea 
                            className="w-full h-16 bg-[#0f1218] border border-white/10 rounded-sm p-2 text-slate-300 text-xs focus:outline-none focus:border-red-500"
                            value={doc.rule}
                            onChange={(e) => {
                              const newArr = [...editDoctrines];
                              newArr[idx].rule = e.target.value;
                              setEditDoctrines(newArr);
                            }}
                          />
                        </div>
                      ))}
                      <button onClick={() => setEditDoctrines([...editDoctrines, { title: 'Nueva Regla', rule: 'Descripción de la regla...' }])} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-sm flex items-center justify-center gap-2"><Plus className="w-3 h-3"/> Agregar Doctrina</button>
                    </div>
                  ) : (
                    meetingData.aiDoctrines && meetingData.aiDoctrines.length > 0 ? (
                      <ul className="space-y-3 relative z-10">
                        {meetingData.aiDoctrines.map((doc: any, i: number) => (
                          <li key={i} className="text-xs text-white bg-black/40 p-3 border border-[#FF002C]/20 rounded-sm">
                            <strong className="block text-[#FF002C] mb-1">{doc.title}</strong>
                            <span className="text-slate-300">{doc.rule}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic relative z-10">No new CRM/AI doctrines extracted from this meeting.</p>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 print:hidden">
        <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10 h-full max-h-[800px] overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[#FF002C]" /> Historial de Actas
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Historial de reuniones procesadas. Haz clic en cualquiera para visualizarla, editarla o exportarla.
          </p>

          <div className="space-y-3">
            {history.map((file, i) => {
              let parsed: any = {};
              try { parsed = JSON.parse(file.aiSummary || '{}'); } catch(e) {}
              
              const isSelected = activeFileId === file.id;

              return (
                <div key={i} className={`p-4 rounded-sm border transition-all cursor-pointer ${isSelected ? 'bg-slate-800 border-[#FF002C]' : 'bg-slate-900 border-white/5 hover:border-white/20'}`} onClick={() => handleHistoryClick(file, parsed)}>
                  <div className="flex justify-between items-start mb-2">
                    <strong className={`text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>{file.name.replace('.json', '')}</strong>
                    <span className="text-[10px] text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {parsed.summary || 'Acta de reunión procesada.'}
                  </p>
                </div>
              );
            })}
            
            {history.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-10">No hay reuniones grabadas aún.</p>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* DEDICATED PRINT LAYOUT */}
    {meetingData && (
      <div id="print-document" className="hidden print:block bg-white text-black font-sans w-full max-w-4xl mx-auto">
          <div className="border-b-4 border-black pb-6 mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-black text-black uppercase tracking-widest">Acta de Reunión</h1>
              <p className="text-gray-500 mt-2 font-mono text-sm tracking-widest">{new Date().toLocaleDateString()} | REPORTE GENERADO POR IA</p>
            </div>
            <img src="/logo.svg" alt="Copper Giant" className="h-10 print:invert" />
          </div>

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Información de la Reunión</h2>
            <p className="text-xl font-bold text-black">{isEditing ? editTitle : meetingName || 'Reunión Sin Título'}</p>
          </div>

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Resumen Ejecutivo</h2>
            <p className="text-lg text-gray-800 leading-relaxed font-medium">{isEditing ? editSummary : meetingData.summary}</p>
          </div>

          {((isEditing ? editActionItems : meetingData.actionItems) || []).length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Tareas Extraídas</h2>
              <ul className="space-y-3">
                {(isEditing ? editActionItems : meetingData.actionItems).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-gray-800 text-lg">
                    <div className="w-5 h-5 border-2 border-black rounded-sm inline-block mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {((isEditing ? editDoctrines : meetingData.aiDoctrines) || []).length > 0 && (
            <div className="mb-10">
              <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Doctrinas Aprendidas</h2>
              <ul className="list-disc pl-6 space-y-3 text-gray-800 text-lg">
                {(isEditing ? editDoctrines : meetingData.aiDoctrines).map((doc: any, i: number) => (
                  <li key={i}>
                    <strong className="text-black">{doc.title}:</strong> {doc.rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-10">
            <h2 className="text-sm uppercase tracking-widest font-bold text-gray-500 border-b border-gray-300 pb-2 mb-4">Transcripción Completa</h2>
            <div className="space-y-4">
               {((isEditing ? editTranscript : meetingData.transcript) || '').split('\n').map((line: string, i: number) => {
                 if (!line.trim()) return null;
                 const isSpeaker = line.includes(':');
                 return (
                   <p key={i} className="text-sm text-gray-700 leading-relaxed transcript-line">
                     {isSpeaker ? (
                       <>
                         <strong className="text-black font-bold uppercase">{line.split(':')[0]}:</strong>
                         {line.substring(line.indexOf(':') + 1)}
                       </>
                     ) : (
                       line
                     )}
                   </p>
                 );
               })}
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Meeting Intelligence beta v1.2</p>
            <p className="text-xs text-gray-400 font-mono">Confidential & Proprietary</p>
          </div>
        </div>
      )}
    </>
  );
};
