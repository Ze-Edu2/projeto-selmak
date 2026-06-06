/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Visit, SavedClient } from "../types";
import { 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Info, 
  CheckCircle,
  AlertTriangle,
  Settings,
  Scale,
  Database,
  CloudLightning,
  Copy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { isSupabaseConfigured } from "../supabaseClient";
import { performCloudSync } from "../supabaseService";

interface BackupSettingsProps {
  visits: Visit[];
  savedClients: SavedClient[];
  onImportData: (visits: Visit[], clients: SavedClient[]) => void;
  onResetToSeeds: () => void;
  onClearAll: () => void;
}

export const BackupSettings: React.FC<BackupSettingsProps> = ({
  visits,
  savedClients,
  onImportData,
  onResetToSeeds,
  onClearAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isSqlExpanded, setIsSqlExpanded] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearTimeoutId, setClearTimeoutId] = useState<any>(null);

  React.useEffect(() => {
    return () => {
      if (clearTimeoutId) clearTimeout(clearTimeoutId);
    };
  }, [clearTimeoutId]);

  const handleClearAllClick = () => {
    if (confirmClearAll) {
      onClearAll();
      showMessage("Memória técnica local apagada com sucesso.", false);
      setConfirmClearAll(false);
      if (clearTimeoutId) {
        clearTimeout(clearTimeoutId);
        setClearTimeoutId(null);
      }
    } else {
      setConfirmClearAll(true);
      const to = setTimeout(() => {
        setConfirmClearAll(false);
      }, 5000); // 5 sec window
      setClearTimeoutId(to);
    }
  };

  const triggerExport = () => {
    try {
      const dataStr = JSON.stringify({ visits, savedClients }, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `selmak-agenda-backup-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
      
      showMessage("Backup exportado com sucesso!", false);
    } catch {
      showMessage("Erro ao exportar backup.", true);
    }
  };

  const showMessage = (text: string, error = false) => {
    setStatusMessage({ text, error });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      showMessage("SQL copiado para a área de transferência!", false);
    } catch {
      showMessage("Erro ao copiar código SQL de forma automática.", true);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsed = JSON.parse(fileContent);

        if (parsed && (Array.isArray(parsed.visits) || Array.isArray(parsed.savedClients))) {
          const importedVisits = Array.isArray(parsed.visits) ? parsed.visits : [];
          const importedClients = Array.isArray(parsed.savedClients) ? parsed.savedClients : [];
          
          onImportData(importedVisits, importedClients);
          showMessage(`Sucesso! Importado de forma bem-sucedida.`, false);
        } else {
          showMessage("Arquivo inválido. Deve conter listas de visitas ou clientes.", true);
        }
      } catch {
        showMessage("Erro ao ler ou processar arquivo JSON. Formato incorreto.", true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // reset
    }
  };

  return (
    <div id="backup-settings-container" className="space-y-4 text-xs font-mono">
      
      {/* Brand & Client Details */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 space-y-3.5 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-5 -translate-y-5 opacity-5">
          <Scale className="w-40 h-40" />
        </div>

        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <span className="font-black font-mono uppercase tracking-wider text-amber-500 text-xs">
            Selmak Balanças Ltda
          </span>
        </div>
        
        <p className="text-slate-350 leading-relaxed text-[11px] font-sans">
          Central integrada de visitas técnicas, rotas de manutenção, calibração e selagem INMETRO. Os dados são salvos localmente e replicados na nuvem quando conectado.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 font-mono text-[11px]">
          <div className="bg-slate-950 p-2.5 rounded-2xl text-center border border-slate-900">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Agendamentos</span>
            <span className="font-black text-amber-500 text-base">{visits.length}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-2xl text-center border border-slate-900">
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Base de Clientes</span>
            <span className="font-black text-amber-500 text-base">{savedClients.length}</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div id="settings-notif-message" className={`p-4 rounded-2xl flex items-center gap-2 font-mono font-bold text-[10px] uppercase tracking-wide border ${
          statusMessage.error 
            ? "bg-rose-955 text-rose-300 border-rose-900/60" 
            : "bg-emerald-950 text-emerald-300 border-emerald-900/60"
        }`}>
          {statusMessage.error ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Supabase Connection Details & Sync Control */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3.5 shadow-md">
        <h3 className="font-black text-xs text-white uppercase tracking-widest font-mono flex items-center justify-between border-b border-slate-850 pb-2">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-3.5 text-emerald-400" />
            <span>Conexão Supabase</span>
          </div>
          {isSupabaseConfigured ? (
            <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/60 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>
          ) : (
            <span className="text-[8px] bg-amber-955 text-amber-500 border border-amber-900/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Apenas Local</span>
          )}
        </h3>

        {isSupabaseConfigured ? (
          <div className="space-y-3">
            <p className="text-slate-350 leading-relaxed text-[11px] font-sans">
              O sistema está conectado ao Supabase e pronto para salvar as informações em tempo real no banco de dados na nuvem sempre que você criar ou editar visitas e clientes.
            </p>
            
            <button
              id="push-local-to-supabase-btn"
              disabled={isPushing}
              onClick={async () => {
                setIsPushing(true);
                const res = await performCloudSync(visits, savedClients);
                showMessage(res.message, !res.success);
                setIsPushing(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 p-3 bg-emerald-500 hover:bg-emerald-600 active:scale-98 font-black text-slate-950 rounded-xl shadow-sm text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              <CloudLightning className="w-4 h-4 text-slate-950 stroke-[3]" />
              {isPushing ? "Sincronizando..." : "Sincronizar Dados de LocalStorage p/ Supabase"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
              Para ativar a persistência online e salvar tudo no Supabase, declare as variáveis de ambiente <code className="text-amber-500 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> e <code className="text-amber-500 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> no seu painel ou arquivo de configuração local.
            </p>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850/60 text-slate-400 text-[10px] leading-relaxed">
              <span className="text-amber-400 font-bold block mb-1">💡 Modo Local Ativo:</span>
              As alterações serão salvas temporariamente no seu navegador usando LocalStorage e transferidas automaticamente ao conectar ao Supabase.
            </div>
          </div>
        )}

        {/* Database Schema Setup & SQL Code */}
        <div className="border border-slate-800 rounded-2xl overflow-hidden mt-1 bg-slate-950">
          <button
            type="button"
            onClick={() => setIsSqlExpanded(!isSqlExpanded)}
            className="w-full flex items-center justify-between p-3 text-left text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <span className="font-bold text-[10px] uppercase font-mono flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              Ver Script SQL do Banco (Supabase)
            </span>
            {isSqlExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>

          {isSqlExpanded && (
            <div className="p-3 border-t border-slate-850 space-y-3">
              <p className="text-slate-450 leading-relaxed text-[10px] font-sans">
                Execute o script abaixo no editor de SQL do Supabase (<span className="text-indigo-400 font-semibold">SQL Editor</span>) para criar a estrutura exata das tabelas:
              </p>
              
              <div className="relative">
                <pre className="p-2.5 bg-slate-900 rounded-xl text-[9px] text-slate-300 font-mono overflow-x-auto max-h-48 border border-slate-800 leading-normal">
{`-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar tabela de visitas técnicas
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    status TEXT NOT NULL,
    contact_phone TEXT,
    scale_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ativar Row Level Security (RLS) para segurança
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Registrar políticas públicas para operações da aplicação
CREATE POLICY "Acesso total aos clientes" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total às visitas" ON public.visits FOR ALL USING (true) WITH CHECK (true);`}
                </pre>
                
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(`-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar tabela de visitas técnicas
CREATE TABLE IF NOT EXISTS public.visits (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    address TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    status TEXT NOT NULL,
    contact_phone TEXT,
    scale_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ativar Row Level Security (RLS) para segurança
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Registrar políticas públicas para operações da aplicação
CREATE POLICY "Acesso total aos clientes" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total às visitas" ON public.visits FOR ALL USING (true) WITH CHECK (true);`);
                  }}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-indigo-650 rounded-lg text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                  title="Copiar Código SQL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup controls panel */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3.5 shadow-md">
        <h3 className="font-black text-xs text-white uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-850 pb-2">
          <span>Backup Físico (.json)</span>
        </h3>

        <p className="text-slate-400 text-[11px] font-sans">
          Exporte ou carregue cópias de seguranças offlines a qualquer momento para garantir a preservação redundante dos dados.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            id="export-backup-btn"
            onClick={triggerExport}
            className="flex items-center justify-center gap-1.5 p-3 bg-amber-500 hover:bg-amber-600 active:scale-98 font-black text-slate-950 rounded-xl shadow-sm text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-950 stroke-[3]" />
            Exportar (.json)
          </button>

          <button
            id="import-backup-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 p-3 bg-slate-800 border border-slate-700 hover:bg-slate-750 active:scale-98 font-bold text-slate-300 rounded-xl text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            Importar
          </button>
        </div>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleImportFileChange}
          className="hidden"
        />
      </div>

      {/* Reset options */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3.5 shadow-md">
        <h3 className="font-black text-xs text-white uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-850 pb-2">
          <span>Manutenção de Memória</span>
        </h3>

        <div className="space-y-2 font-mono">
          <button
            id="clear-all-data-btn"
            onClick={handleClearAllClick}
            className={`w-full flex items-center justify-between p-3 ${
              confirmClearAll 
                ? "bg-rose-600 text-white animate-pulse border border-rose-500 font-bold" 
                : "bg-rose-955/25 border border-rose-955 hover:bg-rose-955/40 text-rose-300"
            } rounded-xl transition-all cursor-pointer text-left`}
          >
            <div className="flex items-center gap-2 font-bold text-[11px]">
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{confirmClearAll ? "CLIQUE NOVAMENTE PARA APAGAR TUDO" : "Limpar Memória Local"}</span>
            </div>
            <span className="text-[9px] font-bold uppercase">{confirmClearAll ? "(CONFIRMAR)" : "(Zerar Tudo)"}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
