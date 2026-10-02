import os

with open('src/components/hermes/HermesAgentStudio.tsx', 'r') as f:
    code = f.read()

old_content = """                        {/* Markdown / Text Content */}
                        <div className="whitespace-pre-wrap font-sans space-y-2">
                          {m.content}
                        </div>"""

new_content = """                        {/* Markdown / Text Content */}
                        <div className="whitespace-pre-wrap font-sans space-y-2">
                          {m.content ? m.content : (
                             m.workerStatus === 'running' && !isUser ? (
                               <div className="flex flex-col items-center justify-center py-4 space-y-3">
                                 <RefreshCw className="w-5 h-5 text-[var(--accent-primary)] animate-spin" />
                                 <span className="text-[11px] font-mono text-neutral-400 animate-pulse">Analizando información y procesando plugins...</span>
                               </div>
                             ) : null
                          )}
                          {m.workerStatus === 'running' && m.content && !isUser && (
                            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-neutral-400 bg-black/20 p-2 rounded border border-white/5 inline-flex">
                              <RefreshCw className="w-3 h-3 text-[var(--accent-primary)] animate-spin" />
                              <span className="animate-pulse">Trabajando...</span>
                            </div>
                          )}
                        </div>"""

code = code.replace(old_content, new_content)

# Add loader to Worker badge as well
old_badge = """                          {m.workerStatus === 'completed' && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}"""
new_badge = """                          {m.workerStatus === 'completed' && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                          {m.workerStatus === 'running' && (
                            <RefreshCw className="w-3 h-3 text-[var(--accent-primary)] animate-spin" />
                          )}"""

code = code.replace(old_badge, new_badge)

with open('src/components/hermes/HermesAgentStudio.tsx', 'w') as f:
    f.write(code)

print("Hermes UI patched!")
