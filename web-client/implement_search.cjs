const fs = require('fs');

const layoutPath = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\components\\Layout.jsx';
let content = fs.readFileSync(layoutPath, 'utf8');

if (!content.includes('import React, { useState')) {
  content = content.replace("import React from 'react';", "import React, { useState, useRef, useEffect } from 'react';");
}

if (!content.includes('const [searchQuery, setSearchQuery]')) {
  const stateInsert = `
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchItems = [
    { name: 'Documents', type: 'Folder', icon: 'folder', colorClass: 'text-folder-documents' },
    { name: 'Projects', type: 'Folder', icon: 'folder', colorClass: 'text-folder-projects' },
    { name: 'Photos', type: 'Folder', icon: 'folder', colorClass: 'text-folder-photos' },
    { name: 'Videos', type: 'Folder', icon: 'folder', colorClass: 'text-folder-videos' },
    { name: 'Music', type: 'Folder', icon: 'folder', colorClass: 'text-folder-music' },
    { name: 'Work', type: 'Folder', icon: 'folder', colorClass: 'text-folder-work' },
    { name: 'product-video.mp4', type: 'File', icon: 'movie', colorClass: 'text-folder-videos' },
    { name: 'project.zip', type: 'File', icon: 'folder_zip', colorClass: 'text-text-muted' },
    { name: 'proposal.pdf', type: 'File', icon: 'picture_as_pdf', colorClass: 'text-error' },
    { name: 'assets_v2.fig', type: 'File', icon: 'draw', colorClass: 'text-folder-projects' },
    { name: 'Design Assets', type: 'Folder', icon: 'folder', colorClass: 'text-folder-projects' },
    { name: 'Drafts', type: 'Folder', icon: 'folder', colorClass: 'text-text-secondary' },
    { name: 'Brief_v2.docx', type: 'File', icon: 'description', colorClass: 'text-primary' },
    { name: 'mockup-final.png', type: 'File', icon: 'image', colorClass: 'text-folder-photos' }
  ];

  const filteredSearch = searchItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
`;
  content = content.replace(/function Layout\(\{ children \}\) \{\s*const location = useLocation\(\);/, `function Layout({ children }) {
  const location = useLocation();${stateInsert}`);
}

// Find the search bar block
let searchBlockRegex = /<div className="flex-1 max-w-md mx-space-lg hidden md:block">([\s\S]*?)<\/div>\s*<!-- Right: Actions/i;
// Actually, it's easier to replace the specific search bar code using literal strings.

const oldSearchBar = `{/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-space-lg hidden md:block">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-text-muted pointer-events-none flex items-center">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input className="w-full bg-surface-secondary text-text-primary text-body-sm font-body-sm placeholder:text-text-muted pl-10 pr-24 py-2 rounded-lg border border-border-base focus:outline-none focus:border-primary-container transition-all" placeholder="Search files, folders, tags..." type="text" />
            <div className="absolute right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-primary border border-border-base text-text-muted text-[10px] font-label-sm tracking-wider">
              <span>⌘</span><span>K</span>
            </div>
          </div>
        </div>`;

const newSearchBar = `{/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-space-lg hidden md:block" ref={searchRef}>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-text-muted pointer-events-none flex items-center">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input 
              className="w-full bg-surface-secondary text-text-primary text-body-sm font-body-sm placeholder:text-text-muted pl-10 pr-24 py-2 rounded-lg border border-border-base focus:outline-none focus:border-primary-container focus:bg-surface-primary transition-all shadow-sm" 
              placeholder="Search files, folders, tags..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
              onClick={() => setIsSearchOpen(true)}
            />
            {searchQuery && (
               <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="absolute right-12 text-text-muted hover:text-text-primary flex items-center p-1">
                 <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
               </button>
            )}
            <div className="absolute right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-primary border border-border-base text-text-muted text-[10px] font-label-sm tracking-wider pointer-events-none">
              <span>⌘</span><span>K</span>
            </div>
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && searchQuery && (
            <div className="absolute top-14 w-[28rem] bg-surface-primary rounded-xl border border-border-base shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-border-base flex items-center justify-between bg-surface-secondary/30">
                <span className="text-[11px] font-label-sm font-semibold uppercase tracking-wider text-text-muted px-2">Search Results</span>
                <span className="text-[11px] text-text-muted px-2">{filteredSearch.length} found</span>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {filteredSearch.length === 0 ? (
                  <div className="py-8 text-center text-body-sm text-text-muted flex flex-col items-center">
                     <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">search_off</span>
                     No results found for "{searchQuery}"
                  </div>
                ) : (
                  filteredSearch.map(item => (
                    <Link to={item.type === 'Folder' ? '/folder/' + item.name.toLowerCase() : '#'} onClick={() => setIsSearchOpen(false)} key={item.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors group">
                      <div className={\`w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center border border-border-base \${item.colorClass}\`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-label-md font-medium text-text-primary truncate group-hover:text-primary transition-colors">{item.name}</span>
                        <span className="text-[11px] text-text-muted">{item.type}</span>
                      </div>
                      <span className="material-symbols-outlined text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: '16px' }}>north_west</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>`;

content = content.replace(oldSearchBar, newSearchBar);

fs.writeFileSync(layoutPath, content);
console.log("Layout search implemented!");
