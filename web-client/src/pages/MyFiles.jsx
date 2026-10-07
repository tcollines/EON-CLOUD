import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ContextMenu from '../components/ContextMenu';
import { api } from '../api/client';

function MyFiles() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
      } else {
        console.error("Failed to load files", e);
      }
    } finally {
      setLoading(false);
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
      e.target.value = null; // reset input
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = async (f, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloadProgress({ id: f.id, percent: 0, speed: 0 });
      await api.downloadFile(f.id, f.name, (percent, speed) => setDownloadProgress(prev => ({ id: f.id, percent, speed: speed || prev?.speed || 0 })));
    } catch (err) {
      alert("Download failed");
    } finally {
      setDownloadProgress(null);
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-5xl mx-auto w-full pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">My Files</h1>
            <p className="text-body-md text-text-secondary">All your personal files and folders.</p>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <button onClick={handleUploadClick} className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-primary hover:bg-surface-hover text-text-primary border border-border-base rounded-lg text-label-md transition-colors shadow-sm">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
            {uploading ? `Uploading ${Math.round(uploadProgress.percent)}% (${formatSize(uploadProgress.speed)}/s)` : 'Upload'}
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-12 text-text-muted">Loading your files...</div>
        ) : (
        <div className="bg-surface-primary rounded-xl border border-border-base overflow-visible shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border-base bg-surface-secondary/50 text-label-sm font-label-sm text-text-muted uppercase tracking-wider">
            <div className="col-span-6">Name</div>
            <div className="col-span-3">Modified</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-1"></div>
          </div>
          
          {files.length === 0 && (
             <div className="p-8 text-center text-text-muted">No files uploaded yet.</div>
          )}

          {files.map(f => (
            <div key={f.id} onClick={(e) => handleDownload(f, e)} className="grid grid-cols-12 gap-4 p-4 border-b border-border-base hover:bg-surface-hover items-center cursor-pointer transition-colors group relative">
              {downloadProgress?.id === f.id && (
                <div className="absolute left-0 bottom-0 h-1 bg-primary rounded" style={{ width: `${downloadProgress.percent}%` }} />
              )}
              <div className="col-span-6 flex items-center gap-3 relative">
                <span className={`material-symbols-outlined text-text-secondary`} style={{ fontSize: '24px' }}>insert_drive_file</span>
                <span className="text-body-md font-medium group-hover:text-primary transition-colors">{f.name}</span>
                {downloadProgress?.id === f.id && <span className="text-[10px] text-primary ml-2">{Math.round(downloadProgress.percent)}% ({formatSize(downloadProgress.speed)}/s)</span>}
              </div>
              <div className="col-span-3 text-body-sm text-text-muted">{new Date(f.created_at).toLocaleDateString()}</div>
              <div className="col-span-2 text-body-sm text-text-muted">{formatSize(f.size)}</div>
              <div className="col-span-1 text-right relative">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveMenu(f.id); }} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                </button>
                <ContextMenu id={f.id} title={f.name} type="File" activeMenu={activeMenu} setActiveMenu={setActiveMenu} onClose={() => setActiveMenu(null)} />
              </div>
            </div>
          ))}
          
        </div>
        )}
      </div>
    </Layout>
  );
}

export default MyFiles;
