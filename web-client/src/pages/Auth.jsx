import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await api.login(email, password);
      } else {
        await api.register(email, password);
        await api.login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="bg-bg-canvas text-text-primary font-body-md min-h-screen flex items-center justify-center p-4 selection:bg-primary-container selection:text-surface-primary">
      <div className="w-full max-w-md bg-surface-primary rounded-2xl shadow-xl border border-border-base overflow-hidden">
        
        {/* Header / Brand */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-border-base bg-surface-secondary/30">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-md mb-4">
            <span className="material-symbols-outlined material-symbols-fill text-[30px]">cloud</span>
          </div>
          <h1 className="text-display font-display tracking-tight text-text-primary mb-1">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-body-md text-text-muted">
            {isLogin ? 'Sign in to access your Eon Space' : 'Join Eon to sync and access your files anywhere'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-label-md font-label-md text-text-secondary">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full bg-surface-secondary text-text-primary text-body-md px-3.5 py-2.5 rounded-lg border border-border-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/60"
                placeholder="Alex Morgan"
              />
            </div>
          )}
          
          {error && <div className="text-error bg-error/10 p-3 rounded-lg text-body-sm">{error}</div>}
          
          <div className="space-y-1.5">
            <label className="text-label-md font-label-md text-text-secondary">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-surface-secondary text-text-primary text-body-md px-3.5 py-2.5 rounded-lg border border-border-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/60"
              placeholder="alex@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-label-md font-label-md text-text-secondary">Password</label>
              {isLogin && <a href="#" className="text-label-sm text-primary hover:underline">Forgot?</a>}
            </div>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-secondary text-text-primary text-body-md px-3.5 py-2.5 rounded-lg border border-border-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted/60"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white font-headline-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {isLogin ? 'Sign In to Eon' : 'Create Account'}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="px-8 py-5 border-t border-border-base bg-surface-secondary/50 text-center">
          <p className="text-body-sm text-text-secondary">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1.5 text-primary font-semibold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Auth;
