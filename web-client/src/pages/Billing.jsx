import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

function Billing() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-space-xl max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-headline-lg font-headline-lg font-bold tracking-tight mb-2">Billing & Plans</h1>
          <p className="text-body-md text-text-secondary">Manage your storage subscription, payment methods, and billing history.</p>
        </div>

        {/* Current Plan Card */}
        <section className="bg-surface-primary rounded-xl border border-border-base p-6 shadow-sm mb-space-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-headline-sm font-headline-sm font-semibold">Pro Workspace</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-primary text-[10px] font-label-sm font-bold uppercase tracking-wider">Active</span>
              </div>
              <p className="text-body-sm text-text-muted mb-4">2 TB Storage • Next billing date: Oct 28, 2026</p>
              
              <div className="flex items-center gap-2">
                <span className="text-display font-display font-bold">$14.99</span>
                <span className="text-body-sm text-text-muted">/ month</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 min-w-[200px]">
              <button className="w-full py-2.5 px-4 rounded-lg bg-[#111111] hover:bg-neutral-800 text-white text-label-md font-label-md transition-all shadow-sm">
                Upgrade to 5 TB
              </button>
              <button className="w-full py-2 px-4 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-base text-text-primary text-label-md font-label-md transition-colors">
                Cancel Subscription
              </button>
            </div>
          </div>
        </section>

        {/* Payment Method */}
        <section className="mb-space-xl">
          <h3 className="text-label-lg font-label-lg font-semibold mb-4">Payment Method</h3>
          <div className="bg-surface-primary rounded-xl border border-border-base p-1 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 p-3">
              <div className="w-12 h-8 rounded border border-border-base bg-surface-secondary flex items-center justify-center text-text-muted font-bold italic">
                VISA
              </div>
              <div>
                <p className="text-body-md font-medium">Visa ending in 4242</p>
                <p className="text-body-sm text-text-muted">Expires 12/28</p>
              </div>
            </div>
            <button className="mr-3 p-2 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-primary transition-colors font-label-md">
              Update
            </button>
          </div>
        </section>

        {/* Billing History */}
        <section>
          <h3 className="text-label-lg font-label-lg font-semibold mb-4">Billing History</h3>
          <div className="bg-surface-primary rounded-xl border border-border-base overflow-hidden shadow-sm">
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-border-base bg-surface-secondary/50 text-label-sm font-label-sm text-text-muted uppercase tracking-wider">
              <div className="col-span-2">Invoice</div>
              <div>Amount</div>
              <div>Status</div>
            </div>
            
            {[
              { date: 'Sep 28, 2026', id: 'INV-4920-EON', amount: '$14.99' },
              { date: 'Aug 28, 2026', id: 'INV-3819-EON', amount: '$14.99' },
              { date: 'Jul 28, 2026', id: 'INV-2718-EON', amount: '$14.99' },
            ].map((inv, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-border-base last:border-0 items-center hover:bg-surface-hover transition-colors cursor-pointer">
                <div className="col-span-2">
                  <p className="text-body-md font-medium">{inv.date}</p>
                  <p className="text-body-sm text-text-muted">{inv.id}</p>
                </div>
                <div className="text-body-md font-medium">{inv.amount}</div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary-fixed/50 text-primary text-[11px] font-label-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-folder-music"></span>
                    Paid
                  </span>
                  <span className="material-symbols-outlined text-text-muted text-[16px]">download</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </Layout>
  );
}

export default Billing;
