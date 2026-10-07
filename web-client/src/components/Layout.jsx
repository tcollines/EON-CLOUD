import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';

function Layout({ children }) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    fetchDevices();
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data.devices || []);
    } catch (e) {
      console.log('Error fetching devices', e);
    }
  };

  const searchItems = []; // To be replaced with real search API later

  const filteredSearch = searchItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const path = location.pathname;

  return (
    <div className="bg-bg-canvas text-text-primary font-body-md text-body-md antialiased h-screen w-screen overflow-hidden flex flex-col select-none">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-space-lg w-full bg-surface-primary dark:bg-surface-container-lowest border-b border-border-base shrink-0">
        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#111111] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined material-symbols-fill text-white" style={{ fontSize: '22px' }}>cloud</span>
            </span>
            <span className="text-headline-md font-headline-md font-bold text-text-primary tracking-tight">Eon Cloud</span>
          </div>
          <div className="h-4 w-[1px] bg-border-base hidden md:block"></div>
          
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-space-xs text-body-md font-body-md">
            <button className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-medium">
              <span>Eon Space</span>
            </button>
            <span className="text-text-muted material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
            <button className="text-text-primary font-semibold flex items-center gap-1">
              <span>Workspace</span>
            </button>
          </nav>
        </div>

        {/* Global Search Bar */}
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
                      <div className={`w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center border border-border-base ${item.colorClass}`}>
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
        </div>

        {/* Right: Actions, Data Meter & User Avatar */}
        <div className="flex items-center gap-space-sm">
          {/* Global Transfer Speeds */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border-base text-[11px] font-label-sm font-semibold">
            <div className="flex items-center gap-1 text-text-muted" title="Global Upload Speed">
              <span className="material-symbols-outlined text-folder-videos" style={{fontSize: '14px'}}>upload</span>
              12 KB/s
            </div>
            <div className="flex items-center gap-1 text-text-muted" title="Global Download Speed">
              <span className="material-symbols-outlined text-folder-projects" style={{fontSize: '14px'}}>download</span>
              4 KB/s
            </div>
          </div>
          
          <button className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors duration-150">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-folder-videos ring-2 ring-surface-primary"></span>
          </button>
          
          <div className="h-6 w-[1px] bg-border-base mx-1 hidden sm:block"></div>
          
          <Link to="/auth" className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-surface-hover transition-colors duration-150 text-left">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-surface-secondary border border-border-base shadow-sm flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined">person</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-folder-music border-2 border-surface-primary"></span>
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-label-md font-label-md text-text-primary leading-tight">My Account</span>
              <span className="text-label-sm font-label-sm text-text-muted leading-tight">Personal Workspace</span>
            </div>
            <span className="material-symbols-outlined text-text-muted hidden xl:inline" style={{ fontSize: '16px' }}>keyboard_arrow_down</span>
          </Link>
        </div>
      </header>

      {/* BODY WORKSPACE CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR */}
        <aside className="w-64 h-full flex flex-col justify-between p-space-md border-r border-border-base bg-surface-secondary shrink-0 overflow-y-auto z-20">
          <div className="space-y-5">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-surface-primary border border-border-base">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs">EC</div>
                <div className="truncate">
                  <p className="text-label-md font-label-md text-text-primary leading-none truncate">Eon Cloud</p>
                  <p className="text-label-sm font-label-sm text-text-muted leading-none mt-1">Personal Workspace</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-text-muted" style={{ fontSize: '18px' }}>unfold_more</span>
            </div>

            <button onClick={() => document.querySelector('input[type="file"]')?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] hover:bg-neutral-800 text-white font-headline-sm text-headline-sm transition-all duration-150 shadow-sm active:scale-[0.98]">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
              <span className="text-label-lg font-label-lg text-white">+ Upload File</span>
            </button>

            <div>
              <span className="px-space-md text-[11px] font-label-sm font-semibold tracking-wider text-text-muted uppercase">Workspace</span>
              <nav className="mt-1.5 space-y-0.5">
                <Link to="/" className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-semibold ${path === '/' ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <span className="material-symbols-outlined material-symbols-fill" style={{ fontSize: '19px' }}>cloud_queue</span>
                  <span className="text-label-lg font-label-lg">Eon Space</span>
                </Link>
                <Link to="/files" className={`flex items-center justify-between px-space-md py-space-sm rounded-lg ${path.startsWith('/files') ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>folder</span>
                    <span className="text-label-lg font-label-lg">My Files</span>
                  </div>
                </Link>
                <Link to="/recent" className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-lg ${path.startsWith('/recent') ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>schedule</span>
                  <span className="text-label-lg font-label-lg">Recent</span>
                </Link>
              </nav>
            </div>

            <div>
              <span className="px-space-md text-[11px] font-label-sm font-semibold tracking-wider text-text-muted uppercase">Devices</span>
              <nav className="mt-1.5 space-y-0.5">
                {devices.map(device => (
                  <Link key={device.id} to="/devices" className={`flex items-center justify-between px-space-md py-1.5 rounded-lg ${path === '/devices' ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                    <div className="flex items-center gap-space-sm">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {device.os_type.toLowerCase().includes('win') ? 'desktop_windows' : device.os_type.toLowerCase().includes('mac') ? 'laptop_mac' : 'devices'}
                      </span>
                      <span className="text-body-md font-body-md truncate max-w-[120px]">{device.name}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-folder-music"></span>
                  </Link>
                ))}
                {devices.length === 0 && (
                  <div className="px-space-md py-1 text-body-sm text-text-muted">No devices added</div>
                )}
              </nav>
            </div>

            <div>
              <span className="px-space-md text-[11px] font-label-sm font-semibold tracking-wider text-text-muted uppercase">System</span>
              <nav className="mt-1.5 space-y-0.5">
                <Link to="/activity" className={`flex items-center gap-space-sm px-space-md py-1.5 rounded-lg ${path === '/activity' ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sync_alt</span>
                  <span className="text-body-md font-body-md">Activity</span>
                </Link>
                <Link to="/billing" className={`flex items-center gap-space-sm px-space-md py-1.5 rounded-lg ${path === '/billing' ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>credit_card</span>
                  <span className="text-body-md font-body-md">Billing</span>
                </Link>
                <Link to="/settings" className={`flex items-center gap-space-sm px-space-md py-1.5 rounded-lg ${path === '/settings' ? 'bg-surface-selected text-primary' : 'text-text-secondary hover:bg-surface-hover'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
                  <span className="text-body-md font-body-md">Settings</span>
                </Link>
              </nav>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-base">
            <div className="bg-surface-primary rounded-xl p-3.5 border border-border-base shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#111111]" style={{ fontSize: '18px' }}>cloud</span>
                  <span className="text-label-md font-label-md text-text-primary">Cloud Storage</span>
                </div>
                <span className="text-label-sm font-label-sm font-semibold text-text-primary">0%</span>
              </div>
              <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden mb-2">
                <div className="bg-[#111111] h-full rounded-full transition-all duration-300" style={{ width: '0%' }}></div>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm text-text-muted mb-3">
                <span>0 MB of 2 TB used</span>
              </div>
              <Link to="/billing" className="block w-full py-1.5 px-3 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-base text-text-primary text-label-md font-label-md transition-colors text-center">
                Manage Storage
              </Link>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
