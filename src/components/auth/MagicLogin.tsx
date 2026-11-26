'use client';

import React, { useState } from 'react';
import { Smartphone, ArrowRight, ShieldCheck, CheckCircle2, Fingerprint } from 'lucide-react';

interface MagicLoginProps {
  onLoginSuccess: (user: any) => void;
  brandName?: string;
}

export const MagicLogin: React.FC<MagicLoginProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappStep, setWhatsappStep] = useState<'PHONE' | 'CODE'>('PHONE');

  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setCodeSent(true);
        setWhatsappStep('CODE');
      } else {
        setError(data.error || 'Error al enviar código por WhatsApp');
      }
    } catch {
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
    } catch {
      setError('Error al verificar código WhatsApp');
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
                CRM
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Acceso exclusivo por WhatsApp · Olimpus
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-bold animate-fadeIn">
            {error}
          </div>
        )}

        {whatsappStep === 'PHONE' ? (
          <form onSubmit={handleWhatsAppSend} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider">
                Número de Celular WhatsApp Autorizado
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="3207116676 o +57 320 711 6676"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/10 rounded-sm text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-400 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Olimpus enviará un código de verificación de 6 dígitos directamente a tu WhatsApp.
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
            {codeSent && (
              <div className="p-3.5 rounded-sm bg-red-500/10 border border-red-500/30 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[#FF002C] text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Código enviado a tu WhatsApp vía Olimpus</span>
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
                  onClick={() => { setWhatsappStep('PHONE'); setError(null); }}
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
                placeholder="000000"
                className="w-full py-3.5 text-center tracking-[0.5em] text-2xl font-mono font-black rounded-sm bg-slate-950 border border-white/10 text-[#FF002C] focus:outline-none focus:border-red-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-sm bg-[#FF002C] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              {loading ? 'Verificando...' : 'Verificar e Ingresar al CRM'}
              <ShieldCheck className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleWhatsAppSend}
              className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              ¿No llegó? Reenviar código por WhatsApp (Olimpus)
            </button>
          </form>
        )}

        {/* Footer Security Badge */}
        <div className="pt-2 border-t border-white/5 text-center flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
          <Fingerprint className="w-3.5 h-3.5 text-red-500" />
          <span>Sesión persistente 180 días · Usuarios autorizados</span>
        </div>
      </div>
    </div>
  );
};
