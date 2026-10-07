const fs = require('fs');

const myFilesPath = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\MyFiles.jsx';

const newContent = `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ContextMenu from '../components/ContextMenu';

function MyFiles() {
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();

  const folders = [
    { name: 'Documents', modified: 'Oct 12, 2026', size: '3.8 GB', icon: 'folder', colorClass: 'text-folder-documents' },
    { name: 'Projects', modified: '4m ago', size: '14.2 GB', icon: 'folder', colorClass: 'text-folder-projects' },
    { name: 'Photos', modified: 'Oct 10, 2026', size: '48.6 GB', icon: 'folder', colorClass: 'text-folder-photos' },
    { name: 'Videos', modified: 'Oct 8, 2026', size: '184 GB', icon: 'folder', colorClass: 'text-folder-videos' },
    { name: 'Music', modified: 'Oct 5, 2026', size: '6.4 GB', icon: 'folder', colorClass: 'text-folder-music' },
    { name: 'Work', modified: 'Oct 1, 2026', size: '9.1 GB', icon: 'folder', colorClass: 'text-folder-work' },
  ];

  const files = [
    { name: 'product-video.mp4', modified: 'Today', size: '2.4 GB', icon: 'movie', colorClass: 'text-folder-videos' },
    { name: 'project.zip', modified: 'Yesterday', size: '840 MB', icon: 'folder_zip', colorClass: 'text-text-muted' },
    { name: 'proposal.pdf', modified: 'Oct 12, 2026', size: '4.2 MB', icon: 'picture_as_pdf', colorClass: 'text-error' },
    { name: 'assets_v2.fig', modified: 'Oct 11, 2026', size: '128 MB', icon: 'draw', colorClass: 'text-folder-projects' }
  ];

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-5xl mx-auto w-full pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">My Files</h1>
            <p className="text-body-md text-text-secondary">All your personal files and folders.</p>
          </div>
          <button className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-primary hover:bg-surface-hover text-text-primary border border-border-base rounded-lg text-label-md transition-colors shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
            Upload
          </button>
        </div>
        
        <div className="bg-surface-primary rounded-xl border border-border-base overflow-visible shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border-base bg-surface-secondary/50 text-label-sm font-label-sm text-text-muted uppercase tracking-wider">
            <div className="col-span-6">Name</div>
            <div className="col-span-3">Modified</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-1"></div>
          </div>
          
          {folders.map(f => (
            <div key={f.name} onClick={(e) => { if (e.target.closest('button') || e.target.closest('.absolute.top-10')) return; navigate('/folder/' + f.name.toLowerCase()); }} className="grid grid-cols-12 gap-4 p-4 border-b border-border-base hover:bg-surface-hover items-center cursor-pointer transition-colors group">
              <div className="col-span-6 flex items-center gap-3">
                <span className={\`material-symbols-outlined \${f.colorClass} material-symbols-fill\`} style={{ fontSize: '24px' }}>{f.icon}</span>
                <span className="text-body-md font-medium group-hover:text-primary transition-colors">{f.name}</span>
              </div>
              <div className="col-span-3 text-body-sm text-text-muted">{f.modified}</div>
              <div className="col-span-2 text-body-sm text-text-muted">{f.size}</div>
              <div className="col-span-1 text-right relative">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.name); }} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
                <ContextMenu id={f.name} title={f.name} type="Folder" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />
              </div>
            </div>
          ))}

          {files.map(f => (
            <div key={f.name} className="grid grid-cols-12 gap-4 p-4 border-b border-border-base hover:bg-surface-hover items-center cursor-pointer transition-colors group">
              <div className="col-span-6 flex items-center gap-3">
                <span className={\`material-symbols-outlined \${f.colorClass}\`} style={{ fontSize: '24px' }}>{f.icon}</span>
                <span className="text-body-md font-medium group-hover:text-primary transition-colors">{f.name}</span>
              </div>
              <div className="col-span-3 text-body-sm text-text-muted">{f.modified}</div>
              <div className="col-span-2 text-body-sm text-text-muted">{f.size}</div>
              <div className="col-span-1 text-right relative">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.name); }} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                </button>
                <ContextMenu id={f.name} title={f.name} type="File" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />
              </div>
            </div>
          ))}
          
        </div>
      </div>
    </Layout>
  );
}

export default MyFiles;
`;

fs.writeFileSync(myFilesPath, newContent);
console.log("MyFiles populated!");
