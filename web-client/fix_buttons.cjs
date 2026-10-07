const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// The issue is that `<button onClick={...} className="... transition-colors" \n<span` is missing `>`
// The exact string we split on was `title="Folder options">` which was lost.
// So we can find: `transition-colors" \n<span className="material-symbols-outlined"`
// and replace it with: `transition-colors" title="Folder options">\n<span className="material-symbols-outlined"`
// We might also have spaces or newlines. Let's use a regex.

let fixedContent = content.replace(/transition-colors"\s*\r?\n\s*<span className="material-symbols-outlined"/g, 'transition-colors" title="Folder options">\n<span className="material-symbols-outlined"');

fs.writeFileSync(path, fixedContent);
console.log("Fixed buttons!");
