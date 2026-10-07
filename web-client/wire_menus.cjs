const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// The folders
const folders = ['Documents', 'Photos', 'Videos', 'Music', 'Work'];

folders.forEach(f => {
  // Find the button for this folder. We can look for the folder name first.
  const regex = new RegExp(`(<h3[^>]*>${f}<\/h3>)`, 'i');
  if (regex.test(content)) {
    // We want to find the <button title="Folder options"> just before this h3.
    // It's a bit tricky with regex, let's just do a string replacement targeting the exact folder block.
    // Actually, we can use a simpler approach. 
  }
});

// Since it's easier, let's replace by finding `<button className="text-text-muted group-hover:text-text-primary p-1 hover:bg-surface-secondary rounded transition-colors" title="Folder options">`
// Wait, each folder has a different name. Let's just do a manual replace or regex with capture group.

// Let's replace the <button ... title="Folder options">... </button> with one that parses the name?
// The name is in an <h3> below it.
let chunks = content.split('title="Folder options">');
for (let i = 0; i < chunks.length - 1; i++) {
  // chunks[i] ends with `<button ... `
  // chunks[i+1] starts with `\n<span class="material...` and eventually has `<h3>FolderName</h3>`
  let match = chunks[i+1].match(/<h3[^>]*>(.*?)<\/h3>/);
  if (match) {
    let folderName = match[1];
    
    // We need to find where the button closes `</button>`
    let btnEnd = chunks[i+1].indexOf('</button>');
    if (btnEnd !== -1) {
       let remainder = chunks[i+1].substring(btnEnd + 9);
       let insideBtn = chunks[i+1].substring(0, btnEnd + 9);
       
       // Add onClick to the button opening tag which is at the end of chunks[i]
       let btnOpenStart = chunks[i].lastIndexOf('<button');
       let beforeBtn = chunks[i].substring(0, btnOpenStart);
       let btnOpen = chunks[i].substring(btnOpenStart);
       
       btnOpen = btnOpen.replace('<button ', `<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu('${folderName}'); }} `);
       
       let menuHtml = `\n<ContextMenu id="${folderName}" title="${folderName}" type="Folder" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />`;
       
       // Reconstruct
       chunks[i] = beforeBtn;
       chunks[i+1] = btnOpen + insideBtn + menuHtml + remainder;
    }
  }
}
content = chunks.join('');

// Also fix files: `<button className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-primary">`
let fileChunks = content.split('hover:bg-surface-primary">');
for (let i = 0; i < fileChunks.length - 1; i++) {
  let match = fileChunks[i+1].match(/<span className="text-label-md[^>]*>(.*?)<\/span>/);
  if (match && fileChunks[i].includes('more_horiz')) {
      // It's already split, wait, the button opening tag is at the end of fileChunks[i]
      // Wait, if it has `more_horiz` it's in fileChunks[i+1]
      // Let's just skip regex and do it manually if it fails, or rely on a generic approach.
  }
}

// Write it back
fs.writeFileSync(path, content);
console.log("Refactored context menus.");
