const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Inject state
if (!content.includes('const [selectedItems')) {
  const stateInjection = `const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [folderColors, setFolderColors] = useState({
    Documents: 'folder-documents',
    Projects: 'folder-projects',
    Photos: 'folder-photos',
    Videos: 'folder-videos',
    Music: 'folder-music',
    Work: 'folder-work'
  });

  const toggleSelection = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const foldersData = [
    { name: 'Documents', files: 42, size: '3.8 GB' },
    { name: 'Projects', files: 18, size: '14.2 GB' },
    { name: 'Photos', files: 1240, size: '48.6 GB' },
    { name: 'Videos', files: 28, size: '184 GB' },
    { name: 'Music', files: 310, size: '6.4 GB' },
    { name: 'Work', files: 85, size: '9.1 GB' }
  ];
`;
  content = content.replace("const [activeMenu, setActiveMenu] = useState(null);\n  const navigate = useNavigate();", stateInjection);
}

// 2. Dynamic Selection Bar
const oldSelectionBarRegex = /<div className="flex items-center gap-2 px-3 py-1.5 bg-surface-selected rounded-lg border border-border-base">([\s\S]*?)<div className="flex items-center gap-1 ml-2 border-l border-border-base pl-2">([\s\S]*?)<\/div>\s*<\/div>/;

const newSelectionBar = `<div className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 \${selectedItems.size > 0 ? 'bg-surface-selected border border-border-base opacity-100' : 'opacity-0 pointer-events-none'}\`}>
<span className="text-label-sm font-label-sm font-semibold text-text-primary flex items-center gap-1.5 whitespace-nowrap">
<span className="w-2 h-2 rounded-full bg-primary-container"></span>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
<div className="flex items-center gap-1 ml-2 border-l border-border-base pl-2">
<button className="p-1 hover:bg-surface-primary rounded text-text-secondary hover:text-text-primary" title="Download">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>download</span>
</button>
<button className="p-1 hover:bg-surface-primary rounded text-text-secondary hover:text-text-primary" title="Share">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>share</span>
</button>
<button className="p-1 hover:bg-surface-primary rounded text-text-secondary hover:text-text-primary" title="Move">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>drive_file_move</span>
</button>
</div>
</div>`;

content = content.replace(oldSelectionBarRegex, newSelectionBar);

// 3. Dynamic Folders block
// We need to find the entire folders grid.
// Start at: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">`
// End at: `</section>` which comes right after the grid.
let foldersGridRegex = /(<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">)[\s\S]*?(<\/section>)/;

const newFoldersGrid = `$1
{foldersData.map(f => {
  const isSelected = selectedItems.has(f.name);
  const colorClass = folderColors[f.name];
  const borderClass = isSelected ? \`border-2 border-\${colorClass}/50\` : 'border border-border-base';
  
  return (
    <div key={f.name} onClick={(e) => { if (e.target.closest('button') || e.target.closest('.absolute.top-10')) return; navigate('/folder/' + f.name.toLowerCase()); }} className={\`group relative bg-surface-primary hover:bg-surface-hover p-4 rounded-xl transition-all duration-150 cursor-pointer shadow-sm hover:shadow \${borderClass}\`}>
      <div className="flex items-start justify-between">
        <div className="relative w-12 h-10 flex items-center justify-center">
          <div className={\`absolute inset-0 bg-\${colorClass}/15 rounded-lg border border-\${colorClass}/30\`}></div>
          <span className={\`material-symbols-outlined text-\${colorClass} material-symbols-fill\`} style={{fontSize:"28px"}}>folder</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Custom Selection Checkbox */}
          <button onClick={(e) => toggleSelection(e, f.name)} className={\`w-4 h-4 rounded border flex items-center justify-center transition-colors \${isSelected ? \`bg-\${colorClass} border-\${colorClass} text-white\` : 'border-border-base opacity-0 group-hover:opacity-100 hover:border-text-muted'}\`}>
            {isSelected && <span className="material-symbols-outlined" style={{fontSize: '12px', fontWeight: 'bold'}}>check</span>}
          </button>
          
          <div className="relative">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.name); }} className="text-text-muted group-hover:text-text-primary p-1 hover:bg-surface-secondary rounded transition-colors" title="Folder options">
              <span className="material-symbols-outlined" style={{fontSize:"18px"}}>more_vert</span>
            </button>
            <ContextMenu id={f.name} title={f.name} type="Folder" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} onChangeColor={(id, color) => setFolderColors(prev => ({ ...prev, [id]: color }))} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-label-lg font-label-lg font-semibold text-text-primary truncate">{f.name}</h3>
        <div className="flex items-center gap-2 mt-1 text-body-sm font-body-sm text-text-muted">
          <span>{f.files} files</span>
          <span>•</span>
          <span>{f.size}</span>
        </div>
      </div>
    </div>
  );
})}
</div>
$2`;

content = content.replace(foldersGridRegex, newFoldersGrid);

fs.writeFileSync(path, content);
console.log("Dashboard refactored!");
