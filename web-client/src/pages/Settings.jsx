import React from 'react';
import Layout from '../components/Layout';

function Settings() {
  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-body-md text-text-secondary">Manage your workspace preferences and security.</p>
        </div>
        
        <div className="bg-surface-primary rounded-xl border border-border-base p-6 shadow-sm">
          <h3 className="text-label-lg font-label-lg font-semibold mb-4">Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border-base/50">
              <div>
                <p className="text-body-md font-medium">Two-Factor Authentication</p>
                <p className="text-body-sm text-text-muted mt-0.5">Protect your workspace with 2FA</p>
              </div>
              <button className="px-3 py-1.5 bg-surface-secondary border border-border-base rounded-md text-label-sm font-semibold">Enable</button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-body-md font-medium">End-to-End Encryption</p>
                <p className="text-body-sm text-text-muted mt-0.5">Encrypts files via AES-256 before upload</p>
              </div>
              <span className="px-2 py-0.5 bg-folder-music/20 text-folder-music rounded text-[11px] font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
