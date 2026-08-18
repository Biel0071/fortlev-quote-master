import React, { useState, useEffect } from "react";
import { useConsent } from "@/hooks/store/useConsent";
import { Button } from "@/components/ui/button";
import { Bell, Cookie, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ConsentBanner() {
  const { consent, saveConsent } = useConsent();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show after 2 seconds if no consent exists
    if (consent === null) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [consent]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:max-w-sm z-[100]"
      >
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Privacidade & Alertas</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Para uma experiência completa, usamos cookies e gostaríamos de enviar notificações sobre suas entregas e ofertas exclusivas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button 
              onClick={() => {
                saveConsent({ cookies: true, notifications: true, storeAlerts: true });
                setShow(false);
              }}
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest"
            >
              Aceitar Tudo
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  saveConsent({ cookies: true, notifications: false, storeAlerts: false });
                  setShow(false);
                }}
                className="rounded-2xl h-10 font-bold uppercase text-[10px] tracking-wider border-2"
              >
                Apenas Cookies
              </Button>
              <Button 
                variant="ghost"
                onClick={() => setShow(false)}
                className="rounded-2xl h-10 font-bold uppercase text-[10px] tracking-wider"
              >
                Depois
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
