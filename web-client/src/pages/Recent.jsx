import React from 'react';
import Layout from '../components/Layout';

function Recent() {
  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">Recent Files</h1>
            <p className="text-body-md text-text-secondary">Files touched recently across your synced devices.</p>
          </div>
        </div>
        
        <div className="bg-surface-primary rounded-xl border border-border-base overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border-base hover:bg-surface-hover items-center cursor-pointer">
            <div className="col-span-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-folder-videos" style={{ fontSize: '24px' }}>movie</span>
              <span className="text-body-md font-medium">product-video.mp4</span>
            </div>
            <div className="col-span-3 text-body-sm text-text-muted">12 mins ago</div>
            <div className="col-span-2 text-body-sm text-text-muted">2.4 GB</div>
            <div className="col-span-1 text-right">
              <span className="material-symbols-outlined text-text-muted">more_vert</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Recent;
