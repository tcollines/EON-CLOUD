import React, { useEffect, useRef } from 'react';

function ContextMenu({ id, type = 'Folder', title, activeMenu, setActiveMenu, onClose, onChangeColor }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (activeMenu === id) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu, id, onClose]);

  if (activeMenu !== id) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute top-10 right-0 z-50 w-56 bg-surface-primary rounded-xl border border-border-base shadow-2xl p-1.5 text-text-primary text-body-md font-body-md animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2.5 py-1.5 text-[11px] font-label-sm font-semibold uppercase tracking-wider text-text-muted border-b border-border-base flex items-center justify-between">
        <span className="">{type} Actions</span>
        <span className="text-primary text-xs truncate max-w-[100px]">{title}</span>
      </div>
      <div className="py-1 space-y-0.5">
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>{type === 'Folder' ? 'folder_open' : 'file_open'}</span>
          <span className="">Open</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>visibility</span>
          <span className="">Preview</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>download</span>
          <span className="">Download</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>share</span>
          <span className="">Share</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>edit</span>
          <span className="">Rename</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>drive_file_move</span>
          <span className="">Move</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>content_copy</span>
          <span className="">Copy</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>star</span>
          <span className="">Add to Favorites</span>
        </button>
        
        {type === 'Folder' && (
          <div className="px-2.5 py-1.5 rounded-md hover:bg-surface-hover">
            <div className="flex items-center justify-between text-body-sm font-body-sm">
              <span className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>palette</span>
                <span className="">Change Color</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 pl-5">
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-documents'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-documents cursor-pointer hover:scale-125 transition-transform"></span>
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-projects'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-projects cursor-pointer hover:scale-125 transition-transform"></span>
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-photos'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-photos cursor-pointer hover:scale-125 transition-transform"></span>
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-videos'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-videos cursor-pointer hover:scale-125 transition-transform"></span>
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-music'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-music cursor-pointer hover:scale-125 transition-transform"></span>
              <span onClick={() => { if(onChangeColor) onChangeColor(id, 'folder-work'); onClose(); }} className="w-3 h-3 rounded-full bg-folder-work cursor-pointer hover:scale-125 transition-transform"></span>
            </div>
          </div>
        )}
        
        <div className="h-[1px] bg-border-base my-1"></div>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-surface-hover text-body-sm font-body-sm">
          <span className="material-symbols-outlined text-text-secondary" style={{ fontSize: '16px' }}>info</span>
          <span className="">Details</span>
        </button>
        <button onClick={onClose} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-md hover:bg-error-container text-error text-body-sm font-body-sm">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
          <span className="">Delete</span>
        </button>
      </div>
    </div>
  );
}

export default ContextMenu;
