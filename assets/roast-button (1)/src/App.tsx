import { motion } from 'motion/react';

export default function App() {
  return (
    <div classname="min-h-screen flex items-center justify-center p-8 bg-zinc-900">
      <hypnoticbutton/>
    </div>
  );
}

function HypnoticButton() {
  return (
    <motion.button classname="relative overflow-hidden cursor-pointer group rounded-full border-4 border-white shadow-[0_0_40px_rgba(255,255,255,0.2)] bg-black" whilehover="hover" whiletap="tap" initial="rest" variants="{{" rest:="" {="" scale:="" 1,="" boxshadow:="" '0="" 0="" 40px="" rgba(255,255,255,0.2)'="" },="" hover:="" {="" scale:="" 1.05,="" boxshadow:="" '0="" 0="" 80px="" rgba(255,255,255,0.6)'="" },="" tap:="" {="" scale:="" 0.95,="" boxshadow:="" '0="" 0="" 20px="" rgba(255,255,255,0.4)'="" }="" }}="">
      {/* Swirling Hypnotic Rays */}
      <motion.div classname="absolute -inset-[200%]" style="{{" background:="" 'repeating-conic-gradient(from="" 0deg,="" #000="" 0deg="" 15deg,="" #fff="" 15deg="" 30deg)',="" }}="" animate="{{" rotate:="" 360="" }}="" transition="{{" duration:="" 20,="" repeat:="" infinity,="" ease:="" "linear"="" }}=""/>

      {/* Inner shadow/vignette for depth */}
      <div classname="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] z-10 pointer-events-none rounded-full"/>

      {/* Button Text */}
      <div classname="relative z-20 px-8 py-8 sm:px-12 sm:py-10 flex items-center justify-center">
        <motion.span classname="font-sans font-bold text-5xl sm:text-7xl text-white tracking-normal uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,1)]" style="{{" webkittextstroke:="" '2px="" black'="" }}="" variants="{{" rest:="" {="" scale:="" 1="" },="" hover:="" {="" scale:="" 1.1,="" transition:="" {="" duration:="" 0.3,="" type:="" "spring",="" bounce:="" 0.5="" }="" }="" }}="">
          ROAST SOMEONE
        </motion.span>
      </div>
    </motion.button>
  );
}
