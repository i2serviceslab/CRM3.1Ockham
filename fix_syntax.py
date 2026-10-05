import re

with open('src/components/meetings/MeetingRecorder.tsx', 'r') as f:
    tsx = f.read()

target = """          <div className="mt-16 pt-8 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Generado automáticamente por Meeting Intelligence CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
};"""

new = """          <div className="mt-16 pt-8 border-t border-gray-300 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Generado automáticamente por Meeting Intelligence CRM</p>
          </div>
        </div>
      )}
    </div>
  );
};"""

tsx = tsx.replace(target, new)

with open('src/components/meetings/MeetingRecorder.tsx', 'w') as f:
    f.write(tsx)

print("Syntax fixed")
