import re

# 1. Update CSS Margins
with open('src/app/globals.css', 'r') as f:
    css = f.read()

target_css = """  #print-document {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 21cm !important;
    margin: 0 auto !important;
    padding: 2.54cm !important; /* Standard 1-inch margins */
    background-color: white !important;
    color: black !important;
    box-sizing: border-box !important;
  }"""

new_css = """  #print-document {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 21cm !important;
    margin: 0 auto !important;
    padding: 1.5cm 2cm !important; /* Elegant tighter margins */
    background-color: white !important;
    color: black !important;
    box-sizing: border-box !important;
  }
  
  .transcript-line {
    text-align: justify;
    margin-bottom: 1rem;
  }"""

css = css.replace(target_css, new_css)

with open('src/app/globals.css', 'w') as f:
    f.write(css)


# 2. Update TSX for Transcript chunking
with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

target_tsx = """               {((isEditing ? editTranscript : meetingData.transcript) || '').split('\\n').map((line: string, i: number) => {
                 if (!line.trim()) return null;
                 const isSpeaker = line.includes(':');
                 return (
                   <p key={i} className="text-[12px] text-gray-700 leading-relaxed transcript-line">
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
               })}"""

new_tsx = """               {(() => {
                 const rawText = (isEditing ? editTranscript : meetingData.transcript) || '';
                 
                 // If the text is a giant wall of text (Whisper default), let's chunk it intelligently
                 let lines = rawText.split('\\n');
                 if (lines.length < 3 && rawText.length > 500) {
                   const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
                   lines = [];
                   let current = '';
                   sentences.forEach(s => {
                     current += s.trim() + ' ';
                     if (current.length > 350) {
                       lines.push(current.trim());
                       current = '';
                     }
                   });
                   if (current) lines.push(current.trim());
                 }

                 return lines.map((line: string, i: number) => {
                   if (!line.trim()) return null;
                   const isSpeaker = line.includes(':') && line.indexOf(':') < 30; // Basic check to avoid breaking on normal colons
                   return (
                     <p key={i} className="text-[13px] text-gray-800 leading-[1.8] transcript-line">
                       {isSpeaker ? (
                         <>
                           <strong className="text-black font-black uppercase">{line.split(':')[0]}:</strong>
                           {line.substring(line.indexOf(':') + 1)}
                         </>
                       ) : (
                         line
                       )}
                     </p>
                   );
                 });
               })()}"""

tsx = tsx.replace(target_tsx, new_tsx)

# I should also update the NON-PRINT transcript view to use this same logic so it looks good in the UI too!
target_ui_transcript = """                {meetingData.transcript?.split('\\n').map((line: string, i: number) => {
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
                      })}"""

new_ui_transcript = """                {(() => {
                        const rawText = meetingData.transcript || '';
                        let lines = rawText.split('\\n');
                        if (lines.length < 3 && rawText.length > 500) {
                          const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
                          lines = [];
                          let current = '';
                          sentences.forEach(s => {
                            current += s.trim() + ' ';
                            if (current.length > 350) {
                              lines.push(current.trim());
                              current = '';
                            }
                          });
                          if (current) lines.push(current.trim());
                        }

                        return lines.map((line: string, i: number) => {
                          if (!line.trim()) return null;
                          const isSpeaker = line.includes(':') && line.indexOf(':') < 30;
                          return (
                            <p key={i} className="text-xs text-slate-300 leading-relaxed mb-3 text-justify pr-4">
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
                        });
                      })()}"""

tsx = tsx.replace(target_ui_transcript, new_ui_transcript)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("Transcript chunking and layout fixed!")
