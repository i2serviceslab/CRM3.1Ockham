import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    code = f.read()

# 1. Add Upload to imports
code = code.replace("import { Mic, Square, Save, Users, Brain, ListTodo, FileText, CheckCircle2 } from 'lucide-react';", "import { Mic, Square, Save, Users, Brain, ListTodo, FileText, CheckCircle2, Upload } from 'lucide-react';")

# 2. Add file input ref and handler
ref_insert = """  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const startRecording = async () => {"""
code = code.replace("  const startRecording = async () => {", ref_insert)

# 3. Add the upload button to the UI
old_ui = """        {!recording ? (
          <button
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-[#FF002C] hover:bg-red-600 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(255,0,44,0.3)] hover:shadow-[0_0_50px_rgba(255,0,44,0.5)]"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
        ) : ("""

new_ui = """        {!recording ? (
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
        ) : ("""
code = code.replace(old_ui, new_ui)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(code)

print("Upload logic added to UI")
