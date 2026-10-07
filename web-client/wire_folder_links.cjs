const fs = require('fs');

let path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure useNavigate is imported
if (!content.includes('useNavigate')) {
  content = content.replace("import { Link } from 'react-router-dom';", "import { Link, useNavigate } from 'react-router-dom';");
}

if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace("const [activeMenu, setActiveMenu] = useState(null);", "const [activeMenu, setActiveMenu] = useState(null);\n  const navigate = useNavigate();");
}

const folders = ['Documents', 'Projects', 'Photos', 'Videos', 'Music', 'Work'];

folders.forEach(f => {
  // Find the folder container.
  // We know the container is <div className="group relative bg-surface-primary hover:bg-surface-hover p-4 rounded-xl ... cursor-pointer...">
  // followed closely by `<div className="flex items-start justify-between">`
  // and the folder name is inside an `<h3>` later.
  
  // A regex to find the start of the folder div
  // Because they are distinct, we can just replace `<div className="group relative bg-surface-primary hover:bg-surface-hover p-4 rounded-xl`
  // Actually, we need to know WHICH folder it is to insert the correct `navigate`.
  
  let regex = new RegExp(`(<div className="group relative bg-surface-primary hover:bg-surface-hover p-4 rounded-xl[^>]*?cursor-pointer[^>]*?>)([\\s\\S]*?<h3[^>]*>${f}<\/h3>)`, 'i');
  
  content = content.replace(regex, (match, divOpen, rest) => {
    if (!divOpen.includes('onClick=')) {
       let newDivOpen = divOpen.replace('<div ', `<div onClick={(e) => { if (e.target.closest('button') || e.target.closest('.absolute.top-10')) return; navigate('/folder/${f.toLowerCase()}'); }} `);
       return newDivOpen + rest;
    }
    return match;
  });
});

fs.writeFileSync(path, content);
console.log("Refactored folder links.");
