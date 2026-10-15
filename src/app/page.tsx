// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  UserCheck, 
  QrCode, 
  Sparkles, 
  ArrowRight
} from 'lucide-react';

const fastGlassSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 26,
  mass: 0.8
};

export default function HomePage() {
  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS & JUICE POINT');
  const [tagline, setTagline] = useState('ROYAL ORGANIC DRY FRUITS & COLD-PRESSED JUICES');

  useEffect(() => {
    async function fetchShopSettings() {
      try {
        const { data } = await supabase
          .from('restaurant_settings')
          .select('restaurant_name, tagline')
          .eq('id', 1)
          .single();

        if (data) {
          if (data.restaurant_name) setShopName(data.restaurant_name);
          if (data.tagline) setTagline(data.tagline);
        }
      } catch (err) {
        console.error('Settings fetch error:', err);
      }
    }

    fetchShopSettings();

    const channel = supabase
      .channel('landing_page_shop_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_settings' },
        (payload) => {
          if (payload.new?.restaurant_name) setShopName(payload.new.restaurant_name);
          if (payload.new?.tagline) setTagline(payload.new.tagline);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const portalCards = [
    {
      title: 'Customer Dining',
      subtitle: 'Table Menu & Self-Order',
      href: '/table/1',
      badge: 'LIVE QR MENU',
      icon: QrCode,
      desc: 'Table #1 QR menu access chesi, organic shakes order cheyandi mariyu mystery PIN tho instant bill discount gelavandi.'
    },
    {
      title: 'Waiter Portal',
      subtitle: 'Floor Matrix & Service',
      href: '/waiter',
      badge: 'STAFF CONSOLE',
      icon: UserCheck,
      desc: 'Realtime order batches approve cheyadam, kitchen KDS dispatch mariyu live active table sessions manage cheyadam.'
    },
    {
      title: 'Admin Console',
      subtitle: 'Royal Operations',
      href: '/admin',
      badge: 'MANAGEMENT',
      icon: ShieldCheck,
      desc: 'Sales reports, live floor controls, menu customization mariyu daily 10-slot PIN vault generator setup.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030304] text-[#FCF6BA] flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-[#D4AF37] selection:text-black subpixel-antialiased">
      {/* Background Ambient Mesh */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(212,175,55,0.14)_0%,transparent_70%)] blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)] blur-[140px] pointer-events-none -z-10" />

      {/* HERO / PORTAL SELECTION SECTION */}
      <header className="relative pt-16 pb-16 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center my-auto">
        {/* Floating Gold Pill Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fastGlassSpring}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border-[2px] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#FCF6BA]">
            FINE DINE & JUICE BAR OS
          </span>
        </motion.div>

        {/* Dynamic Shop Name */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fastGlassSpring}
          className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FCF6BA] via-[#F3E5AB] to-[#D4AF37] max-w-4xl drop-shadow-[0_2px_20px_rgba(212,175,55,0.25)] leading-tight"
        >
          {shopName}
        </motion.h1>

        {/* Dynamic Tagline */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs sm:text-sm font-sans text-[#D4AF37] mt-2 max-w-2xl tracking-wider uppercase font-semibold"
        >
          {tagline}
        </motion.p>

        {/* 3 TILES PORTAL MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12 text-left">
          {portalCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link key={idx} href={card.href} className="group block focus:outline-none">
                <motion.div
                  whileHover={{ y: -6, scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  transition={fastGlassSpring}
                  className="h-full p-7 rounded-[32px] bg-[#070709] border-[3px] border-[#D4AF37] hover:border-[#FCF6BA] shadow-[0_12px_40px_rgba(0,0,0,0.9)] hover:shadow-[0_0_35px_rgba(212,175,55,0.35)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Icon & Badge Row */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-13 h-13 rounded-2xl bg-[#D4AF37]/15 border-2 border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                        <Icon className="w-6 h-6 text-[#D4AF37]" />
                      </div>
                      <span className="text-[10px] font-sans font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-black border border-[#D4AF37] text-[#FCF6BA]">
                        {card.badge}
                      </span>
                    </div>

                    {/* Titles */}
                    <h2 className="text-xl font-bold tracking-tight text-white group-hover:text-[#FCF6BA] transition">
                      {card.title}
                    </h2>
                    <span className="text-xs font-sans text-[#D4AF37] font-semibold block mt-1">
                      {card.subtitle}
                    </span>
                    <p className="text-xs text-[#F3E5AB]/80 font-sans mt-3.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  {/* Bottom Enter Row */}
                  <div className="pt-6 mt-6 border-t border-[#D4AF37]/30 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#FCF6BA] group-hover:text-white transition">
                    <span>Enter Terminal</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition text-[#D4AF37]" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </header>

      {/* MINIMAL LUXURY FOOTER */}
      <footer className="border-t-2 border-[#D4AF37]/30 py-6 text-center text-xs font-sans text-[#D4AF37]/70 w-full bg-[#030304]">
        <p>© 2026 {shopName}. All Rights Reserved.</p>
        <p className="text-[10px] text-[#D4AF37]/50 mt-1 uppercase font-bold tracking-wider">
          POWERED BY NEXT.JS & SUPABASE REALTIME
        </p>
      </footer>
    </div>
  );
}