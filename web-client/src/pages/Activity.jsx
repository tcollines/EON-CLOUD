import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

function Activity() {
  const [devices, setDevices] = useState([
    { id: 'mac', name: 'MacBook Pro 16"', type: 'laptop_mac', status: 'Syncing', upBase: 24.5, downBase: 2.1, up: 24.5, down: 2.1, upTrend: [], downTrend: [] },
    { id: 'phone', name: 'Galaxy S24 Ultra', type: 'phone_android', status: 'Syncing', upBase: 0.8, downBase: 12.4, up: 0.8, down: 12.4, upTrend: [], downTrend: [] },
    { id: 'pc', name: 'Studio Workstation', type: 'desktop_windows', status: 'Idle', upBase: 0.0, downBase: 0.0, up: 0.01, down: 0.05, upTrend: [], downTrend: [] }
  ]);

  useEffect(() => {
    // Generate initial history for the mini charts
    setDevices(prev => prev.map(d => ({
      ...d,
      upTrend: Array.from({length: 15}, () => d.status === 'Idle' ? Math.random() * 0.1 : Math.random() * (d.upBase * 1.5)),
      downTrend: Array.from({length: 15}, () => d.status === 'Idle' ? Math.random() * 0.1 : Math.random() * (d.downBase * 1.5))
    })));

    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => {
        if (device.status === 'Idle') {
          const newUp = parseFloat((Math.random() * 0.1).toFixed(2));
          const newDown = parseFloat((Math.random() * 0.1).toFixed(2));
          return {
            ...device,
            up: newUp,
            down: newDown,
            upTrend: [...device.upTrend.slice(1), newUp],
            downTrend: [...device.downTrend.slice(1), newDown]
          };
        }

        // Randomly fluctuate around the base speed
        const upVariance = (Math.random() - 0.5) * (device.upBase * 0.4);
        const downVariance = (Math.random() - 0.5) * (device.downBase * 0.4);
        const newUp = Math.max(0.1, parseFloat((device.upBase + upVariance).toFixed(2)));
        const newDown = Math.max(0.1, parseFloat((device.downBase + downVariance).toFixed(2)));

        return {
          ...device,
          up: newUp,
          down: newDown,
          upTrend: [...device.upTrend.slice(1), newUp],
          downTrend: [...device.downTrend.slice(1), newDown]
        };
      }));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const renderMiniChart = (data, colorClass) => {
    const max = Math.max(...data, 1);
    return (
      <div className="flex items-end gap-[3px] h-10 w-full overflow-hidden opacity-80">
        {data.map((val, i) => {
          const heightPct = Math.max(5, (val / max) * 100);
          return (
            <div key={i} className={`flex-1 rounded-t-sm ${colorClass} transition-all duration-700 ease-in-out`} style={{ height: `${heightPct}%` }}></div>
          );
        })}
      </div>
    )
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-5xl mx-auto w-full pb-24">
        <div className="mb-8">
          <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">Realtime Sync Activity</h1>
          <p className="text-body-md text-text-secondary">Monitor your active devices and streaming speeds across the network.</p>
        </div>

        {/* Realtime Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {devices.map(device => (
            <div key={device.id} className="bg-surface-primary border border-border-base rounded-2xl p-5 shadow-sm relative overflow-hidden">
              {device.status === 'Syncing' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-folder-projects via-folder-music to-folder-videos animate-pulse"></div>
              )}
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-secondary flex items-center justify-center border border-border-base">
                    <span className="material-symbols-outlined text-text-primary" style={{fontSize: '24px'}}>{device.type}</span>
                  </div>
                  <div>
                    <h3 className="text-label-lg font-label-lg font-semibold text-text-primary leading-tight">{device.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${device.status === 'Syncing' ? 'bg-folder-music animate-pulse' : 'bg-text-muted'}`}></span>
                      <span className="text-label-sm font-label-sm text-text-muted">{device.status}</span>
                    </div>
                  </div>
                </div>
                <button className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-secondary">
                  <span className="material-symbols-outlined" style={{fontSize: '20px'}}>more_vert</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Upload Stat */}
                <div className="bg-surface-secondary/50 rounded-xl p-3 border border-border-base/50 relative overflow-hidden group">
                  <div className="flex justify-between items-end relative z-10 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-folder-projects" style={{fontSize: '16px'}}>arrow_upward</span>
                      <span className="text-label-sm font-label-sm font-semibold text-text-secondary uppercase tracking-wider">Upload</span>
                    </div>
                    <div className="text-right">
                      <span className="text-headline-sm font-headline-sm font-bold text-text-primary">{device.up.toFixed(1)}</span>
                      <span className="text-label-sm font-label-sm text-text-muted ml-1">MB/s</span>
                    </div>
                  </div>
                  {renderMiniChart(device.upTrend, 'bg-folder-projects')}
                </div>

                {/* Download Stat */}
                <div className="bg-surface-secondary/50 rounded-xl p-3 border border-border-base/50 relative overflow-hidden group">
                  <div className="flex justify-between items-end relative z-10 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-folder-videos" style={{fontSize: '16px'}}>arrow_downward</span>
                      <span className="text-label-sm font-label-sm font-semibold text-text-secondary uppercase tracking-wider">Download</span>
                    </div>
                    <div className="text-right">
                      <span className="text-headline-sm font-headline-sm font-bold text-text-primary">{device.down.toFixed(1)}</span>
                      <span className="text-label-sm font-label-sm text-text-muted ml-1">MB/s</span>
                    </div>
                  </div>
                  {renderMiniChart(device.downTrend, 'bg-folder-videos')}
                </div>
              </div>
              
            </div>
          ))}
        </div>
        
        {/* Recent Events Log */}
        <div>
          <h2 className="text-headline-sm font-headline-sm font-semibold text-text-primary mb-4">Event Log</h2>
          <div className="space-y-3">
            <div className="bg-surface-primary rounded-xl border border-border-base p-4 shadow-sm flex items-start gap-4 hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded bg-surface-secondary flex items-center justify-center text-folder-projects">
                <span className="material-symbols-outlined">upload</span>
              </div>
              <div className="flex-1">
                <p className="text-body-md font-medium text-text-primary">Uploaded 3 files</p>
                <p className="text-body-sm text-text-muted mt-0.5">MacBook Pro 16" • Just now</p>
              </div>
            </div>
            
            <div className="bg-surface-primary rounded-xl border border-border-base p-4 shadow-sm flex items-start gap-4 hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded bg-surface-secondary flex items-center justify-center text-folder-videos">
                <span className="material-symbols-outlined">movie</span>
              </div>
              <div className="flex-1">
                <p className="text-body-md font-medium text-text-primary">Synced "product-video.mp4"</p>
                <p className="text-body-sm text-text-muted mt-0.5">Galaxy S24 Ultra • 5m ago</p>
              </div>
            </div>
            
            <div className="bg-surface-primary rounded-xl border border-border-base p-4 shadow-sm flex items-start gap-4 hover:bg-surface-hover transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded bg-surface-secondary flex items-center justify-center text-folder-documents">
                <span className="material-symbols-outlined">computer</span>
              </div>
              <div className="flex-1">
                <p className="text-body-md font-medium text-text-primary">New device authenticated</p>
                <p className="text-body-sm text-text-muted mt-0.5">Studio Workstation • 2h ago</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default Activity;
