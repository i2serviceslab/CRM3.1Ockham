import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    code = f.read()

# Replace Voice Notes with Meeting Recorder
code = code.replace("id: 'voice-notes', label: 'Voice Notes', icon: Mic", "id: 'meetings', label: 'Meeting Intelligence', icon: Mic")

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(code)

with open('src/app/page.tsx', 'r') as f:
    page_code = f.read()

# Add import for MeetingRecorder
import_statement = "import { MeetingRecorder } from '@/components/meetings/MeetingRecorder';\n"
page_code = page_code.replace("import { VoiceNoteRecorder } from '@/components/contacts/VoiceNoteRecorder';", 
                              "import { VoiceNoteRecorder } from '@/components/contacts/VoiceNoteRecorder';\n" + import_statement)

# Replace the activeTab mapping for voice-notes -> meetings
old_tab = """          {activeTab === 'voice-notes' && (
            <VoiceNoteRecorder contacts={contacts} onSuccess={fetchContacts} />
          )}"""
new_tab = """          {activeTab === 'meetings' && (
            <MeetingRecorder />
          )}"""
page_code = page_code.replace(old_tab, new_tab)

with open('src/app/page.tsx', 'w') as f:
    f.write(page_code)

print("Sidebar and page updated.")
