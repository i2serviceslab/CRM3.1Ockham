import re

with open('src/components/roadshows/RoadshowManager.tsx', 'r') as f:
    code = f.read()

search_h3 = '<h3 className="text-lg font-black text-white">{event.summitName}</h3>'
replace_h3 = """<div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-white">{event.summitName}</h3>
                  <button onClick={(e) => handleDeleteEvent(event.id, e)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors" title="Eliminar Evento">
                    <Trash2 size={18} />
                  </button>
                </div>"""

if search_h3 in code:
    code = code.replace(search_h3, replace_h3)
    print("Replaced h3 successfully!")
else:
    print("Could not find h3!")

with open('src/components/roadshows/RoadshowManager.tsx', 'w') as f:
    f.write(code)

