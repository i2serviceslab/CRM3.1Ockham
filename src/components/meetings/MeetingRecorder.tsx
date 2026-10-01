'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save, Users, Brain, ListTodo, FileText, CheckCircle2, Upload } from 'lucide-react';

export const MeetingRecorder: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  
  const [meetingData, setMeetingData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioUrl(reader.result as string);
        setMeetingData(null);
        setSuccessMsg(null);
        setErrorMsg(null);
        setRecordingTime(0); // Will show 00:00 for uploaded files
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingTime(0);
      setMeetingData(null);
      setSuccessMsg(null);
      setErrorMsg(null);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone permission denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/meetings/history');
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleProcessMeeting = async () => {
    if (!audioUrl) return;

    setProcessing(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioDataUrl: audioUrl, durationSeconds: recordingTime }),
      });

      const data = await res.json();
      if (data.success) {
        setMeetingData(data.result);
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-[#FF002C]" /> Meeting Intelligence
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Record team or investor meetings. The AI will diarize speakers, extract action items, and update its own Doctrine based on strategy decisions.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
          <p className="text-sm text-green-400 font-medium">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-sm">
          <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="p-10 rounded-sm bg-slate-900 border border-white/10 flex flex-col items-center justify-center text-center">
        <div className="text-4xl font-mono text-white font-black tracking-widest mb-6">
          {formatTime(recordingTime)}
        </div>

        {!recording ? (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-[#FF002C] hover:bg-red-600 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,0,44,0.3)] hover:shadow-[0_0_50px_rgba(255,0,44,0.5)]"
            >
              <Mic className="w-8 h-8 text-white" />
            </button>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-500 font-bold">OR</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-full border border-white/20 text-slate-300 text-xs font-bold hover:bg-white/5 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Audio File
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
          {recording ? 'Recording... Tap to stop' : 'Tap mic to start meeting recording'}
        </p>
      </div>

      {audioUrl && !meetingData && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <audio controls src={audioUrl} className="w-full max-w-md" />
          <button
            onClick={handleProcessMeeting}
            disabled={processing}
            className="px-6 py-3 rounded-sm bg-[#FF002C] text-white font-black text-sm hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Brain className="w-4 h-4" />
            {processing ? 'Extracting Intelligence...' : 'Process Meeting with AI'}
          </button>
        </div>
      )}

      {meetingData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="space-y-6">
            <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-blue-400" /> Executive Summary
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">{meetingData.summary}</p>
            </div>

            <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-purple-400" /> Full Transcript (Diarized)
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {meetingData.transcript.split('\n').map((line: string, i: number) => {
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
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 rounded-sm bg-[#0f1218] border border-white/10">
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
                <ListTodo className="w-4 h-4 text-green-400" /> Action Items Pipeline
              </h3>
              {meetingData.actionItems && meetingData.actionItems.length > 0 ? (
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
              )}
            </div>

            <div className="p-5 rounded-sm bg-[#0f1218] border border-[#FF002C]/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF002C]/5 rounded-full blur-3xl" />
              <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4 relative z-10">
                <Brain className="w-4 h-4 text-[#FF002C]" /> AI Doctrines Learned
              </h3>
              <p className="text-xs text-slate-400 mb-4 relative z-10">
                These rules have been automatically saved to the Media Vault Doctrine folder and permanently added to the AI's memory.
              </p>
              {meetingData.aiDoctrines && meetingData.aiDoctrines.length > 0 ? (
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
              )}
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-sm bg-slate-900 border border-white/10 h-full max-h-[800px] overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-blue-400" /> Historial de Actas
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Historial permanente de las reuniones procesadas. El audio pesado no se almacena en el servidor para ahorrar espacio, pero el acta, el resumen y las tareas se guardan para siempre.
          </p>

          <div className="space-y-3">
            {history.map((file, i) => {
              let parsed: any = {};
              try { parsed = JSON.parse(file.aiSummary || '{}'); } catch(e) {}
              
              return (
                <div key={i} className="p-4 bg-[#0f1218] border border-white/5 rounded-sm hover:border-white/20 transition-all cursor-pointer" onClick={() => setMeetingData(parsed)}>
                  <div className="flex justify-between items-start mb-2">
                    <strong className="text-sm text-slate-200">{file.name.replace('.json', '')}</strong>
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
  );
};
