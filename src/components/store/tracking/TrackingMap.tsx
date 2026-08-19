import React from "react";
import { MapPin, Truck, Navigation2, Box } from "lucide-react";
import { motion } from "framer-motion";

export function TrackingMap({ address }: { address?: string }) {
  return (
    <div className="relative w-full h-[300px] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-inner">
      {/* Simulated Map Background Grid */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }} />
      
      {/* Simulated Roads */}
      <div className="absolute top-1/2 left-0 w-full h-8 bg-slate-200 -translate-y-1/2" />
      <div className="absolute top-0 left-1/3 w-8 h-full bg-slate-200" />
      <div className="absolute top-1/4 right-1/4 w-8 h-full bg-slate-200 rotate-45" />

      {/* Distribution Center (CD) Marker */}
      <div className="absolute top-1/2 left-4 -translate-y-full z-10">
        <div className="flex flex-col items-center">
          <div className="bg-primary text-white p-1.5 rounded-xl shadow-md border-2 border-white">
            <Box className="w-4 h-4" />
          </div>
          <div className="bg-white px-2 py-0.5 rounded-full shadow-sm mt-1 border border-slate-100">
             <span className="text-[7px] font-black uppercase text-slate-800 whitespace-nowrap">CD Distribuição</span>
          </div>
        </div>
      </div>

      {/* Destination Marker */}
      <div className="absolute top-1/2 left-3/4 -translate-x-1/2 -translate-y-full z-10">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center"
        >
          <div className="bg-red-500 text-white p-2 rounded-2xl shadow-lg border-2 border-white">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="bg-white px-3 py-1 rounded-full shadow-sm mt-1 border border-slate-100">
             <span className="text-[10px] font-black uppercase text-slate-800 whitespace-nowrap">Seu Endereço</span>
          </div>
        </motion.div>
      </div>

      {/* Delivery Truck (Main Order) */}
      <motion.div 
        initial={{ left: "0%", top: "50%" }}
        animate={{ 
          left: ["0%", "65%", "65%", "75%"], 
          top: ["50%", "50%", "50%", "50%"] 
        }}
        transition={{ 
          duration: 30, 
          times: [0, 0.7, 0.8, 1], // Stays at 65% for a bit then moves to 75%
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
      >
        <div className="flex flex-col items-center">
           <div className="bg-primary text-white p-2 rounded-2xl shadow-[0_0_20px_rgba(30,58,138,0.4)] border-2 border-white relative">
              <Truck className="w-6 h-6" />
              <div className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full animate-ping" />
           </div>
           <div className="bg-slate-900 text-white px-2 py-0.5 rounded-full mt-1 flex items-center gap-1 shadow-md">
             <Navigation2 className="w-2 h-2 fill-white rotate-90" />
             <span className="text-[8px] font-black uppercase tracking-widest">Seu Pedido</span>
           </div>
        </div>
      </motion.div>

      {/* Other Simulated Orders (Nearby) */}
      <motion.div 
        initial={{ right: "10%", top: "20%" }}
        animate={{ right: "15%", top: "25%" }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
        className="absolute z-10 opacity-40 grayscale"
      >
        <div className="flex flex-col items-center scale-75">
           <div className="bg-slate-400 text-white p-2 rounded-2xl border-2 border-white">
              <Box className="w-5 h-5" />
           </div>
           <span className="text-[8px] font-bold uppercase text-slate-500 mt-1">Pedido #8423</span>
        </div>
      </motion.div>

      <motion.div 
        initial={{ left: "20%", bottom: "20%" }}
        animate={{ left: "25%", bottom: "25%" }}
        transition={{ duration: 5, repeat: Infinity, repeatType: "reverse" }}
        className="absolute z-10 opacity-40 grayscale"
      >
        <div className="flex flex-col items-center scale-75">
           <div className="bg-slate-400 text-white p-2 rounded-2xl border-2 border-white">
              <Box className="w-5 h-5" />
           </div>
           <span className="text-[8px] font-bold uppercase text-slate-500 mt-1">Pedido #8459</span>
        </div>
      </motion.div>

      {/* Map Overlay Text */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-white/50 space-y-0.5">
           <p className="text-[8px] font-black uppercase tracking-widest text-primary leading-none">Status em Tempo Real</p>
           <p className="text-xs font-bold text-slate-800">Motorista em rota até as 22h</p>
           <p className="text-[9px] text-slate-500 font-medium italic">Pedido pode chegar hoje</p>
        </div>
        <div className="bg-slate-900/10 backdrop-blur-sm px-2 py-1 rounded-lg">
           <p className="text-[8px] font-black uppercase text-slate-600 tracking-tighter italic">Simulação Enterprise v2.0</p>
        </div>
      </div>
    </div>
  );
}
