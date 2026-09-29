'use client';

import React, { useState } from 'react';
import { Smartphone, Mail, ArrowRight, ShieldCheck, CheckCircle2, Fingerprint } from 'lucide-react';

interface MagicLoginProps {
  onLoginSuccess: (user: any) => void;
  brandName?: string;
}

export const MagicLogin: React.FC<MagicLoginProps> = ({ onLoginSuccess }) => {
  const [authMethod, setAuthMethod] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  
  // WhatsApp OTP State
  const [phone, setPhone] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappStep, setWhatsappStep] = useState<'PHONE' | 'CODE'>('PHONE');

  // Email OTP State
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState<'EMAIL' | 'CODE'>('EMAIL');

  const [loading, setLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp OTP Submit
  const handleWhatsAppSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/whatsapp-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewCode(data.devPreviewCode || '123456');
        setWhatsappStep('CODE');
      } else {
        setError(data.error || 'Error al enviar código por WhatsApp');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/whatsapp-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otpCode: whatsappCode }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Código OTP inválido');
      }
    } catch (err: any) {
      setError('Error al verificar código WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // Email Magic PIN Submit
  const handleEmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_CODE', email }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewCode(data.previewCode);
        setEmailStep('CODE');
      } else {
        setError(data.error || 'Error al enviar código al correo');
      }
    } catch (err: any) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY_CODE', email, code: emailCode }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Código inválido');
      }
    } catch (err: any) {
      setError('Error de verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4 relative overflow-hidden font-['Urbanist'] select-none">
      {/* Background Obsidian Glow Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-[#07080c] to-[#07080c] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md bg-[#0c0e17]/90 border border-white/10 backdrop-blur-2xl rounded-sm p-8 sm:p-10 shadow-2xl shadow-black relative z-10 space-y-7">
        
        {/* Bespoke Geometric COPPER GIANT Emblem */}
        <div className="text-center space-y-3">
          <img src="/logo.svg" alt="Copper Giant" className="h-14 w-auto mx-auto object-contain mb-4" />
          
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase flex items-center justify-center gap-2">
              <span>COPPER GIANT</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-[#FF002C] border border-red-500/30 tracking-normal">
                v2.1
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Private Intelligence Engine
            </p>
          </div>
        </div>

        {/* Auth Method Selector Tabs */}
        <div className="p-1 rounded-sm bg-slate-950/80 border border-white/10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setAuthMethod('WHATSAPP'); setError(null); }}
            className={`flex-1 py-2.5 rounded-sm text-xs font-black transition-all flex items-center justify-center gap-2 ${
              authMethod === 'WHATSAPP'
                ? 'bg-[#FF002C] text-slate-950 shadow-lg shadow-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>WhatsApp OTP</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMethod('EMAIL'); setError(null); }}
            className={`flex-1 py-2.5 rounded-sm text-xs font-black transition-all flex items-center justify-center gap-2 ${
              authMethod === 'EMAIL'
                ? 'bg-[#FF002C] text-slate-950 shadow-lg shadow-red-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Magic PIN</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-bold animate-fadeIn">
            {error}
          </div>
        )}



        {/* METHOD 1: WHATSAPP OTP LOGIN */}
        {authMethod === 'WHATSAPP' && (
          whatsappStep === 'PHONE' ? (
            <form onSubmit={handleWhatsAppSend} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Número de Celular WhatsApp
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/10 rounded-sm text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-400 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Recibirás una clave de seguridad OTP directamente en tu WhatsApp para ingresar.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                {loading ? 'Enviando Código...' : 'Enviar Clave por WhatsApp'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleWhatsAppVerify} className="space-y-5">
              {previewCode && (
                <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[#FF002C] text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Código enviado a tu WhatsApp</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                    PIN de 6 dígitos WhatsApp
                  </label>
                  <button
                    type="button"
                    onClick={() => setWhatsappStep('PHONE')}
                    className="text-[11px] text-[#FF002C] hover:underline font-bold"
                  >
                    Cambiar número
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={whatsappCode}
                  onChange={(e) => setWhatsappCode(e.target.value)}
                  placeholder="123456"
                  className="w-full py-3.5 text-center tracking-[0.5em] text-2xl font-mono font-black rounded-sm bg-slate-950 border border-white/10 text-[#FF002C] focus:outline-none focus:border-red-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                {loading ? 'Verificando...' : 'Verificar e Ingresar a The Core'}
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )
        )}

        {/* METHOD 2: CORPORATE EMAIL MAGIC PIN */}
        {authMethod === 'EMAIL' && (
          emailStep === 'EMAIL' ? (
            <form onSubmit={handleEmailSend} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                  Correo Electrónico Corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/10 rounded-sm text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                {loading ? 'Generando PIN...' : 'Enviar Código Magic PIN'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailVerify} className="space-y-5">
              {previewCode ? (
                <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-center space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-center gap-1.5 text-[#FF002C] text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PIN de acceso generado: <strong className="font-mono text-white tracking-widest text-sm">{previewCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailCode(previewCode)}
                    className="text-[11px] text-red-300 hover:text-white font-black underline cursor-pointer"
                  >
                    Auto-completar PIN ({previewCode})
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[#FF002C] text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Código enviado a tu correo corporativo</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                    PIN de 6 dígitos Correo
                  </label>
                  <button
                    type="button"
                    onClick={() => setEmailStep('EMAIL')}
                    className="text-[11px] text-[#FF002C] hover:underline font-bold"
                  >
                    Cambiar correo
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="000000"
                  className="w-full py-3.5 text-center tracking-[0.5em] text-2xl font-mono font-black rounded-sm bg-slate-950 border border-white/10 text-[#FF002C] focus:outline-none focus:border-red-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                {loading ? 'Verificando...' : 'Verificar e Ingresar a The Core'}
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-white/5 text-center flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
          <Fingerprint className="w-3.5 h-3.5 text-red-500" />
          <span>Protegido con Encriptación Enterprise COPPER GIANT Security</span>
        </div>
      </div>
    </div>
  );
};
