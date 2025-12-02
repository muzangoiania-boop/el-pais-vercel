import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { QuizFlow } from './components/QuizFlow';
import { NewsFeed } from './components/NewsFeed';
import { Dashboard } from './components/dashboard/Dashboard';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // --- INÍCIO DO CÓDIGO DE RASTREAMENTO (UTM/XCOD) ---
  // Este efeito garante que os parametros passem para o checkout na Vercel
  useEffect(() => {
    const handleMouseDown = (e: any) => {
      // 1. Procura se o elemento clicado é um link
      const target = e.target.closest('a');

      // 2. Termos que identificam seus links de checkout
      // Adicionei termos comuns, pode adicionar mais se precisar
      const checkoutTerms = ['pay.hotmart', 'kiwify', 'checkout', 'payment', 'pay'];

      if (target && target.href) {
        // Verifica se o link contém algum termo de checkout
        const isCheckout = checkoutTerms.some((term: string) => target.href.includes(term));

        if (isCheckout) {
          const currentParams = window.location.search;

          // Se tiver parâmetros na URL do navegador
          if (currentParams) {
            // Verifica se o link JÁ tem o 'xcod' para não duplicar
            if (!target.href.includes('xcod')) {
              // Verifica se usa ? ou &
              const separator = target.href.includes('?') ? '&' : '?';

              // Limpa o ? extra do inicio
              const paramsClean = currentParams.replace(/^\?/, '');

              // Atualiza o link instantes antes do clique ser processado
              target.href = target.href + separator + paramsClean;

              // Log para você ver funcionando no console (pode remover depois)
              console.log('Parâmetros injetados no link:', target.href);
            }
          }
        }
      }
    };

    // Adiciona o ouvinte no documento todo
    document.addEventListener('mousedown', handleMouseDown);

    // Limpeza ao desmontar
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
  // --- FIM DO CÓDIGO DE RASTREAMENTO ---

  // Seu código original de roteamento
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (currentPath === '/dashboard' || currentPath === '/analytics') {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow w-full max-w-lg mx-auto px-4 py-4 md:px-0">
        <div className="border-b border-gray-200 pb-2 mb-4">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#c00] font-sans">
            PÉRDIDA DE PESO
          </span>
        </div>

        <QuizFlow />

        <div className="h-1 w-full bg-gray-100 my-8 rounded-full"></div>

        <NewsFeed />
      </main>

    </div>
  );
}