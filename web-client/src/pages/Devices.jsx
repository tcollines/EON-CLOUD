import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../api/client';

function Devices() {
  const navigate = useNavigate();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [devices, setDevices] = useState([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceOS, setNewDeviceOS] = useState('Windows');
  const [generatedToken, setGeneratedToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await api.getDevices();
      setDevices(data.devices || []);
    } catch (e) {
      if (e.message.includes('401') || e.message.includes('Unauthorized')) {
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createDevice(newDeviceName, newDeviceOS);
      setGeneratedToken(res.token);
      await fetchDevices();
    } catch (e) {
      alert("Failed to create device: " + e.message);
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-4xl mx-auto w-full relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">Your Devices</h1>
            <p className="text-body-md text-text-secondary">Manage devices synced to your Eon workspace.</p>
          </div>
          <button 
            onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-[#111111] hover:bg-neutral-800 text-white text-label-md font-label-md transition-all shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add New Device
          </button>
        </div>

        {/* Device List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {loading ? <div className="p-8 text-text-muted">Loading devices...</div> : devices.length === 0 ? <div className="p-8 text-text-muted">No devices found.</div> : null}
          {devices.map((device, index) => {
            const isFirst = index === 0; // Highlight the most recent one visually
            let icon = 'devices';
            if (device.os_type.toLowerCase().includes('windows')) icon = 'desktop_windows';
            if (device.os_type.toLowerCase().includes('mac')) icon = 'laptop_mac';
            if (device.os_type.toLowerCase().includes('android') || device.os_type.toLowerCase().includes('ios')) icon = 'phone_iphone';

            return (
              <div key={device.id} className={`rounded-xl p-5 shadow-sm relative transition-all ${isFirst ? 'bg-surface-selected border-2 border-primary-container' : 'bg-surface-primary border border-border-base hover:shadow group'}`}>
                {isFirst && <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-primary-container text-surface-primary text-[10px] font-label-sm font-bold uppercase">Recent</div>}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shadow-xs transition-colors ${isFirst ? 'bg-surface-primary border-border-base text-primary-container' : 'bg-surface-secondary border-border-base text-text-secondary group-hover:text-primary'}`}>
                    <span className="material-symbols-outlined text-[28px]">{icon}</span>
                  </div>
                  <div>
                    <h3 className={`text-label-lg font-label-lg font-bold ${!isFirst && 'group-hover:text-primary transition-colors'}`}>{device.name}</h3>
                    <p className="text-body-sm text-text-muted mt-0.5">{device.os_type}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border-base/50">
                  <div className="flex items-center gap-2 text-body-sm text-text-secondary">
                    <span className={`w-2 h-2 rounded-full ${isFirst ? 'bg-folder-music animate-pulse' : 'bg-border-base'}`}></span>
                    Last active: {new Date(device.last_active).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-label-sm font-semibold">
                    <div className="flex items-center gap-1 text-text-muted" title="Upload Speed">
                      <span className="material-symbols-outlined text-folder-videos" style={{fontSize: '14px'}}>upload</span>
                      {isFirst ? '12 KB/s' : '0 KB/s'}
                    </div>
                    <div className="flex items-center gap-1 text-text-muted" title="Download Speed">
                      <span className="material-symbols-outlined text-folder-projects" style={{fontSize: '14px'}}>download</span>
                      {isFirst ? '4 KB/s' : '0 KB/s'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Device Modal Overlay */}
        {showAddDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-surface-primary rounded-2xl shadow-2xl border border-border-base overflow-hidden relative">
              <button 
                onClick={() => { setShowAddDevice(false); setGeneratedToken(''); }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              
              <div className="p-6 pt-8 text-center border-b border-border-base">
                <h2 className="text-headline-md font-headline-md font-bold mb-2">Connect New Device</h2>
                <p className="text-body-sm text-text-secondary">Generate an authorization token to log in from the Eon Desktop or Mobile App.</p>
              </div>

              <div className="p-8">
                {generatedToken ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center text-primary-container mb-4">
                      <span className="material-symbols-outlined text-[32px]">check_circle</span>
                    </div>
                    <h3 className="text-label-lg font-label-lg font-bold mb-2">Token Generated!</h3>
                    <p className="text-body-sm text-text-secondary mb-4 text-center">Copy this token and paste it into the Windows App when prompted. Keep it safe!</p>
                    
                    <div className="w-full p-4 bg-surface-secondary border border-border-base rounded-lg flex items-start justify-between mb-6 gap-3">
                      <code className="text-label-sm break-all w-[85%] select-all" style={{ userSelect: 'all' }}>{generatedToken}</code>
                      <button 
                        onClick={(e) => { 
                          navigator.clipboard.writeText(generatedToken); 
                          const span = e.currentTarget.querySelector('span');
                          span.textContent = 'check';
                          setTimeout(() => span.textContent = 'content_copy', 2000);
                        }} 
                        className="text-primary hover:text-primary-container flex-shrink-0 mt-0.5" 
                        title="Copy"
                      >
                        <span className="material-symbols-outlined text-[20px]">content_copy</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => { setShowAddDevice(false); setGeneratedToken(''); }}
                      className="w-full py-3 px-4 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-headline-sm transition-all"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateDevice} className="flex flex-col gap-4">
                    <div className="space-y-1.5">
                      <label className="text-label-md text-text-secondary">Device Name</label>
                      <input type="text" required value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="e.g. Workstation PC" className="w-full bg-surface-secondary text-text-primary text-body-md px-3.5 py-2.5 rounded-lg border border-border-base focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-label-md text-text-secondary">OS Type</label>
                      <select value={newDeviceOS} onChange={e => setNewDeviceOS(e.target.value)} className="w-full bg-surface-secondary text-text-primary text-body-md px-3.5 py-2.5 rounded-lg border border-border-base focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                        <option value="Windows">Windows</option>
                        <option value="macOS">macOS</option>
                        <option value="Linux">Linux</option>
                        <option value="Android">Android</option>
                        <option value="iOS">iOS</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full mt-4 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-headline-sm transition-all">
                      Generate Token
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Devices;
