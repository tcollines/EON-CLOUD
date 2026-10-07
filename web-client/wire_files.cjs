const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const files = ['project.zip', 'proposal.pdf', 'assets_v2.fig'];

files.forEach(f => {
  // Replace the button manually because there's only 3
  // They look like this:
  // <button className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-primary">
  // <span className="material-symbols-outlined" style={{"fontSize":"18px"}}>more_horiz</span>
  // </button>
  // and inside their container, somewhere down there is `<span className="text-label-md... truncate">${f}</span>`
  
  let regex = new RegExp(`(<button[^>]*>\\s*<span[^>]*>more_horiz</span>\\s*</button>)([\\s\\S]*?)(<span[^>]*>${f}</span>)`);
  content = content.replace(regex, (match, btn, middle, title) => {
    let newBtn = btn.replace('<button ', `<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu('${f}'); }} `);
    let menu = `\n<ContextMenu id="${f}" title="${f}" type="File" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />`;
    return newBtn + menu + middle + title;
  });
});

fs.writeFileSync(path, content);
console.log("Refactored file menus.");
