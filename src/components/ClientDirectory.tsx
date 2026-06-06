/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SavedClient } from "../types";
import { Search, MapPin, Phone, CalendarRange, Plus, Edit2, Check, X, Scale, Trash2 } from "lucide-react";

interface ClientDirectoryProps {
  savedClients: SavedClient[];
  onAddClient: (name: string, address: string, phone?: string) => void;
  onEditClient: (id: string, name: string, address: string, phone?: string) => void;
  onDeleteClient: (id: string) => void;
  onSelectClientForVisit: (client: SavedClient) => void;
}

export const ClientDirectory: React.FC<ClientDirectoryProps> = ({
  savedClients,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onSelectClientForVisit,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Create / Edit Form states inside Directory
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormPhone(formatPhone(e.target.value));
  };

  const filtered = savedClients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditTrigger = (client: SavedClient) => {
    setEditingId(client.id);
    setFormName(client.name);
    setFormAddress(client.address);
    setFormPhone(client.contactPhone ? formatPhone(client.contactPhone) : "");
    setIsAdding(false);
    setError("");
  };

  const handleAddTrigger = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormName("");
    setFormAddress("");
    setFormPhone("");
    setError("");
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setError("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanName = formName.trim();
    const cleanAddress = formAddress.trim();
    const cleanPhone = formPhone.trim();

    if (!cleanName) {
      setError("O nome do estabelecimento é obrigatório.");
      return;
    }

    // Address verification: check if address looks like a real address with letters & street detail
    const streetLabelRegex = /[a-zA-Z]{2,}/;
    if (!cleanAddress) {
      setError("O endereço é um campo obrigatório.");
      return;
    }
    if (cleanAddress.length < 8) {
      setError("O endereço deve conter a rua e o número (mínimo de 8 caracteres).");
      return;
    }
    if (!streetLabelRegex.test(cleanAddress)) {
      setError("Por favor, especifique um endereço de estabelecimento válido.");
      return;
    }

    // Phone qualification
    if (cleanPhone) {
      const numeric = cleanPhone.replace(/\D/g, "");
      if (numeric.length < 10 || numeric.length > 11) {
        setError("O telefone de contato deve ser um telefone real com DDD (ex: (67) 99999-1234).");
        return;
      }
    }

    if (editingId) {
      onEditClient(editingId, cleanName, cleanAddress, cleanPhone || undefined);
      setEditingId(null);
    } else {
      // Check for duplicates
      if (savedClients.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
        setError("Já existe um cliente cadastrado com esse nome.");
        return;
      }
      onAddClient(cleanName, cleanAddress, cleanPhone || undefined);
      setIsAdding(false);
    }

    setFormName("");
    setFormAddress("");
    setFormPhone("");
    setError("");
  };

  return (
    <div id="clients-container" className="space-y-4">
      {/* Search Header and Action Add */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="client-search"
            type="text"
            placeholder="Pesquisar cliente ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Quick Add Client Button */}
        {!isAdding && !editingId && (
          <button
            id="add-client-trigger"
            onClick={handleAddTrigger}
            className="p-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-1 active:scale-98 shrink-0 tracking-wide font-mono transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
            Novo
          </button>
        )}
      </div>

      {/* Quick Add / Edit Form Panel */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 space-y-3.5 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs">
            <span className="font-black font-mono tracking-widest text-amber-500 uppercase">
              {editingId ? "Editar Cliente" : "Adicionar Cliente"}
            </span>
            <button type="button" onClick={cancelForm} className="p-1.5 hover:bg-slate-850 rounded-xl">
              <X className="w-4 h-4 text-slate-455" />
            </button>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                Nome do Estabelecimento *
              </label>
              <input
                id="form-client-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Panificadora Central"
                className="w-full bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                Endereço Padrão *
              </label>
              <input
                id="form-client-address"
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Ex: Av. Afonso Pena, 1100"
                className="w-full bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                Telefone de Contato (Opcional)
              </label>
              <input
                id="form-client-phone"
                type="text"
                value={formPhone}
                onChange={handlePhoneInputChange}
                placeholder="Ex: (67) 98888-2222"
                className="w-full bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {error && <p className="text-[10px] text-rose-455 font-mono font-bold uppercase tracking-wider">{error}</p>}

          <div className="flex justify-end gap-1.5 pt-1.5">
            <button
              id="form-client-cancel"
              type="button"
              onClick={cancelForm}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-[11px] font-bold uppercase font-mono tracking-wide"
            >
              Cancelar
            </button>
            <button
              id="form-client-submit"
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[11px] font-black flex items-center gap-1 uppercase font-mono tracking-wide"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Salvar
            </button>
          </div>
        </form>
      )}

      {/* Directory List Result */}
      <div className="space-y-3 pt-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-slate-900 rounded-3xl border border-dashed border-slate-800/80">
            <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">Nenhum cliente cadastrado.</p>
            <p className="text-[10px] text-slate-500 mt-1">Cadastre um novo clicando em &quot;Novo&quot; acima.</p>
          </div>
        ) : (
          filtered.map((client) => {
            const total = client.stats?.totalVisits || 0;
            const completed = client.stats?.completedVisits || 0;
            
            return (
              <div
                key={client.id}
                id={`directory-client-${client.id}`}
                className="bg-slate-900 rounded-3xl p-4.5 shadow-md border border-slate-800 flex flex-col gap-3 transition-transform duration-100 active:scale-[0.99]"
              >
                {/* Client detail header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-sm font-black font-display text-white leading-tight">
                      {client.name}
                    </h4>
                    {client.contactPhone && (
                      <a
                        href={`tel:${client.contactPhone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:underline mt-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {client.contactPhone}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmDeleteId === client.id ? (
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 animate-in zoom-in-95 duration-100 font-mono">
                        <button
                          id={`confirm-delete-${client.id}`}
                          type="button"
                          onClick={() => {
                            onDeleteClient(client.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          Apagar?
                        </button>
                        <button
                          id={`cancel-delete-${client.id}`}
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-colors"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          id={`delete-client-${client.id}`}
                          onClick={() => setConfirmDeleteId(client.id)}
                          title="Excluir cadastro de cliente"
                          className="p-1.5 hover:bg-slate-800 text-rose-550 hover:text-rose-400 rounded-xl border border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          id={`edit-client-${client.id}`}
                          onClick={() => handleEditTrigger(client)}
                          title="Editar dados cadastrais"
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          id={`action-client-create-${client.id}`}
                          onClick={() => onSelectClientForVisit(client)}
                          className="p-1.5 px-3 bg-amber-500 text-slate-950 rounded-xl font-black text-[10px] flex items-center gap-1 active:scale-95 hover:bg-amber-600 shadow-sm font-mono uppercase tracking-wider transition-colors"
                        >
                          <CalendarRange className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                          Agendar
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Address block */}
                <div className="flex items-start gap-1 pb-1 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="truncate leading-normal pr-1">{client.address}</span>
                </div>

                {/* Calibration Metrics Indicator */}
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-850/80 flex items-center justify-between text-[10px] text-slate-450 font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-slate-450">
                    <Scale className="w-3.5 h-3.5 text-amber-500" />
                    Histórico de Visitas:
                  </div>
                  <div className="font-bold text-slate-200">
                    <span className="text-amber-500 font-extrabold">{completed}</span> de {total} concluídas
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
