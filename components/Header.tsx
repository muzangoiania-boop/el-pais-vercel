import React from 'react';
import { Menu, User } from 'lucide-react';
import logoImage from '@assets/el-pais_1764448317569.png';

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Menu & Title */}
        <div className="flex items-center gap-4">
          <button className="text-news-black p-1">
            <Menu className="w-6 h-6" />
          </button>
          
          <img 
            src={logoImage} 
            alt="EL PAÍS" 
            className="h-6 select-none pointer-events-none"
          />
        </div>

        {/* Right: CTA & User */}
        <div className="flex items-center gap-3">
          <button className="bg-news-yellow hover:bg-[#ebd040] text-[10px] md:text-[11px] font-bold uppercase px-3 py-1.5 rounded-[1px] transition-colors tracking-wide text-black shadow-sm">
            Suscríbete
          </button>
          <button className="text-news-black p-1">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};