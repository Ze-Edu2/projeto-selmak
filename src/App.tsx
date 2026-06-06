/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Visit, VisitStatus, ServiceType, SavedClient, ScaleChecklist } from "./types";
import { getSeedVisits, formatDateString } from "./seedData";
import { StatsOverview } from "./components/StatsOverview";
import { CalendarGrid } from "./components/CalendarGrid";
import { VisitCard } from "./components/VisitCard";
import { VisitModal } from "./components/VisitModal";
import { ClientDirectory } from "./components/ClientDirectory";
import { BackupSettings } from "./components/BackupSettings";
import { isSupabaseConfigured } from "./supabaseClient";
import { 
  pushVisitToSupabase, 
  deleteVisitFromSupabase, 
  pushClientToSupabase, 
  deleteClientFromSupabase, 
  pullAllFromSupabase 
} from "./supabaseService";
import { 
  Calendar, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  SlidersHorizontal,
  Wrench,
  CheckCircle2,
  Trash2,
  Bell,
  Scale
} from "lucide-react";

export default function App() {
  // --- STATE DECLARATIONS ---
  const [visits, setVisits] = useState<Visit[]>([]);
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<"not_configured" | "connecting" | "connected" | "error">("not_configured");
  
  // Selected Date on Calendar (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateString(new Date()));
  
  // Mobile Tab control: "agenda" | "clients" | "settings"
  const [activeTab, setActiveTab] = useState<"agenda" | "clients" | "settings">("agenda");
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [serviceFilter, setServiceFilter] = useState<string>("todos");
  
  // Show/Hide filters bar on mobile
  const [showFilters, setShowFilters] = useState(false);

  // --- LOCAL PERSISTENCE STORAGE & SUPABASE SYNC ---
  useEffect(() => {
    // 1. Quick initial hydration from LocalStorage for instant visual response
    const storedVisits = localStorage.getItem("selmak_visits");
    const storedClients = localStorage.getItem("selmak_clients");
    
    let localVisits: Visit[] = storedVisits ? JSON.parse(storedVisits) : [];
    let localClients: SavedClient[] = storedClients ? JSON.parse(storedClients) : [];
    
    setVisits(localVisits);
    setSavedClients(localClients);

    // 2. Fetch fresh records from Supabase if configured, falling back to LocalStorage in offline mode
    if (isSupabaseConfigured) {
      setSupabaseStatus("connecting");
      pullAllFromSupabase().then((data) => {
        if (data) {
          const synchronized = synchronizeClientStats(data.visits, data.clients);
          setVisits(data.visits);
          setSavedClients(synchronized);
          saveToLocalStorage(data.visits, synchronized);
          setSupabaseStatus("connected");
        } else {
          setSupabaseStatus("error");
        }
      }).catch(() => {
        setSupabaseStatus("error");
      });
    } else {
      setSupabaseStatus("not_configured");
    }
  }, []);

  // Save changes to local storage whenever states alter
  const saveToLocalStorage = (updatedVisits: Visit[], updatedClients: SavedClient[]) => {
    localStorage.setItem("selmak_visits", JSON.stringify(updatedVisits));
    localStorage.setItem("selmak_clients", JSON.stringify(updatedClients));
  };

  // --- CLIENT DIRECTORY STATS SYNCHRONIZER ---
  // Recalculates stats whenever visits list modifies
  const synchronizeClientStats = (currentVisits: Visit[], currentClients: SavedClient[]) => {
    return currentClients.map(client => {
      const clientVisits = currentVisits.filter(v => v.clientName.toLowerCase() === client.name.toLowerCase());
      const completed = clientVisits.filter(v => v.status === VisitStatus.Completed);
      const sortedVisits = [...clientVisits].sort((a, b) => b.date.localeCompare(a.date));

      return {
        ...client,
        stats: {
          totalVisits: clientVisits.length,
          completedVisits: completed.length,
          lastVisitDate: sortedVisits[0]?.date || undefined
        }
      };
    });
  };

  // --- EVENT HANDLERS ---

  // Handle Add/Edit Visit Save Action
  const handleSaveVisit = (payload: Omit<Visit, "id" | "createdAt"> & { id?: string }) => {
    let updatedVisits: Visit[];
    let targetVisit: Visit;
    
    if (payload.id) {
      // --- EDITING ---
      updatedVisits = visits.map((v) => {
        if (v.id === payload.id) {
          const edited = { ...v, ...payload, date: payload.date || selectedDate } as Visit;
          targetVisit = edited;
          return edited;
        }
        return v;
      });
    } else {
      // --- NEW REGISTER ---
      const newVisit: Visit = {
        ...payload,
        id: `visit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
      } as Visit;
      targetVisit = newVisit;
      updatedVisits = [newVisit, ...visits];
    }

    // Auto-update Client Directory on target matches
    let updatedClients = [...savedClients];
    let targetClient: SavedClient | null = null;
    const clientExists = updatedClients.some(
      (c) => c.name.toLowerCase() === payload.clientName.toLowerCase()
    );

    if (!clientExists) {
      const newClient: SavedClient = {
        id: `client-${Date.now()}`,
        name: payload.clientName,
        address: payload.address,
        contactPhone: payload.contactPhone,
      };
      targetClient = newClient;
      updatedClients = [...updatedClients, newClient];
    } else {
      // If client exists, update address or phone if empty/changed
      updatedClients = updatedClients.map(c => {
        if (c.name.toLowerCase() === payload.clientName.toLowerCase()) {
          const updated = {
            ...c,
            address: payload.address, // update to latest visited address
            contactPhone: payload.contactPhone || c.contactPhone
          };
          targetClient = updated;
          return updated;
        }
        return c;
      });
    }

    const reCalculatedClients = synchronizeClientStats(updatedVisits, updatedClients);
    
    setVisits(updatedVisits);
    setSavedClients(reCalculatedClients);
    saveToLocalStorage(updatedVisits, reCalculatedClients);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured) {
      if (targetVisit!) {
        pushVisitToSupabase(targetVisit);
      }
      if (targetClient) {
        pushClientToSupabase(targetClient);
      }
    }
    
    // Switch view back to Agenda if was in another tab
    setActiveTab("agenda");
  };

  // Quick cycle Status transitions (Pending -> InProgress -> Completed)
  const handleStatusChange = (id: string, nextStatus: VisitStatus) => {
    let affectedVisit: Visit | undefined;
    const updatedVisits = visits.map((v) => {
      if (v.id === id) {
        const u = { ...v, status: nextStatus };
        affectedVisit = u;
        return u;
      }
      return v;
    });

    const reCalculatedClients = synchronizeClientStats(updatedVisits, savedClients);
    setVisits(updatedVisits);
    setSavedClients(reCalculatedClients);
    saveToLocalStorage(updatedVisits, reCalculatedClients);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured && affectedVisit) {
      pushVisitToSupabase(affectedVisit);
    }
  };

  // Delete Visit
  const handleDeleteVisit = (id: string) => {
    const updatedVisits = visits.filter((v) => v.id !== id);
    const reCalculatedClients = synchronizeClientStats(updatedVisits, savedClients);
    setVisits(updatedVisits);
    setSavedClients(reCalculatedClients);
    saveToLocalStorage(updatedVisits, reCalculatedClients);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured) {
      deleteVisitFromSupabase(id);
    }
  };

  // Update Scale checklist inside active card
  const handleUpdateScaleChecklist = (id: string, scaleInfo: ScaleChecklist) => {
    let affectedVisit: Visit | undefined;
    const updatedVisits = visits.map((v) => {
      if (v.id === id) {
        const u = { ...v, scaleInfo };
        affectedVisit = u;
        return u;
      }
      return v;
    });
    setVisits(updatedVisits);
    saveToLocalStorage(updatedVisits, savedClients); // scale changes don't alter client statistics

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured && affectedVisit) {
      pushVisitToSupabase(affectedVisit);
    }
  };

  // --- CLIENT DIRECTORY CRUD ---
  const handleAddClient = (name: string, address: string, phone?: string) => {
    const newClient: SavedClient = {
      id: `client-${Date.now()}`,
      name,
      address,
      contactPhone: phone,
      stats: { totalVisits: 0, completedVisits: 0 }
    };
    const updated = [...savedClients, newClient];
    setSavedClients(updated);
    saveToLocalStorage(visits, updated);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured) {
      pushClientToSupabase(newClient);
    }
  };

  const handleEditClient = (id: string, name: string, address: string, phone?: string) => {
    let affectedClient: SavedClient | undefined;
    const updatedClients = savedClients.map((c) => {
      if (c.id === id) {
        const u = { ...c, name, address, contactPhone: phone };
        affectedClient = u;
        return u;
      }
      return c;
    });
    setSavedClients(updatedClients);
    saveToLocalStorage(visits, updatedClients);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured && affectedClient) {
      pushClientToSupabase(affectedClient);
    }
  };

  const handleDeleteClient = (id: string) => {
    const updated = savedClients.filter((c) => c.id !== id);
    setSavedClients(updated);
    saveToLocalStorage(visits, updated);

    // BACKGROUND SYNC MUTATION TO SUPABASE
    if (isSupabaseConfigured) {
      deleteClientFromSupabase(id);
    }
  };

  const handleSelectClientForVisit = (client: SavedClient) => {
    setVisitToEdit(null); // setup for creation
    setIsModalOpen(true);
    // Setting up temporary autofill values
    // We can directly pre-fill client states in VisitModal!
    // Since client suggestion takes clientName, we can hydrate clientName and address on open.
    // In our modal, when visitToEdit is Null, it resets, but we'll feed it as a transient visit template!
    const mockVisit: Visit = {
      id: "",
      clientName: client.name,
      address: client.address,
      contactPhone: client.contactPhone,
      serviceType: ServiceType.Calibration,
      description: "",
      date: selectedDate,
      status: VisitStatus.Pending,
      createdAt: ""
    };
    setVisitToEdit(mockVisit);
  };

  // --- DATABASE UTILS (BACKUP TAB) ---
  const handleImportData = (importedVisits: Visit[], importedClients: SavedClient[]) => {
    let finalClients = importedClients;
    if (importedClients.length === 0 && importedVisits.length > 0) {
      // Reconstitute client list if empty on files
      const clients: SavedClient[] = [];
      importedVisits.forEach((v) => {
        if (!clients.some(c => c.name.toLowerCase() === v.clientName.toLowerCase())) {
          clients.push({
            id: `client-${v.id}-${Math.floor(Math.random() * 1000)}`,
            name: v.clientName,
            address: v.address,
            contactPhone: v.contactPhone,
          });
        }
      });
      finalClients = clients;
    }

    const reCalculatedClients = synchronizeClientStats(importedVisits, finalClients);
    setVisits(importedVisits);
    setSavedClients(reCalculatedClients);
    saveToLocalStorage(importedVisits, reCalculatedClients);
  };

  const handleResetToSeeds = () => {
    const seeds = getSeedVisits();
    const clients: SavedClient[] = [];
    seeds.forEach((v) => {
      if (!clients.some(c => c.name.toLowerCase() === v.clientName.toLowerCase())) {
        clients.push({
          id: `client-${v.id}-${Math.floor(Math.random() * 1000)}`,
          name: v.clientName,
          address: v.address,
          contactPhone: v.contactPhone,
        });
      }
    });

    const reCalculatedClients = synchronizeClientStats(seeds, clients);
    setVisits(seeds);
    setSavedClients(reCalculatedClients);
    saveToLocalStorage(seeds, reCalculatedClients);
  };

  const handleClearAll = () => {
    setVisits([]);
    setSavedClients([]);
    localStorage.removeItem("selmak_visits");
    localStorage.removeItem("selmak_clients");
  };

  // Filter schedules shown on Selected Day List or general query search
  const getFilteredSchedulesForSelectedDate = () => {
    // 1. Filter by date FIRST
    let res = visits.filter((v) => v.date === selectedDate);

    // 2. Filter by search input (either client name, address, or description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (v) =>
          v.clientName.toLowerCase().includes(q) ||
          v.address.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
      );
    }

    // 3. Filter by status selection
    if (statusFilter !== "todos") {
      res = res.filter((v) => v.status === statusFilter);
    }

    // 4. Filter by service type selection
    if (serviceFilter !== "todos") {
      res = res.filter((v) => v.serviceType === serviceFilter);
    }

    // Sort by scheduled time, placing empty times at the bottom
    return [...res].sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  };

  const dayFilteredVisits = getFilteredSchedulesForSelectedDate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-slate-850 pb-32">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md text-white px-5 py-4 flex items-center justify-between border-b border-slate-850">
        <div className="flex items-center gap-2">
          {/* Custom scale-icon container */}
          <div className="bg-amber-500 p-1.5 rounded-xl flex items-center justify-center shadow-inner">
            <Scale className="w-4.5 h-4.5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xs font-black font-mono tracking-wider leading-3 text-white uppercase">
              Selmak Balanças
            </h1>
            <p className="text-[9px] text-amber-500 font-bold font-mono tracking-widest mt-0.5">
              PAINEL OPERACIONAL
            </p>
          </div>
        </div>

        {/* Technical Calibration status notifications alert placeholder */}
        <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
          {supabaseStatus === "connected" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-bold">Supabase</span>
            </>
          )}
          {supabaseStatus === "connecting" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-spin" />
              <span className="text-yellow-450 font-medium">Buscando...</span>
            </>
          )}
          {supabaseStatus === "error" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-rose-450 font-bold">Erro BD</span>
            </>
          )}
          {supabaseStatus === "not_configured" && (
            <>
              <Bell className="w-3 h-3 text-amber-500 animate-bounce" />
              <span>Modo Local</span>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4">
        
        {/* TAB 1: AGENDA (MAIN TAPPED CONTENT) */}
        {activeTab === "agenda" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. Dynamic Weight Stats Indicator */}
            <StatsOverview visits={visits} selectedDate={selectedDate} />

            {/* 2. Compact Month Grid Calendar */}
            <CalendarGrid 
              visits={visits} 
              selectedDate={selectedDate} 
              onSelectDate={setSelectedDate} 
            />

            {/* 3. Schedules Filter Bar & Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-schedules-input"
                    type="text"
                    placeholder="Filtrar nesta data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors font-mono"
                  />
                </div>

                <button
                  id="filters-toggle-button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-2xl border active:scale-95 flex items-center justify-center gap-1 shrink-0 transition-all cursor-pointer ${
                    showFilters 
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 font-bold" 
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Collapsed Filter Dropdowns details */}
              {showFilters && (
                <div className="bg-slate-900 p-4 rounded-2xl space-y-3 border border-slate-800 animate-in slide-in-from-top-1 duration-150 font-mono shadow-md text-xs">
                  <div className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                    Filtros de Visita Avançados:
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Status</label>
                      <select
                        id="filter-status-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                      >
                        <option value="todos">Todos Status</option>
                        {Object.values(VisitStatus).map((st, i) => (
                          <option key={i} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-500 mb-1">Serviço</label>
                      <select
                        id="filter-service-select"
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="w-full p-2.5 bg-slate-955 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-amber-500 truncate cursor-pointer"
                      >
                        <option value="todos">Todos Serviços</option>
                        {Object.values(ServiceType).map((sv, i) => (
                          <option key={i} value={sv}>{sv}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      id="reset-filters-btn"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("todos");
                        setServiceFilter("todos");
                      }}
                      className="text-[10px] font-black text-amber-500 hover:underline cursor-pointer uppercase tracking-wider"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Filtered Daily Schedule Visits List */}
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono tracking-wider uppercase font-black px-1.5">
                <span>AGENDAS FILTRADAS ({dayFilteredVisits.length})</span>
                <span>Foco do Calendário</span>
              </div>

              {dayFilteredVisits.length === 0 ? (
                <div className="text-center py-12 px-5 bg-slate-900/40 rounded-3xl border border-dashed border-slate-850">
                  <Wrench className="w-8 h-8 text-slate-700 mx-auto mb-2.5 animate-pulse" />
                  <p className="text-xs text-slate-300 font-bold">Nenhuma visita nesta listagem.</p>
                  <p className="text-[10px] text-slate-550 mt-1 max-w-sm mx-auto leading-normal font-sans">
                    Adicione uma visita para {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR")} tocando no botão circular de agendamento abaixo.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayFilteredVisits.map((visit) => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      onStatusChange={handleStatusChange}
                      onEdit={(v) => {
                        setVisitToEdit(v);
                        setIsModalOpen(true);
                      }}
                      onDelete={handleDeleteVisit}
                      onUpdateScaleChecklist={handleUpdateScaleChecklist}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLIENT DIRECTORY TAB */}
        {activeTab === "clients" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex items-center gap-3 shadow-md relative overflow-hidden">
              <Users className="w-8 h-8 text-amber-500 shrink-0" />
              <div>
                <h3 className="font-black font-mono text-xs text-amber-500 uppercase tracking-widest">Diretório de Clientes</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Lista rápida para ver endereços, registros consolidados coletados e iniciar agendamentos periódicos.
                </p>
              </div>
            </div>

            <ClientDirectory
              savedClients={savedClients}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onSelectClientForVisit={handleSelectClientForVisit}
            />
          </div>
        )}

        {/* TAB 3: BACKUP / SELMAK SYSTEM SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-4 animate-in fade-in duration-155">
            <BackupSettings
              visits={visits}
              savedClients={savedClients}
              onImportData={handleImportData}
              onResetToSeeds={handleResetToSeeds}
              onClearAll={handleClearAll}
            />
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) (Always visible inside app context except if modals are active) */}
      {activeTab === "agenda" && (
        <button
          id="floater-schedule-fab"
          onClick={() => {
            setVisitToEdit(null); // setup for creation
            setIsModalOpen(true);
          }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-500 border border-amber-600 hover:bg-amber-600 active:scale-95 transition-all w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 active:shadow-none z-20 cursor-pointer"
          title="Novo Agendamento"
        >
          <Plus className="w-8 h-8 text-slate-950 stroke-[3]" />
        </button>
      )}

      {/* Persistent Bottom Mobile Navigation Rail */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/90 backdrop-blur-md border-t border-slate-850 p-2 pb-5 pt-3.5 flex items-center justify-around z-30 shadow-2xl">
        {/* Agenda Tab Trigger */}
        <button
          id="nav-tab-agenda"
          onClick={() => setActiveTab("agenda")}
          className={`flex flex-col items-center justify-center p-1.5 focus:outline-hidden min-h-[44px] flex-1 cursor-pointer transition-colors ${
            activeTab === "agenda" ? "text-amber-500 font-bold" : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] mt-1 font-black uppercase tracking-wider font-mono">Agenda</span>
        </button>

        {/* Client Directory Tab Trigger */}
        <button
          id="nav-tab-clients"
          onClick={() => setActiveTab("clients")}
          className={`flex flex-col items-center justify-center p-1.5 focus:outline-hidden min-h-[44px] flex-1 cursor-pointer transition-colors ${
            activeTab === "clients" ? "text-amber-500 font-bold" : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] mt-1 font-black uppercase tracking-wider font-mono">Clientes</span>
        </button>

        {/* Backup / Company Settings Tab Trigger */}
        <button
          id="nav-tab-settings"
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center p-1.5 focus:outline-hidden min-h-[44px] flex-1 cursor-pointer transition-colors ${
            activeTab === "settings" ? "text-amber-500 font-bold" : "text-slate-500 hover:text-slate-350"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] mt-1 font-black uppercase tracking-wider font-mono">Selmak</span>
        </button>
      </nav>

      {/* Central scheduling Sheet Form modal */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setVisitToEdit(null);
        }}
        onSave={handleSaveVisit}
        visitToEdit={visitToEdit}
        selectedDate={selectedDate}
        savedClients={savedClients}
      />

    </div>
  );
}
