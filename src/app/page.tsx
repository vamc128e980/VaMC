// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  UserCheck, 
  QrCode, 
  Sparkles, 
  ArrowRight,
  ChevronDown,
  Leaf,
  Award,
  HeartHandshake,
  MapPin,
  Clock,
  KeyRound,
  Gift,
  Zap
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
  const [activeTab, setActiveTab] = useState<'pin-game' | 'specials' | 'hygiene' | 'location'>('pin-game');

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
      {/* Smooth Background Ambient Mesh (No clipping bounds) */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(212,175,55,0.14)_0%,transparent_70%)] blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-10 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)] blur-[140px] pointer-events-none -z-10" />

      {/* TOP HEADER SECTION */}
      <header className="relative pt-14 pb-8 px-4 sm:px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
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

        {/* 3 TILES: CLEAN FULL-SURFACE BLACK & THICK METALLIC GOLD BORDER (BUG FIXED) */}
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

        {/* Scroll Indicator */}
        <div className="mt-12 flex flex-col items-center gap-1.5 text-[#D4AF37] animate-bounce">
          <span className="text-[10px] font-sans tracking-widest uppercase font-bold">Explore Our World & Specials</span>
          <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
        </div>
      </header>

      {/* LUXURY BLOG & SHOWCASE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t-2 border-[#D4AF37]/30 space-y-10 w-full">
        {/* Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#070709] border-[3px] border-[#D4AF37] shadow-[0_5px_20px_rgba(212,175,55,0.15)] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] shrink-0">
              <Leaf className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">100% Organic & Raw</h3>
              <p className="text-[11px] font-sans text-[#D4AF37]/80">Zero added preservatives or refined sugars</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#070709] border-[3px] border-[#D4AF37] shadow-[0_5px_20px_rgba(212,175,55,0.15)] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] shrink-0">
              <Award className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Hand-Selected A1 Royal Grade Nuts</h3>
              <p className="text-[11px] font-sans text-[#D4AF37]/80">100% Certified Premium Super-Grade Dry Fruits</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#070709] border-[3px] border-[#D4AF37] shadow-[0_5px_20px_rgba(212,175,55,0.15)] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] shrink-0">
              <HeartHandshake className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Hygienic Cold Pressing</h3>
              <p className="text-[11px] font-sans text-[#D4AF37]/80">UV-filtered, sanitized slow extraction</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-full bg-black border-[3px] border-[#D4AF37] gap-1.5 shadow-[0_0_25px_rgba(212,175,55,0.25)]">
            {[
              { id: 'pin-game', label: '👑 Mystery PIN Game' },
              { id: 'specials', label: 'Royal Specials' },
              { id: 'hygiene', label: 'Hygiene & Purity' },
              { id: 'location', label: 'Location & Hours' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 sm:px-6 py-2 rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all duration-300 relative cursor-pointer"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePillIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] rounded-full z-0 shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                      transition={fastGlassSpring}
                    />
                  )}
                  <span className={`relative z-10 ${
                    isActive ? 'text-black font-extrabold' : 'text-[#FCF6BA]/85 hover:text-white'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Box */}
        <div className="p-6 sm:p-10 rounded-[36px] bg-[#070709] border-[3px] border-[#D4AF37] shadow-[0_20px_60px_rgba(0,0,0,1)]">
          <AnimatePresence mode="wait">
            {activeTab === 'pin-game' && (
              <motion.article
                key="pin-game"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={fastGlassSpring}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5 relative group overflow-hidden rounded-3xl border-[3px] border-[#D4AF37] shadow-[0_0_35px_rgba(212,175,55,0.35)] bg-black">
                  <img 
                    src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80" 
                    alt="Mystery Gold Vault with Discount Gift Box"
                    className="w-full h-80 sm:h-96 object-cover transform group-hover:scale-105 transition-all duration-700 brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                  
                  <div className="absolute bottom-5 inset-x-5 flex items-center justify-between bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border-2 border-[#D4AF37]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FCF6BA] to-[#D4AF37] flex items-center justify-center text-black shadow-md">
                        <Gift className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-sans font-black text-[#D4AF37] block">Mystery Cash Gift Box</span>
                        <span className="text-xs font-bold text-white font-sans">10 Daily Secret PINs Active</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#D4AF37] text-black font-black font-sans text-[10px] uppercase">
                      INSTANT CASH
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] text-xs font-sans font-bold text-[#FCF6BA]">
                      <Gift className="w-3.5 h-3.5 text-[#D4AF37]" /> CRACK TODAY'S CODE & UNLOCK DISCOUNT GIFT BOX
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide leading-tight">
                      The Royal Mystery PIN Challenge: 3 Chances to Win Instant Cash Discount!
                    </h3>
                    <p className="text-xs sm:text-sm font-sans text-[#F3E5AB]/85 leading-relaxed">
                      Mee dining experience ni thrilling ga marchadaniki mana restaurant lo prathi roju **Daily 10 Secret PIN Vaults** create chestham. Table QR scan chesi dining chesthunna guest evaraina ee mystery PIN guess chesi tana final bill lo instant cash discount geluchukovachu!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-black border-[2px] border-[#D4AF37]/60 space-y-1">
                      <span className="text-[10px] font-sans font-bold text-[#D4AF37]">STEP 01</span>
                      <h4 className="font-bold text-white text-xs">Scan & Open Menu</h4>
                      <p className="text-[11px] font-sans text-[#F3E5AB]/75">Table QR scan cheyagane Total Bill ledger lo "Crack PIN" tab kanipisthundi.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black border-[2px] border-[#D4AF37]/60 space-y-1">
                      <span className="text-[10px] font-sans font-bold text-[#D4AF37]">STEP 02</span>
                      <h4 className="font-bold text-white text-xs">Guess 4-Digit Code</h4>
                      <p className="text-[11px] font-sans text-[#F3E5AB]/75">Oka table session ki exact ga 3 guesses untayi. Correct PIN type cheyagane unlock avthundi!</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black border-[2px] border-[#D4AF37]/60 space-y-1">
                      <span className="text-[10px] font-sans font-bold text-[#D4AF37]">STEP 03</span>
                      <h4 className="font-bold text-white text-xs">Instant Bill Slash</h4>
                      <p className="text-[11px] font-sans text-[#F3E5AB]/75">Gelichina discount amount direct ga mee live session bill nunchi minus aipothundi.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/table/1">
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        transition={fastGlassSpring}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#AA771C] text-black font-black uppercase text-xs shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 fill-black" /> Experience PIN Game on Table #1 ➔
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.article>
            )}

            {activeTab === 'specials' && (
              <motion.div
                key="specials"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={fastGlassSpring}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="p-5 rounded-2xl bg-black border-[2px] border-[#D4AF37] space-y-2">
                  <span className="text-[10px] font-sans font-bold text-black bg-[#D4AF37] px-2.5 py-0.5 rounded-full uppercase">SPECIALITY SHAKE</span>
                  <h4 className="font-bold text-white text-base">Royal Anjeer & Badam Thickshake</h4>
                  <p className="text-xs text-[#F3E5AB]/80 font-sans">Real sun-dried Turkish figs soaked overnight, crushed with premium almonds in pure organic milk.</p>
                </div>
                <div className="p-5 rounded-2xl bg-black border-[2px] border-[#D4AF37] space-y-2">
                  <span className="text-[10px] font-sans font-bold text-black bg-[#D4AF37] px-2.5 py-0.5 rounded-full uppercase">COLD-PRESSED BLEND</span>
                  <h4 className="font-bold text-white text-base">Pomegranate & Beetroot Detox</h4>
                  <p className="text-xs text-[#F3E5AB]/80 font-sans">Slow masticating cold press keeps 100% active enzymes and vitamins intact with zero oxidation.</p>
                </div>
                <div className="p-5 rounded-2xl bg-black border-[2px] border-[#D4AF37] space-y-2">
                  <span className="text-[10px] font-sans font-bold text-black bg-[#D4AF37] px-2.5 py-0.5 rounded-full uppercase">ROYAL DRY FRUITS</span>
                  <h4 className="font-bold text-white text-base">Saffron Cashew Power Bowl</h4>
                  <p className="text-xs text-[#F3E5AB]/80 font-sans">Infused with Kashmiri Kesar strands, jumbo cashews, golden raisins and organic acacia honey.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'hygiene' && (
              <motion.div
                key="hygiene"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={fastGlassSpring}
                className="space-y-4 max-w-3xl mx-auto text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center text-[#FCF6BA] mx-auto shadow-md">
                  <Award className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase">Our 5-Stage Hygiene & Purity Standard</h3>
                <p className="text-xs font-sans text-[#F3E5AB]/80 leading-relaxed">
                  Prathi batch fruits mariyu dry fruits ni ozone wash & UV radiation chamber lo sterilize chestham. We guarantee 0% added sugar, 0% water dilution in thickshakes, and 100% food-grade glass packaging.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs font-sans">
                  <div className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/60 font-bold text-[#FCF6BA]">UV Sanitized Tools</div>
                  <div className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/60 font-bold text-[#FCF6BA]">Ozone Washed Fruits</div>
                  <div className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/60 font-bold text-[#FCF6BA]">Zero Added Sugar</div>
                  <div className="p-3.5 rounded-xl bg-black border border-[#D4AF37]/60 font-bold text-[#FCF6BA]">Pure Glassware</div>
                </div>
              </motion.div>
            )}

            {activeTab === 'location' && (
              <motion.div
                key="location"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={fastGlassSpring}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#D4AF37] mt-1 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Store Location</h4>
                      <p className="text-xs text-[#F3E5AB]/80 font-sans mt-1">Main Commercial Street, Opp. Royal Plaza, Luxury Dine Hub, Anantapur.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#D4AF37] mt-1 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Service Hours</h4>
                      <p className="text-xs text-[#F3E5AB]/80 font-sans mt-1">Open 7 Days a Week • 8:00 AM – 11:30 PM</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-black border-[2px] border-[#D4AF37] flex flex-col justify-center items-center text-center space-y-2 shadow-lg">
                  <Sparkles className="w-8 h-8 text-[#D4AF37]" />
                  <span className="text-xs font-sans font-bold text-white uppercase">Dine-in & Quick Takeaway Ready</span>
                  <span className="text-[11px] font-sans text-[#D4AF37]/80">Air-conditioned luxury seating with contactless table QR ordering.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-[#D4AF37]/30 py-6 text-center text-xs font-sans text-[#D4AF37]/70 w-full bg-[#030304]">
        <p>© 2026 {shopName}. All Rights Reserved.</p>
        <p className="text-[10px] text-[#D4AF37]/50 mt-1 uppercase font-bold tracking-wider">POWERED BY NEXT.JS & SUPABASE REALTIME</p>
      </footer>
    </div>
  );
}