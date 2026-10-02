import os
import re

with open('src/components/pipeline/KanbanPipeline.tsx', 'r') as f:
    code = f.read()

# 1. Add state and fetch logic
state_marker = "const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);"
new_state = """const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };"""
code = code.replace(state_marker, new_state)

# Refresh logs when onRefresh is called or drag drop happens
refresh_marker = "const handleChangeStage = async (contactId: string, newStage: string) => {"
new_refresh = """const handleChangeStage = async (contactId: string, newStage: string) => {
    fetchAuditLogs();"""
code = code.replace(refresh_marker, new_refresh)


# 2. Add UI before Modal
ui_marker = "{/* Task & Alert Creator Modal */}"
new_ui = """{/* GLOBAL ACTIVITY LOG */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
          <span>Historial de Acciones del Sistema</span>
        </h3>
        
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No hay actividad reciente registrada en el sistema.</p>
          ) : (
            auditLogs.map((log: any) => (
              <div key={log.id} className="flex gap-3 text-xs bg-black/20 p-3 rounded-lg border border-white/5">
                <div className="mt-0.5 shrink-0">
                  {log.action.includes('CONTACT') ? (
                    <User className="w-4 h-4 text-blue-400" />
                  ) : log.action.includes('POST') || log.action.includes('SOCIAL') ? (
                    <MessageSquare className="w-4 h-4 text-green-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-slate-300">
                    {log.description}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task & Alert Creator Modal */}"""
code = code.replace(ui_marker, new_ui)

with open('src/components/pipeline/KanbanPipeline.tsx', 'w') as f:
    f.write(code)

print("Kanban UI updated!")
