// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  UserCheck, 
  ArrowUpRight, 
  Crown, 
  ChevronRight
} from 'lucide-react';

const cardSpring = {
  type: 'spring',
  stiffness: 340,
  damping: 26,
  mass: 0.5
};

const fastReveal = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.14, ease: 'easeOut' } },
  exit: { opacity: 0, y: 0, transition: { duration: 0.08, ease: 'easeIn' } }
};

export default function BentoSliderHomePage() {
  const [shopName, setShopName] = useState('VUJWALA SIMHA DRY FRUITS AND JUICE POINT');
  const [tagline, setTagline] = useState('WITH SPICES AND NUTS');
  const [activeCard, setActiveCard] = useState<number>(0);

  useEffect(() => {
    async function fetchShopSettings() {
      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('restaurant_name, tagline')
          .eq('id', 1)
          .maybeSingle();

        if (error) {
          console.error('Settings fetch error:', error);
          return;
        }

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
      .channel('landing_bento_sync')
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

  const portals = [
    {
      id: 'qr',
      title: 'QR Menu',
      subtitle: 'Customer Interactive Experience',
      desc: 'Scan or launch interactive digital showcase, secret PIN mystery discount, real-time dining cart & instant billing.',
      link: '/table/1',
      btnText: 'Launch Table #1',
      accentColor: 'from-[#FCF6BA] via-[#D4AF37] to-[#AA771C]',
      btnBg: 'bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black',
      glowColor: 'rgba(212, 175, 55, 0.28)',
      borderColor: 'border-[#D4AF37]/35',
      activeBorder: 'border-[#D4AF37]',
      bgGradient: 'from-[#14120a]/95 via-[#0d0c07]/90 to-[#040406]/95',
      icon: Crown,
      tag: '01 / DINING',
      bgImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'admin',
      title: 'Master Control',
      subtitle: 'Executive Admin & Kitchen Suite',
      desc: 'Live orders management, running table operations, menu & royal combo additions, thermal printer & day analytics.',
      link: '/admin',
      btnText: 'Access Console',
      accentColor: 'from-rose-400 via-red-500 to-rose-600',
      btnBg: 'bg-gradient-to-r from-red-500 via-rose-600 to-rose-700 text-white',
      glowColor: 'rgba(244, 63, 94, 0.32)',
      borderColor: 'border-rose-500/35',
      activeBorder: 'border-rose-500',
      bgGradient: 'from-[#180608]/95 via-[#100305]/90 to-[#040406]/95',
      icon: ShieldCheck,
      tag: '02 / CONTROL',
      bgImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'waiter',
      title: 'Waiter Terminal',
      subtitle: 'Floor Crew Management',
      desc: 'Instant sound alerts, table service notifications, real-time dish status updates & quick order handover.',
      link: '/waiter',
      btnText: 'Open Terminal',
      accentColor: 'from-cyan-300 via-cyan-400 to-teal-500',
      btnBg: 'bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-600 text-black',
      glowColor: 'rgba(6, 182, 212, 0.28)',
      borderColor: 'border-cyan-500/35',
      activeBorder: 'border-cyan-400',
      bgGradient: 'from-[#041217]/95 via-[#020b0e]/90 to-[#040406]/95',
      icon: UserCheck,
      tag: '03 / CREW',
      bgImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  return (
    <div className="h-screen w-full bg-[#020204] text-white flex flex-col justify-between px-4 sm:px-8 py-4 relative overflow-hidden font-sans select-none antialiased">
      {/* Dynamic Ambient Background Aura */}
      <motion.div 
        animate={{
          background: activeCard === 0 
            ? 'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.14) 0%, transparent 65%)'
            : activeCard === 1 
            ? 'radial-gradient(circle at 35% 50%, rgba(244,63,94,0.16) 0%, transparent 65%)'
            : 'radial-gradient(circle at 65% 50%, rgba(6,182,212,0.14) 0%, transparent 65%)'
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed inset-0 pointer-events-none z-0 transform-gpu"
      />

      {/* Top Header - Clean Centered Layout */}
      <header className="max-w-6xl mx-auto w-full pt-4 flex flex-col items-center justify-center relative z-10 shrink-0 px-2 text-center space-y-1">
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FCF6BA] to-[#D4AF37] uppercase drop-shadow-md">
          {shopName}
        </h1>
        <p className="text-[11px] sm:text-xs text-neutral-400 font-mono tracking-widest uppercase">{tagline}</p>
      </header>

      {/* Bento Grid Accordion Slider */}
      <main className="max-w-6xl mx-auto w-full my-auto py-2 relative z-10 flex-1 flex items-center justify-center">
        <div className="flex flex-col lg:flex-row gap-3.5 h-[440px] lg:h-[410px] w-full">
          {portals.map((portal, idx) => {
            const isExpanded = activeCard === idx;
            const IconComponent = portal.icon;

            return (
              <motion.div
                key={portal.id}
                onClick={() => setActiveCard(idx)}
                onHoverStart={() => setActiveCard(idx)}
                animate={{ flex: isExpanded ? 2.6 : 0.85 }}
                transition={cardSpring}
                className={`relative rounded-[26px] overflow-hidden border backdrop-blur-2xl cursor-pointer flex flex-col justify-between transform-gpu transition-colors duration-200 ${
                  isExpanded 
                    ? `${portal.activeBorder} shadow-2xl` 
                    : `${portal.borderColor} opacity-80 hover:opacity-100 hover:border-white/30`
                }`}
                style={{
                  boxShadow: isExpanded ? `0 16px 45px ${portal.glowColor}` : 'none'
                }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
                  style={{ 
                    backgroundImage: `url(${portal.bgImage})`,
                    transform: isExpanded ? 'scale(1.03)' : 'scale(1)'
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${portal.bgGradient}`} />
                <div className="absolute inset-0 bg-black/45" />

                <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest uppercase text-white/80 font-bold bg-black/60 px-3 py-0.5 rounded-full border border-white/10 backdrop-blur-md shadow-sm">
                    {portal.tag}
                  </span>

                  <div className={`w-10 h-10 rounded-xl bg-black/60 border ${portal.borderColor} flex items-center justify-center backdrop-blur-xl shadow-lg`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="relative z-10 px-6 py-2 hidden lg:flex items-center justify-between">
                  {!isExpanded && (
                    <div className="flex items-center gap-2 text-white/90 font-black text-base tracking-wider truncate">
                      <span className="truncate">{portal.title}</span>
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    </div>
                  )}
                </div>

                <div className="relative z-10 p-5 sm:p-6 space-y-2.5">
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wide text-white drop-shadow-md">
                      {portal.title}
                    </h2>
                    <p className={`text-[11px] sm:text-xs font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r ${portal.accentColor}`}>
                      {portal.subtitle}
                    </p>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={fastReveal}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="space-y-3 pt-0.5"
                      >
                        <p className="text-[11px] sm:text-xs text-neutral-300 font-mono leading-relaxed line-clamp-2 max-w-md">
                          {portal.desc}
                        </p>

                        <div>
                          <Link href={portal.link} className="inline-block">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${portal.btnBg} font-black text-[11px] uppercase font-mono tracking-wider shadow-lg cursor-pointer`}
                            >
                              <span>{portal.btnText}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 stroke-[3]" />
                            </motion.button>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      <div className="h-2 shrink-0" />
    </div>
  );
}