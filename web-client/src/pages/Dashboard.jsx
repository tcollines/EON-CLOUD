import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ContextMenu from '../components/ContextMenu';
import { api } from '../api/client';
import '../index.css';

function Dashboard() {
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ percent: 0, speed: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await api.getFiles();
      setFiles(data.files || []);
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Unauthorized')) {
        navigate('/auth');
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress({ percent: 0, speed: 0 });
    try {
      await api.uploadFile(file, (percent, speed) => setUploadProgress(prev => ({ percent, speed: speed || prev.speed })));
      await fetchFiles();
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress({ percent: 0, speed: 0 });
      e.target.value = null;
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

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



  return (
    <Layout>
      
{/*  View Header & Workspace Identity  */}
<div className="px-space-xl pt-space-lg pb-4 border-b border-border-base bg-surface-primary/40 backdrop-blur-sm sticky top-0 z-10">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h1 className="text-headline-lg font-headline-lg text-text-primary font-bold tracking-tight">Eon Space</h1>
<p className="text-body-md font-body-md text-text-secondary mt-0.5">Everything in your cloud, organized in one place.</p>
</div>
{/*  Quick Stats Chips  */}
<div className="flex items-center gap-2">
<div className="px-3 py-1 rounded-lg bg-surface-primary border border-border-base text-body-sm font-body-sm text-text-secondary flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary-container"></span>
<span className="">Total Items: <strong className="text-text-primary font-semibold">1,721</strong></span>
</div>
<div className="px-3 py-1 rounded-lg bg-surface-primary border border-border-base text-body-sm font-body-sm text-text-secondary flex items-center gap-2">
<span className="material-symbols-outlined text-folder-photos" style={{"fontSize":"16px"}}>cloud_sync</span>
<span className="">Auto-backup Active</span>
</div>
</div>
</div>
{/*  ACTION TOOLBAR & SELECTION CONTROLS  */}
<div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-base/70">
{/*  Left Action Buttons & Selection Pill  */}
<div className="flex items-center flex-wrap gap-2.5">
{/*  + New Folder Primary Action  */}
<button className="flex items-center gap-2 px-3.5 py-1.5 bg-[#111111] hover:bg-neutral-800 text-white rounded-lg text-label-md font-label-md transition-colors shadow-sm"><span className="material-symbols-outlined" style={{"fontSize":"18px"}}>create_new_folder</span><span className="">+ New Folder</span></button>
{/*  Upload Secondary Action  */}
<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
<button onClick={handleUploadClick} className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-primary hover:bg-surface-hover text-text-primary border border-border-base rounded-lg text-label-md font-label-md transition-colors shadow-sm">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>upload_file</span>
<span className="">{uploading ? `Uploading ${Math.round(uploadProgress.percent)}% (${formatSize(uploadProgress.speed)}/s)` : 'Upload'}</span>
</button>
<div className="h-5 w-[1px] bg-border-base mx-1 hidden sm:block"></div>
{/*  Active Selection Bar  */}
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${selectedItems.size > 0 ? 'bg-surface-selected border border-border-base opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
</div>
</div>
{/*  Right View Switcher & Filters  */}
<div className="flex items-center gap-2">
{/*  Filter Sort Dropdown  */}
<div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-primary border border-border-base rounded-lg text-label-md font-label-md text-text-secondary hover:text-text-primary cursor-pointer">
<span className="">Sort: Name</span>
<span className="material-symbols-outlined" style={{"fontSize":"16px"}}>keyboard_arrow_down</span>
</div>
{/*  View Switcher [Grid (active), List, Compact]  */}
<div className="flex items-center p-0.5 bg-surface-secondary border border-border-base rounded-lg">
<button className="p-1.5 rounded-md bg-surface-primary text-text-primary shadow-xs" title="Grid View">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>grid_view</span>
</button>
<button className="p-1.5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="List View">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>view_list</span>
</button>
<button className="p-1.5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Compact View">
<span className="material-symbols-outlined" style={{"fontSize":"18px"}}>table_rows</span>
</button>
</div>
</div>
</div>
</div>
{/*  MAIN SCROLLABLE CONTENT BODY  */}
<div className="p-space-xl space-y-space-xl pb-24">

{/*  FOLDERS SECTION (Smart Categories)  */}
<section className="mb-space-2xl">
  <div className="flex items-center justify-between mb-space-md">
    <div className="flex items-center gap-3">
      <h2 className="text-headline-sm font-headline-sm font-semibold text-text-primary">Folders (6)</h2>
      <span className="text-label-sm font-label-sm text-text-muted">Smart Categories</span>
    </div>
    <Link to="/files" className="text-label-md font-label-md text-primary hover:underline flex items-center gap-1">
      View All <span className="material-symbols-outlined" style={{"fontSize":"16px"}}>arrow_forward</span>
    </Link>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
    {[
      { id: 'docs', name: 'Documents', type: 'folder', color: 'folder-documents', count: files.filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i)).length, size: files.filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i)).reduce((a, b) => a + b.size, 0) },
      { id: 'proj', name: 'Projects', type: 'folder', color: 'folder-projects', count: files.filter(f => f.name.match(/\.(zip|rar|tar|gz|js|py|cs|html)$/i)).length, size: files.filter(f => f.name.match(/\.(zip|rar|tar|gz|js|py|cs|html)$/i)).reduce((a, b) => a + b.size, 0) },
      { id: 'phot', name: 'Photos', type: 'folder', color: 'folder-photos', count: files.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|svg)$/i)).length, size: files.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|svg)$/i)).reduce((a, b) => a + b.size, 0) },
      { id: 'vid', name: 'Videos', type: 'folder', color: 'folder-videos', count: files.filter(f => f.name.match(/\.(mp4|webm|mkv|avi|mov)$/i)).length, size: files.filter(f => f.name.match(/\.(mp4|webm|mkv|avi|mov)$/i)).reduce((a, b) => a + b.size, 0) },
      { id: 'mus', name: 'Music', type: 'folder', color: 'folder-music', count: files.filter(f => f.name.match(/\.(mp3|wav|ogg|flac)$/i)).length, size: files.filter(f => f.name.match(/\.(mp3|wav|ogg|flac)$/i)).reduce((a, b) => a + b.size, 0) },
      { id: 'work', name: 'Work', type: 'folder', color: 'folder-work', count: files.filter(f => f.name.match(/\.(xls|xlsx|csv|ppt|pptx)$/i)).length, size: files.filter(f => f.name.match(/\.(xls|xlsx|csv|ppt|pptx)$/i)).reduce((a, b) => a + b.size, 0) }
    ].map(folder => (
      <div key={folder.id} onDoubleClick={() => navigate(`/folder/${folder.name.toLowerCase()}`)} onClick={(e) => toggleSelection(e, folder.id)} className={`bg-surface-primary hover:bg-surface-hover rounded-xl p-4 border relative cursor-pointer shadow-sm transition-all duration-200 ${selectedItems.has(folder.id) ? 'border-primary shadow-md ring-1 ring-primary' : 'border-border-base'}`}>
        {selectedItems.has(folder.id) && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-surface-primary z-10">
            <span className="material-symbols-outlined text-white" style={{"fontSize":"12px"}}>check</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg bg-${folderColors[folder.name] || folder.color}/10 flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-${folderColors[folder.name] || folder.color}`} style={{"fontSize":"24px", "fontVariationSettings": "'FILL' 1"}}>folder</span>
          </div>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(folder.id); }} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary">
            <span className="material-symbols-outlined" style={{"fontSize":"20px"}}>more_vert</span>
          </button>
        </div>
        <div>
          <h3 className="text-label-lg font-label-lg font-semibold text-text-primary mb-1">{folder.name}</h3>
          <p className="text-body-sm font-body-sm text-text-secondary">{folder.count} files • {formatSize(folder.size)}</p>
        </div>
        <ContextMenu id={folder.id} title={folder.name} activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} onChangeColor={(id, color) => setFolderColors(prev => ({...prev, [folder.name]: color}))} />
      </div>
    ))}
  </div>
</section>

{/*  RECENT FILES SECTION (Rich Interactive Grid/List Cards)  */}
<section>
<div className="flex items-center justify-between mb-space-md">
<div>
<h2 className="text-headline-sm font-headline-sm font-semibold text-text-primary">Recent Files</h2>
<p className="text-body-sm font-body-sm text-text-muted">Files touched recently across your synced devices</p>
</div>
<div className="flex items-center gap-2">
<button className="text-body-sm font-body-sm text-text-secondary hover:text-text-primary px-2.5 py-1 rounded bg-surface-primary border border-border-base">Filter: All Types</button>
</div>
</div>
{/*  File Grid Cards  */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
{files.length === 0 && <div className="col-span-full text-text-muted text-center p-8">No files uploaded yet.</div>}
{files.slice(0, 8).map(f => {
  const isPdf = f.name.toLowerCase().endsWith('.pdf');
  const isImg = f.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg)$/);
  const isVideo = f.name.toLowerCase().match(/\.(mp4|webm|mkv|avi)$/);
  
  let icon = 'insert_drive_file';
  let color = 'text-text-secondary';
  let typeLabel = 'FILE';
  let bgLabel = 'bg-surface-secondary text-text-secondary';
  
  if (isPdf) { icon = 'picture_as_pdf'; color = 'text-error'; typeLabel = 'PDF'; bgLabel = 'bg-error-container text-error'; }
  else if (isImg) { icon = 'image'; color = 'text-folder-photos'; typeLabel = 'IMAGE'; bgLabel = 'bg-secondary-fixed text-primary'; }
  else if (isVideo) { icon = 'movie'; color = 'text-folder-videos'; typeLabel = 'VIDEO'; bgLabel = 'bg-primary-container text-surface-primary'; }
  
  return (
    <div key={f.id} className="bg-surface-primary hover:bg-surface-hover rounded-xl p-3.5 border border-border-base relative shadow-sm cursor-pointer transition-all duration-150 group">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 rounded text-[10px] font-label-sm font-semibold uppercase ${bgLabel}`}>{typeLabel}</span>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.id); }} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined" style={{"fontSize":"18px"}}>more_horiz</span>
        </button>
      </div>
      <div className="mt-2 h-32 rounded-lg bg-surface-secondary border border-border-base flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
        <span className={`material-symbols-outlined ${color}`} style={{"fontSize":"48px"}}>{icon}</span>
        <span className="mt-2 text-[11px] font-label-sm text-text-muted truncate max-w-full px-2">{f.name}</span>
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-1.5">
          <span className={`material-symbols-outlined ${color}`} style={{"fontSize":"18px"}}>{icon}</span>
          <span className="text-label-md font-label-md font-semibold text-text-primary truncate">{f.name}</span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-base text-body-sm font-body-sm text-text-secondary">
          <span className="">{formatSize(f.size)} • {new Date(f.created_at).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-folder-music">
            <span className="w-1.5 h-1.5 rounded-full bg-folder-music"></span>
            Synced
          </span>
        </div>
      </div>
      <ContextMenu id={f.id} title={f.name} type="File" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />
    </div>
  );
})}
</div>
</section>
</div>

    </Layout>
  );
}

export default Dashboard;
