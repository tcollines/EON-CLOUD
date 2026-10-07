const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const missingFolders = ['Photos', 'Videos', 'Music', 'Work'];

missingFolders.forEach(f => {
  // We look for `<h3 className="...">FolderName</h3>`
  // The button for it is before the <h3>.
  
  // Find the exact button
  let regex = new RegExp(`(<button[^>]*class[^>]*)(>\\s*<span[^>]*>more_vert</span>\\s*</button>)([\\s\\S]*?<h3[^>]*>${f}<\/h3>)`);
  content = content.replace(regex, (match, btnStart, btnEnd, rest) => {
    // If it already has onClick, skip
    if (btnStart.includes('onClick')) return match;
    
    let newBtn = `${btnStart} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu('${f}'); }}${btnEnd}`;
    let menu = `\n<ContextMenu id="${f}" title="${f}" type="Folder" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />`;
    return newBtn + menu + rest;
  });
});

fs.writeFileSync(path, content);
console.log("Fixed missing folders.");
