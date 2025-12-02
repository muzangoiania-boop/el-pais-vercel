import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, AlertTriangle, Check, X } from 'lucide-react';
import analytics from '../lib/analytics';
import gomitaImage from '@assets/baixados_1764452903199.webp';
import protocoloImage from '@assets/Inserir um título (2)_1764453061315.png';
import gomitaTestimonial from '@assets/Gomita_1764453233335.webp';
import fernandaTestimonial from '@assets/Fernanda_1764453233336.webp';
import marianaTestimonial from '@assets/Mariana_1764453233336.webp';
import carouselImage1 from '@assets/lg-Wlmuz-slide-2-adriana-17kg_1764453347817.jpg';
import carouselImage2 from '@assets/f4_1764453347817.webp';
import carouselImage3 from '@assets/lg-qwnL0-slide-1nereide-16kg_1764453375116.webp';
import rosanaImage from '@assets/50-year-old-woman-weight-600nw-2519627017_1764453653741.webp';
import beforeAfterImage from '@assets/dfg_1764453736974.webp';
import profilePhoto1 from '@assets/baixados (2)_1764470596368.jpg';
import profilePhoto2 from '@assets/stock_images/latina_woman_face_po_b062712e.jpg';
import profilePhoto3 from '@assets/baixados (1)_1764470596369.jpg';
import profilePhoto4 from '@assets/stock_images/latina_woman_face_po_721577a4.jpg';
import profilePhoto5 from '@assets/stock_images/latina_woman_face_po_43c11193.jpg';
import profilePhoto6 from '@assets/stock_images/middle_aged_woman_fa_da927933.jpg';
import profilePhoto7 from '@assets/baixados_1764470596369.jpg';
import profilePhoto8 from '@assets/images (1)_1764470674545.jpg';
import profilePhoto9 from '@assets/images_1764470674545.jpg';
import profilePhoto10 from '@assets/images (2)_1764470774467.jpg';


// --- Types ---
type StepType = 'intro' | 'button-select' | 'slider' | 'input' | 'loading' | 'result' | 'sales';

interface StepConfig {
  id: number;
  type: StepType;
  title: React.ReactNode;
  subtitle?: string;
  options?: string[]; // For buttons
  min?: number; // For sliders
  max?: number;
  unit?: string;
  loadingText?: string; // For loading step
}

const carouselImages = [carouselImage1, carouselImage2, carouselImage3];

export const QuizFlow = () => {
  const [step, setStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [rangeValue, setRangeValue] = useState(50); // Generic slider state
  const [name, setName] = useState('');
  const [peso, setPeso] = useState(70); // Weight in kg
  const [altura, setAltura] = useState(165); // Height in cm
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCTAButton, setShowCTAButton] = useState(false); // CTA button visibility
  const hasTrackedStart = useRef(false);
  const previousStep = useRef(0);
  const ctaTrackedRef = useRef(false); // Prevent duplicate tracking

  // Calculate IMC
  const calcularIMC = () => {
    const alturaMetros = altura / 100;
    return peso / (alturaMetros * alturaMetros);
  };

  // Get IMC category
  const getIMCCategory = (imc: number) => {
    if (imc < 18.5) return 'bajo';
    if (imc < 25) return 'normal';
    if (imc < 30) return 'sobrepeso';
    return 'obesidad';
  };

  // Auto-scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Track quiz start
  useEffect(() => {
    if (!hasTrackedStart.current) {
      analytics.trackQuizStart();
      hasTrackedStart.current = true;
    }
  }, []);

  // Track step views only (completion is tracked in handleNext)
  useEffect(() => {
    if (step !== previousStep.current) {
      analytics.trackStepView(step);
      previousStep.current = step;
    }
  }, [step]);

  // Track quiz completion
  useEffect(() => {
    if (step === 18) {
      analytics.trackQuizComplete({ name, peso, altura, imc: calcularIMC() });
    }
  }, [step, name, peso, altura]);

  // Track page unload for abandon detection
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (step > 0 && step < 18) {
        analytics.trackAbandon(step);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  // Reset slider value when entering slider steps
  useEffect(() => {
    if (step === 11) setRangeValue(70);  // Peso actual
    if (step === 12) setRangeValue(165); // Estatura
    if (step === 13) setRangeValue(60);  // Peso objetivo
  }, [step]);

  // Handle Loading Logic
  useEffect(() => {
    // The loading step is now at index 15
    if (step === 15) {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep(prevStep => prevStep + 1);
            return 100;
          }
          return prev + 1.5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Carousel auto-rotation during loading
  useEffect(() => {
    if (step === 15) {
      const carouselInterval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % carouselImages.length);
      }, 800);
      return () => clearInterval(carouselInterval);
    }
  }, [step]);

  // Load Wistia SDK when reaching video page
  useEffect(() => {
    if (step === 18) {
      const existingPlayerScript = document.querySelector('script[src*="fast.wistia.com/player.js"]');
      if (!existingPlayerScript) {
        const playerScript = document.createElement('script');
        playerScript.src = 'https://fast.wistia.com/player.js';
        playerScript.async = true;
        document.head.appendChild(playerScript);
      }
      
      const existingEmbedScript = document.querySelector('script[src*="fast.wistia.com/embed/8xc87ip699.js"]');
      if (!existingEmbedScript) {
        const embedScript = document.createElement('script');
        embedScript.src = 'https://fast.wistia.com/embed/8xc87ip699.js';
        embedScript.async = true;
        embedScript.type = 'module';
        document.head.appendChild(embedScript);
      }
    }
  }, [step]);

  // Track actual video playback time (ignoring pauses) and show CTA after threshold
  const isPlayingRef = useRef(false);
  const lastTimestampRef = useRef(0);
  const accumulatedSecondsRef = useRef(0);
  const wistiaBindedRef = useRef(false);
  const CTA_THRESHOLD_SECONDS = 490; // 8 minutes and 10 seconds
  
  useEffect(() => {
    if (step !== 18) return;
    
    console.log('[Video Tracker] Starting Wistia playback tracking - CTA appears after', CTA_THRESHOLD_SECONDS, 'seconds watched');
    
    // Reset tracking state when entering video page
    isPlayingRef.current = false;
    lastTimestampRef.current = 0;
    accumulatedSecondsRef.current = 0;
    wistiaBindedRef.current = false;
    
    // Event handlers for Wistia web component
    const handlePlay = () => {
      isPlayingRef.current = true;
      console.log('[Video Tracker] PLAY - now tracking time. Accumulated so far:', accumulatedSecondsRef.current.toFixed(1), 's');
    };
    
    const handlePause = () => {
      isPlayingRef.current = false;
      console.log('[Video Tracker] PAUSE - stopped tracking. Total watched:', accumulatedSecondsRef.current.toFixed(1), 's');
    };
    
    const handleEnd = () => {
      isPlayingRef.current = false;
      console.log('[Video Tracker] ENDED - Total watched:', accumulatedSecondsRef.current.toFixed(1), 's');
    };
    
    const handleTimeUpdate = (event: any) => {
      const currentTime = event.detail?.currentTime ?? event.target?.currentTime ?? 0;
      
      // Only accumulate time if video is playing and time moved forward
      if (isPlayingRef.current && currentTime > lastTimestampRef.current) {
        const delta = currentTime - lastTimestampRef.current;
        
        // Only add reasonable deltas (ignore big jumps from seeking forward)
        if (delta > 0 && delta < 2) {
          accumulatedSecondsRef.current += delta;
        }
      }
      
      // Update last timestamp
      lastTimestampRef.current = currentTime;
      
      // Show CTA button once threshold is reached
      if (accumulatedSecondsRef.current >= CTA_THRESHOLD_SECONDS && !showCTAButton) {
        console.log('[Video Tracker] THRESHOLD REACHED! Watched', accumulatedSecondsRef.current.toFixed(1), 's - SHOWING CTA BUTTON');
        setShowCTAButton(true);
      }
    };
    
    let playerElement: HTMLElement | null = null;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    // Wistia web component binding using native DOM events
    const bindWistiaPlayer = () => {
      if (wistiaBindedRef.current) return;
      
      // Find the wistia-player element
      playerElement = document.querySelector('wistia-player[media-id="8xc87ip699"]');
      
      if (playerElement) {
        wistiaBindedRef.current = true;
        console.log('[Video Tracker] Wistia player found - binding events');
        
        // Use native DOM addEventListener for web component events
        playerElement.addEventListener('play', handlePlay);
        playerElement.addEventListener('pause', handlePause);
        playerElement.addEventListener('end', handleEnd);
        playerElement.addEventListener('time-update', handleTimeUpdate);
        
        console.log('[Video Tracker] Events bound successfully');
        
        // Stop polling once bound
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      } else {
        console.log('[Video Tracker] Waiting for Wistia player element...');
      }
    };
    
    // Poll every 500ms until player is found (more reliable than fixed timeouts)
    pollingInterval = setInterval(bindWistiaPlayer, 500);
    
    // Also try immediately
    bindWistiaPlayer();
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      // Clean up event listeners
      if (playerElement) {
        playerElement.removeEventListener('play', handlePlay);
        playerElement.removeEventListener('pause', handlePause);
        playerElement.removeEventListener('end', handleEnd);
        playerElement.removeEventListener('time-update', handleTimeUpdate);
      }
    };
  }, [step, showCTAButton]);

  // Preload all images in background after initial page load
  useEffect(() => {
    const imagesToPreload = [
      protocoloImage,
      gomitaTestimonial,
      fernandaTestimonial,
      marianaTestimonial,
      carouselImage1,
      carouselImage2,
      carouselImage3,
      rosanaImage,
      beforeAfterImage,
      profilePhoto1,
      profilePhoto2,
      profilePhoto3,
      profilePhoto4,
      profilePhoto5,
      profilePhoto6,
      profilePhoto7,
      profilePhoto8,
      profilePhoto9,
      profilePhoto10,
    ];

    // Wait for initial page to be fully loaded, then preload images
    const preloadImages = () => {
      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadImages);
    } else {
      setTimeout(preloadImages, 100);
    }
  }, []);

  const handleNext = () => {
    analytics.trackStepComplete(step);
    setStep((prev) => prev + 1);
  };

  // Handle CTA link click - triggers InitiateCheckout event for dataLayer
  // Note: No redirect needed as the <a> tag href handles navigation automatically
  // This allows GTM to detect the link click to pay.hotmart.com and send parameters
  const handleCTAClick = () => {
    if (ctaTrackedRef.current) return;
    ctaTrackedRef.current = true;
    
    console.log('[CTA Link] Link clicked - pushing InitiateCheckout to dataLayer');
    console.log('[CTA Link] Window dataLayer exists:', !!(window as any).dataLayer);
    
    // Push InitiateCheckout event to dataLayer for GTM/Meta Ads
    (window as any).dataLayer = (window as any).dataLayer || [];
    
    const eventData = {
      'event': 'initiate_checkout',
      'event_category': 'ecommerce',
      'event_label': 'cta_link_click',
      'cta_source': 'custom_cta_link'
    };
    
    console.log('[CTA Link] Pushing event to dataLayer:', eventData);
    (window as any).dataLayer.push(eventData);
    console.log('[CTA Link] DataLayer content:', (window as any).dataLayer);
    
    // No redirect needed - the <a> tag href handles navigation automatically
    // GTM will detect this as a link click to pay.hotmart.com and apply URL parameters
  };

  // --- Step Content Renderers ---

  const renderIntro = () => (
    <div className="space-y-3 animate-fade-in">
      <h1 className="font-serif text-xl font-bold leading-tight text-news-black">
        GOMITA SORPRENDE A SUS FANS AL REVELAR CÓMO PERDIÓ 8 KG CON UNA GELATINA REDUCTORA CONSUMIDA ANTES DE LAS COMIDAS
      </h1>
      <p className="font-serif text-sm leading-relaxed text-gray-700">
        El cambio radical ocurrió después de que la influencer mexicana realizara una <strong className="font-bold">PRUEBA GRATUITA</strong> del Protocolo de la Gelatina Reductora, que activa las células adelgazantes del intestino y permite perder de <strong className="font-bold">3 a 5 kg en solo 7 días</strong> — sin dieta, sin medicamentos y sin gimnasio.
      </p>
      
      <div className="w-full overflow-hidden rounded-md">
        <img src={gomitaImage} className="w-full h-auto object-cover" alt="Transformación de Gomita" />
      </div>

      <div className="bg-yellow-50 border-l-4 border-news-yellow p-3">
        <p className="font-serif text-xs italic text-gray-700">
          👉 Haz clic en el botón de abajo y descubre si este protocolo también funciona para tu cuerpo. <span className="font-bold">¡Haz la prueba gratuita ahora!</span>
        </p>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-base py-3 px-6 rounded shadow-md transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 animate-pulse-cta"
      >
        Iniciar mi prueba GRATIS ahora
      </button>

      <div className="flex flex-col gap-1 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-news-yellow" /> Prueba 100% gratuita
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-news-yellow" /> Toma menos de 2 minutos
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-3 h-3 text-news-yellow" /> Información 100% encriptada
        </div>
      </div>
    </div>
  );

  const handleButtonClick = (answer: string, answerIndex: number) => {
    analytics.trackAnswer(step, answer, answerIndex);
    handleNext();
  };

  const renderButtons = (title: string, options: string[], subtitle?: string) => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight">
        {title}
      </h2>
      {subtitle && <p className="text-gray-600 font-serif">{subtitle}</p>}
      
      <div className="space-y-3 mt-6">
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleButtonClick(opt, idx)}
            className="w-full text-left bg-white border border-gray-200 hover:border-news-yellow hover:bg-yellow-50 p-4 rounded-md shadow-sm transition-all font-medium text-gray-800 flex items-center justify-between group"
          >
            {opt}
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-news-yellow" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderSlider = (title: string, min: number, max: number, unit: string, subtitle?: string, icon?: string, defaultValue?: number, onSave?: (value: number) => void) => {
    const currentValue = rangeValue < min || rangeValue > max ? (defaultValue || Math.round((min + max) / 2)) : rangeValue;
    const percentage = ((currentValue - min) / (max - min)) * 100;
    
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value);
      setRangeValue(newValue);
      if (onSave) onSave(newValue);
    };

    const handleContinue = () => {
      if (onSave) onSave(currentValue);
      analytics.trackSliderValue(step, currentValue, unit);
      handleNext();
    };

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="text-center">
          {icon && <span className="text-4xl mb-2 block">{icon}</span>}
          <h2 className="font-serif text-2xl font-bold text-news-black leading-tight">
            {title}
          </h2>
          {subtitle && <p className="text-gray-500 font-serif text-sm mt-2">{subtitle}</p>}
        </div>

        {/* Value Display */}
        <div className="text-center py-4">
          <span className="text-6xl font-bold font-serif text-news-black">{currentValue}</span>
          <span className="text-2xl font-serif text-gray-500 ml-2">{unit}</span>
        </div>

        {/* Slider Track */}
        <div className="px-2">
          <div className="relative h-8 flex items-center">
            {/* Background Track */}
            <div className="absolute w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              {/* Filled Track */}
              <div 
                className="h-full bg-gradient-to-r from-news-yellow to-orange-400 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            {/* Thumb Indicator */}
            <div 
              className="absolute w-7 h-7 bg-white border-4 border-news-yellow rounded-full shadow-lg pointer-events-none"
              style={{ left: `calc(${percentage}% - 14px)` }}
            />
            
            {/* Invisible Range Input on top */}
            <input 
              type="range" 
              min={min} 
              max={max} 
              value={currentValue} 
              onChange={handleSliderChange}
              className="absolute w-full h-8 opacity-0 cursor-pointer z-10"
            />
          </div>
          
          {/* Min/Max Labels */}
          <div className="flex justify-between mt-3 text-sm text-gray-400 font-medium">
            <span>{min} {unit}</span>
            <span>{max} {unit}</span>
          </div>
        </div>

        {/* Helper Text */}
        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 font-serif">
            <span className="text-news-yellow">✓</span> Ajustaremos la <strong className="text-news-black">dosis ideal</strong> del Protocolo para tu cuerpo.
          </p>
        </div>

        <button 
          onClick={handleContinue}
          className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
        >
          Continuar
        </button>
      </div>
    );
  };

  const handleNameSubmit = () => {
    analytics.trackAnswer(step, name, 0);
    handleNext();
  };

  const renderInput = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight">
        Para crear tu plan personalizado, necesitamos tu nombre.
      </h2>
      <p className="text-gray-600 font-serif">Tranquila, tus datos están protegidos 🔒</p>

      <input 
        type="text" 
        placeholder="Escribe tu nombre..." 
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-4 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:border-news-yellow focus:ring-1 focus:ring-news-yellow outline-none text-lg shadow-sm"
      />

      <button 
        onClick={handleNameSubmit}
        disabled={name.length < 2}
        className="w-full bg-news-yellow hover:bg-[#ebd040] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>
    </div>
  );

  const renderProtocolIntro = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight text-center">
        ¡Conoce el Protocolo Gelatina Reductora que está ayudando a celebridades y a miles de mujeres comunes a adelgazar sin gastar una fortuna en farmacia!
      </h2>
      
      <p className="font-serif text-gray-700 text-center">
        Descubre el Protocolo <strong className="text-black">10 veces más potente</strong> que el Mounjaro y el Ozempic juntos...
      </p>
      
      <p className="font-serif text-gray-700 text-center">
        Controla tu apetito, acelera tu metabolismo y te ayuda a <span className="underline decoration-news-yellow decoration-2">eliminar grasa de forma rápida y eficaz</span>.
      </p>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>

      <div className="my-6">
        <h3 className="font-serif text-xl font-bold text-center text-news-black mb-6">
          ¿CÓMO FUNCIONA EL PROTOCOLO DE GELATINA REDUCTORA?
        </h3>
        
        <div className="w-full overflow-hidden rounded-lg">
          <img src={protocoloImage} decoding="async" className="w-full h-auto object-contain" alt="Cómo funciona el Protocolo de Gelatina Reductora" />
        </div>
      </div>

      <p className="font-serif text-gray-700 text-center">
        Los componentes del Protocolo Gelatina Reductora siguen actuando mientras duermes, <strong className="text-black">activando tus células quemadoras de grasa</strong> y acelerando la producción natural de GLP-1.
      </p>

      <p className="font-serif text-gray-700 text-center">
        Esto mantiene tu metabolismo quemando grasa <strong className="text-black">hasta 10 veces más rápido</strong> durante el sueño.
      </p>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>
    </div>
  );

  const renderTestimonials = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight text-center">
        Historias Reales de Transformación de nuestras clientas con el Protocolo Gelatina Reductora
      </h2>

      {/* Testimonial 1 - Gomita */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <img src={gomitaTestimonial} decoding="async" className="w-full h-auto object-contain" alt="Transformación de Gomita" />
        <div className="p-4 space-y-3">
          <p className="font-serif italic text-gray-700 text-sm leading-relaxed border-l-4 border-news-yellow pl-3">
            "Ya había intentado de todo para adelgazar, pero nada funcionaba realmente. Después de empezar a usar la fórmula de la Gelatina Reductora en mi día a día, perdí 8 kilos en solo 17 días — sin cambiar nada en mi alimentación. Ahora me siento más ligera, más bonita y con una confianza que no sentía desde hacía años."
          </p>
          <p className="font-bold text-news-black text-sm">— Gomita / Influenciadora Mexicana</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-yellow-400">★★★★★</span>
            <span>Cliente Verificada</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>

      {/* Testimonial 2 - Fernanda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <img src={fernandaTestimonial} decoding="async" className="w-full h-auto object-cover" alt="Transformación de Fernanda" />
        <div className="p-4 space-y-3">
          <p className="font-serif italic text-gray-700 text-sm leading-relaxed border-l-4 border-news-yellow pl-3">
            "Ya había intentado de todo para adelgazar, pero nada funcionaba. Después de incluir la fórmula de la Gelatina Reductora en mi rutina, perdí 11 kg en solo 3 semanas sin cambiar nada en mi alimentación. Ahora me siento más segura y llena de energía. ¡Este Protocolo cambió mi vida!"
          </p>
          <p className="font-bold text-news-black text-sm">— Fernanda Rodríguez — Ciudad de México</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-yellow-400">★★★★★</span>
            <span>Cliente Verificada</span>
          </div>
        </div>
      </div>

      {/* Testimonial 3 - Mariana */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <img src={marianaTestimonial} decoding="async" className="w-full h-auto object-cover" alt="Transformación de Mariana" />
        <div className="p-4 space-y-3">
          <p className="font-serif italic text-gray-700 text-sm leading-relaxed border-l-4 border-news-yellow pl-3">
            "Siempre luché con mi peso y me sentía cansada todo el tiempo. Desde que empecé con la fórmula de la Sal Rosa, logré bajar 15 kilos en 2 semanas. No tuve que hacer dietas extremas ni pasar hambre. Hoy tengo más energía, mi ropa me queda mejor y me siento orgullosa de mi misma."
          </p>
          <p className="font-bold text-news-black text-sm">— Mariana López - Buenos Aires</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-yellow-400">★★★★★</span>
            <span>Cliente Verificada</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>
    </div>
  );

  const renderLoading = () => (
    <div className="space-y-6 animate-fade-in text-center py-10">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight mb-8">
        Espera mientras preparamos tu Protocolo Gelatina Reductora...
      </h2>

      <div className="relative w-full h-64 mb-8 overflow-hidden rounded-lg">
        {carouselImages.map((img, index) => (
          <img 
            key={index}
            src={img} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              index === carouselIndex ? 'opacity-100' : 'opacity-0'
            }`}
            alt={`Transformación ${index + 1}`} 
          />
        ))}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
          {carouselImages.map((_, index) => (
            <div 
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === carouselIndex ? 'bg-news-yellow w-4' : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div 
          className="bg-news-yellow h-4 rounded-full transition-all duration-75 ease-out" 
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
      <p className="font-serif text-lg font-bold">{Math.round(loadingProgress)}%</p>
    </div>
  );

  const renderResult = () => {
    const imc = calcularIMC();
    const category = getIMCCategory(imc);
    const imcPosition = Math.min(Math.max(((imc - 15) / (35 - 15)) * 100, 0), 100);
    
    return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight">
        ¡ATENCIÓN, {name.toUpperCase() || 'AMIGA'}!
      </h2>

      <p className="font-serif text-base text-gray-700 leading-relaxed">
        Según tus respuestas, tu cuerpo está en modo <strong className="text-black">ACUMULACIÓN DE GRASA</strong>. Si no actúas HOY, esta situación tiende a <strong className="text-black">EMPEORAR</strong>.
      </p>

      {/* IMC visualizer */}
      <div className="space-y-4 my-6">
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-1">Tu IMC:</p>
          <p className="text-4xl font-bold text-orange-500">{imc.toFixed(1)}</p>
        </div>
        
        {/* IMC Bar */}
        <div className="relative mt-12 pt-2">
          {/* Indicator Arrow */}
          <div 
            className="absolute -top-5 transform -translate-x-1/2 flex flex-col items-center z-10"
            style={{ left: `${imcPosition}%` }}
          >
            <span className="text-orange-500 text-xs font-medium mb-0.5">Tú hoy</span>
            <div 
              className="w-0 h-0"
              style={{
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #F97316'
              }}
            />
          </div>
          
          {/* Color Bar */}
          <div className="flex h-8 rounded-lg overflow-hidden">
            <div className={`flex-1 flex items-center justify-center text-xs font-medium text-white ${category === 'bajo' ? 'ring-2 ring-offset-1 ring-blue-600' : ''}`} style={{ backgroundColor: '#3B82F6' }}>
              Bajo peso
            </div>
            <div className={`flex-1 flex items-center justify-center text-xs font-medium text-white ${category === 'normal' ? 'ring-2 ring-offset-1 ring-green-600' : ''}`} style={{ backgroundColor: '#22C55E' }}>
              Normal
            </div>
            <div className={`flex-1 flex items-center justify-center text-xs font-medium text-white ${category === 'sobrepeso' ? 'ring-2 ring-offset-1 ring-orange-600' : ''}`} style={{ backgroundColor: '#F97316' }}>
              Sobrepeso
            </div>
            <div className={`flex-1 flex items-center justify-center text-xs font-medium text-white ${category === 'obesidad' ? 'ring-2 ring-offset-1 ring-red-600' : ''}`} style={{ backgroundColor: '#EF4444' }}>
              Obesidad
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-serif text-xl font-bold text-center mt-6">
        ¡Tus células quemagrasas pueden estar dormidas y saboteando tu metabolismo sin que te des cuenta!
      </h3>

      <p className="font-serif text-sm text-gray-700 leading-relaxed">
        Incluso si estás en un peso normal, tu cuerpo podría estar desactivando las <span className="text-news-yellow font-semibold">células quemagrasas del intestino</span>, lo que ralentiza tu metabolismo, dificulta la quema de grasa y favorece el aumento de peso.
      </p>

      <div className="space-y-4 mt-6">
        <p className="font-bold text-sm text-news-black">Algunos signos de alerta:</p>
        
        <div className="space-y-3 text-sm font-serif text-gray-700">
          <p className="flex items-start gap-2">
            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Metabolismo lento y dificultad para adelgazar aunque comas poco</span>
          </p>
          <p className="flex items-start gap-2">
            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Cansancio constante y sensación de hinchazón</span>
          </p>
          <p className="flex items-start gap-2">
            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>Acumulación de grasa en zonas específicas del cuerpo, especialmente en el abdomen</span>
          </p>
          <p className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <span>Con el Protocolo Gelatina Reductora, tu cuerpo acelera la quema de grasa de forma natural</span>
          </p>
          <p className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <span>La combinación ideal de ingredientes puede reactivar las células quemagrasas, acelerar el metabolismo, reducir la retención de líquidos y aumentar tu energía</span>
          </p>
        </div>
      </div>

      <div className="text-center py-4 mt-4">
        <h3 className="font-serif font-bold text-xl mb-4 text-news-black">
          ¡Descubre ahora cómo el Protocolo Gelatina Reductora puede transformar tu cuerpo!
        </h3>
        <p className="text-sm text-gray-600 mb-4">Mira la transformación de <span className="text-news-yellow font-semibold">Rosana Rosalez</span>.</p>
        
        <div className="w-full overflow-hidden rounded-lg mb-6">
          <img src={rosanaImage} decoding="async" className="w-full h-auto object-cover" alt="Transformación de Rosana Rosalez" />
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>
    </div>
  );
  };

  const renderVideoPage = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-xl font-bold text-news-black leading-tight text-center uppercase">
        MIRA EL VIDEO A CONTINUACIÓN Y DESCUBRE CÓMO ACCEDER A TU PROTOCOLO DE GELATINA REDUCTORA.
      </h2>

      {/* Wistia Video Player */}
      <div className="relative w-full rounded-lg overflow-hidden">
        <div 
          style={{ margin: '0 auto', width: '100%', maxWidth: '400px' }}
          dangerouslySetInnerHTML={{ __html: `
            <style>
              wistia-player[media-id='8xc87ip699']:not(:defined) {
                background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/8xc87ip699/swatch');
                display: block;
                filter: blur(5px);
                padding-top: 152.5%;
              }
            </style>
            <wistia-player media-id="8xc87ip699" seo="false" aspect="0.6557377049180327"></wistia-player>
          `}}
        />
      </div>

      {/* CTA Button - Initially hidden, appears after watching threshold */}
      {/* Using <a> tag instead of <button> so GTM can detect link clicks to pay.hotmart.com */}
      {showCTAButton && (
        <div className="mt-4 animate-fade-in">
          <a
            href="https://pay.hotmart.com/I103092154N?off=8pqi3d4c&checkoutMode=10"
            onClick={handleCTAClick}
            className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta-strong flex items-center justify-center gap-2"
          >
            <span>ACCEDER A MI PROTOCOLO PERSONALIZADO AHORA</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      )}

      {/* Comments Section */}
      <div className="border-t pt-6 mt-6">
        <h4 className="font-bold text-sm mb-4">100+ comentarios</h4>
        
        <div className="space-y-4">
          {/* Comment 1 */}
          <div className="flex gap-3">
            <img src={profilePhoto1} alt="Mariana" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Mariana Gutiérrez</p>
              <p className="text-xs text-gray-600 mt-1">Este protocolo lo cambió todo para mí. En pocas semanas vi cómo mi abdomen desinflamaba y la ropa volvía a quedarme.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 2 min</p>
            </div>
          </div>

          {/* Comment 2 */}
          <div className="flex gap-3">
            <img src={profilePhoto2} alt="Camila" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Camila Rodríguez</p>
              <p className="text-xs text-gray-600 mt-1">Intenté de todo, pero nada funcionaba... hasta conocer este protocolo. Hoy estoy 14 kg más liviana y con la autoestima por las nubes.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 5 min</p>
            </div>
          </div>

          {/* Comment 3 */}
          <div className="flex gap-3">
            <img src={profilePhoto3} alt="Sofía" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Sofía Morales</p>
              <p className="text-xs text-gray-600 mt-1">Es increíble cómo algo tan simple puede transformar tanto. Ya son 3 meses siguiéndolo y me siento otra persona.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 8 min</p>
            </div>
          </div>

          {/* Comment 4 */}
          <div className="flex gap-3">
            <img src={profilePhoto4} alt="Valeria" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Valeria Castillo</p>
              <p className="text-xs text-gray-600 mt-1">Había perdido las esperanzas, pero este protocolo que devolvió la confianza y la energía. Nunca imaginé que funcionaría tan bien.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 12 min</p>
            </div>
          </div>

          {/* Comment 5 */}
          <div className="flex gap-3">
            <img src={profilePhoto5} alt="Fernanda" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Fernanda López</p>
              <p className="text-xs text-gray-600 mt-1">Mi vida cambió por completo. La balanza finalmente empezó a bajar y no se detuvo más.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 15 min</p>
            </div>
          </div>

          {/* Comment 6 */}
          <div className="flex gap-3">
            <img src={profilePhoto6} alt="Carolina" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Carolina Ramírez</p>
              <p className="text-xs text-gray-600 mt-1">Nunca voy a olvidar la sensación de ver mi cuerpo cambiar día tras día gracias a este protocolo.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 18 min</p>
            </div>
          </div>

          {/* Comment 7 */}
          <div className="flex gap-3">
            <img src={profilePhoto7} alt="Lucía" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Lucía Fernández</p>
              <p className="text-xs text-gray-600 mt-1">En solo 10 días ya vi resultados que no logré en años de gimnasio y dietas.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 22 min</p>
            </div>
          </div>

          {/* Comment 8 */}
          <div className="flex gap-3">
            <img src={profilePhoto8} alt="Gabriela" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Gabriela Torres</p>
              <p className="text-xs text-gray-600 mt-1">El protocolo fue como un renacimiento para mí. Me siento más joven, más ligera y feliz con mi cuerpo.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 25 min</p>
            </div>
          </div>

          {/* Comment 9 */}
          <div className="flex gap-3">
            <img src={profilePhoto9} alt="Isabella" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Isabella Vargas</p>
              <p className="text-xs text-gray-600 mt-1">Hoy, después de 18 kg menos, solo tengo una palabra: gratitud por este protocolo.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 30 min</p>
            </div>
          </div>

          {/* Comment 10 */}
          <div className="flex gap-3">
            <img src={profilePhoto10} alt="Patricia" decoding="async" className="w-8 h-8 rounded-full shrink-0 object-cover" />
            <div className="flex-1">
              <p className="font-bold text-sm">Patricia Martínez</p>
              <p className="text-xs text-gray-600 mt-1">Hoy, después de 18 kg menos, solo tengo una palabra: gratitud por este protocolo.</p>
              <p className="text-xs text-gray-400 mt-1">Responder · Me gusta · hace 35 min</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 pt-4 border-t">
          Para comentar, inicia sesión en tu cuenta.
        </p>
      </div>

    </div>
  );

  const renderTransformReady = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-serif text-2xl font-bold text-news-black leading-tight">
        {name || 'Amiga'}, ¿Estás lista para transformar tu cuerpo y tu salud?
      </h2>

      <p className="font-serif text-base text-gray-700 leading-relaxed text-center">
        Haz clic en <strong className="text-black">Continuar</strong> si deseas obtener tu <span className="text-news-yellow font-semibold">protocolo personalizado</span>.
      </p>

      {/* Before/After Image */}
      <div className="w-full overflow-hidden rounded-lg">
        <img src={beforeAfterImage} decoding="async" className="w-full h-auto object-cover" alt="Antes y Después" />
      </div>

      {/* Comparison Table */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Without Protocol */}
        <div className="space-y-3">
          <h4 className="text-red-500 font-bold text-sm text-center">Sin el Protocolo Gelatina Reductora</h4>
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong>Metabolismo:</strong> Lento</span>
            </p>
            <p className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong>Nivel de estrés:</strong> Alto</span>
            </p>
            <p className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong>Nivel de energía:</strong> Bajo</span>
            </p>
            <p className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span><strong>Riesgos de enfermedades:</strong> Altísimos</span>
            </p>
          </div>
        </div>

        {/* With Protocol */}
        <div className="space-y-3">
          <h4 className="text-green-600 font-bold text-sm text-center">Con el Protocolo Gelatina Reductora</h4>
          <div className="space-y-2 text-sm">
            <p className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Metabolismo:</strong> Acelerado</span>
            </p>
            <p className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Nivel de estrés:</strong> Bajo</span>
            </p>
            <p className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Nivel de energía:</strong> Fuerte</span>
            </p>
            <p className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span><strong>Riesgo de enfermedades:</strong> Muy bajo</span>
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full bg-news-yellow hover:bg-[#ebd040] text-black font-bold text-lg py-4 px-6 rounded shadow-md transition-all animate-pulse-cta"
      >
        Continuar
      </button>
    </div>
  );

  // --- Main Switch ---

  switch (step) {
    case 0:
      return renderIntro();
    case 1:
      return renderButtons('¿Cuántos kilos deseas perder?', [
        'Hasta 5 kg',
        'De 6 a 10 kg',
        'De 11 a 15 kg',
        'De 16 a 20 kg',
        'Más de 20 kg'
      ], 'Con base en tu respuesta, veremos si estás apta para eliminar grasa de forma acelerada.');
    case 2:
      return renderButtons('¿Cómo clasificarías tu cuerpo hoy?', [
        'Regular',
        'Flácido',
        'Sobrepeso',
        'Obeso'
      ]);
    case 3:
      return renderButtons('¿En qué zona de tu cuerpo te gustaría reducir más grasa?', [
        'Región de las Caderas',
        'Región de los Muslos',
        'Región del Abdomen (barriga)',
        'Región de los Glúteos',
        'Región de los Brazos'
      ]);
    case 4:
      return renderInput();
    case 5:
      return renderButtons('¿Realmente estás feliz con tu apariencia?', [
        'No, porque me siento con sobrepeso',
        'Sí, pero sé que puedo mejorar mi salud',
        'No, me gustaría bajar de peso para mejorar mi bienestar'
      ]);
    case 6:
      return renderButtons('¿Qué es lo que más te impide bajar de peso?', [
        'Falta de tiempo – Rutina agitada',
        'Autocontrol – Dificultad para resistir las tentaciones',
        'Finanzas – Considerar que lo saludable es caro'
      ]);
    case 7:
       return renderButtons('¿Cómo afecta tu peso a tu vida?', [
        'Evito tomarme fotos porque me da vergüenza',
        'Mi pareja ya no me mira con deseo como antes',
        'Evito reuniones sociales porque no me siento bien',
        'Ninguna de las opciones'
      ]);
    case 8:
      return renderButtons('¿Cuáles de estos beneficios te gustaría tener?', [
        'Bajar de peso sin esfuerzo y sin efecto rebote',
        'Dormir más profundamente',
        'Tener más energía y disposición durante el día',
        'Aumentar la autoestima y la confianza',
        'Reducir el estrés y la ansiedad'
      ], 'Personalizaremos tu protocolo para maximizar los resultados.');
    case 9:
      return renderProtocolIntro();
    case 10:
      return renderTestimonials();
    case 11:
      return renderSlider('¿Cuál es tu peso actual?', 50, 150, 'kg', '¡Comencemos! Esto nos ayuda a personalizar tu protocolo.', undefined, 70, setPeso);
    case 12:
      return renderSlider('¿Cuál es tu estatura?', 140, 200, 'cm', 'Calcularemos la dosis exacta del Protocolo para tu cuerpo.', undefined, 165, setAltura);
    case 13:
      return renderSlider('¿Cuál es tu peso objetivo?', 40, 100, 'kg', '¡Ya casi terminamos! Este es el peso que deseas alcanzar.', undefined, 60);
    case 14:
      return renderButtons('¿Cuántos vasos de agua bebes al día?', [
        'Solo bebo café o té',
        '1–2 vasos al día',
        '2–6 vasos al día',
        'Más de 6 vasos'
      ], 'Tu nivel de hidratación también influye en tu pérdida de peso.');
    case 15:
      return renderLoading();
    case 16:
      return renderResult();
    case 17:
      return renderTransformReady();
    case 18:
      return renderVideoPage();
    default:
      return null;
  }
};