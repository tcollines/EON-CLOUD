import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ContextMenu from '../components/ContextMenu';
import { api } from '../api/client';

function FolderView() {
  const { folderName } = useParams();
  const [activeMenu, setActiveMenu] = useState(null);
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await api.getFiles();
        const allFiles = data.files || [];
        
        let filtered = [];
        const cat = (folderName || '').toLowerCase();
        
        if (cat === 'documents') filtered = allFiles.filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i));
        else if (cat === 'projects') filtered = allFiles.filter(f => f.name.match(/\.(zip|rar|tar|gz|js|py|cs|html)$/i));
        else if (cat === 'photos') filtered = allFiles.filter(f => f.name.match(/\.(jpg|jpeg|png|gif|svg)$/i));
        else if (cat === 'videos') filtered = allFiles.filter(f => f.name.match(/\.(mp4|webm|mkv|avi|mov)$/i));
        else if (cat === 'music') filtered = allFiles.filter(f => f.name.match(/\.(mp3|wav|ogg|flac)$/i));
        else if (cat === 'work') filtered = allFiles.filter(f => f.name.match(/\.(xls|xlsx|csv|ppt|pptx)$/i));
        else {
          // Custom folders created via VFS (match prefixes)
          filtered = allFiles.filter(f => f.name.toLowerCase().startsWith(cat + '/'));
        }
        
        setFiles(filtered);
      } catch (e) {
        if (e.message.includes('401') || e.message.includes('Unauthorized')) {
          navigate('/auth');
        }
      }
    };
    fetchFiles();
  }, [navigate, folderName]);

  const title = folderName ? folderName.charAt(0).toUpperCase() + folderName.slice(1) : 'Folder';

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="px-space-xl pt-space-lg pb-4 border-b border-border-base bg-surface-primary/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => navigate('/')} className="text-text-muted hover:text-text-primary text-body-sm font-semibold transition-colors">Eon Space</button>
              <span className="material-symbols-outlined text-text-muted text-[16px]">chevron_right</span>
              <span className="text-body-sm font-semibold text-text-primary">{title}</span>
            </div>
            <h1 className="text-headline-lg font-headline-lg text-text-primary font-bold tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined material-symbols-fill text-folder-projects text-[32px]">folder</span>
              {title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3.5 py-1.5 bg-[#111111] hover:bg-neutral-800 text-white rounded-lg text-label-md font-label-md transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New</span>
            </button>
            <button className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-primary hover:bg-surface-hover text-text-primary border border-border-base rounded-lg text-label-md font-label-md transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-space-xl space-y-space-xl pb-24">
        <section>
          <div className="flex items-center justify-between mb-space-md border-b border-border-base pb-2">
            <h2 className="text-headline-sm font-headline-sm font-semibold text-text-primary">Files</h2>
            <div className="flex items-center gap-4 text-body-sm text-text-secondary">
              <span className="hidden sm:inline">Size</span>
              <span className="hidden sm:inline">Modified</span>
              <span className="material-symbols-outlined text-[18px]">sort</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {files.length === 0 && <div className="text-text-muted text-center p-8">Folder is empty.</div>}
            {files.map(f => {
              const isPdf = f.name.toLowerCase().endsWith('.pdf');
              const isImg = f.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg)$/);
              const isVideo = f.name.toLowerCase().match(/\.(mp4|webm|mkv|avi)$/);
              
              let icon = 'insert_drive_file';
              let color = 'text-text-secondary';
              let bgLabel = 'bg-surface-secondary';
              
              if (isPdf) { icon = 'picture_as_pdf'; color = 'text-error'; bgLabel = 'bg-error-container text-error'; }
              else if (isImg) { icon = 'image'; color = 'text-folder-photos'; bgLabel = 'bg-secondary-fixed text-primary'; }
              else if (isVideo) { icon = 'movie'; color = 'text-folder-videos'; bgLabel = 'bg-primary-container text-surface-primary'; }

              return (
                <div key={f.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-surface-primary border border-transparent hover:border-border-base transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg ${bgLabel} flex items-center justify-center border border-border-base`}>
                      <span className={`material-symbols-outlined text-[24px] ${color}`}>{icon}</span>
                    </div>
                    <div>
                      <h4 className="text-label-md font-label-md font-semibold text-text-primary group-hover:text-primary transition-colors">{f.name}</h4>
                      <p className="text-body-sm text-text-muted">Synced</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="text-body-sm text-text-muted hidden sm:block">{formatSize(f.size)}</span>
                    <span className="text-body-sm text-text-muted hidden sm:block">{new Date(f.created_at).toLocaleDateString()}</span>
                    <div className="relative">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.id); }} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                      </button>
                      <ContextMenu id={f.id} title={f.name} type="File" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default FolderView;
