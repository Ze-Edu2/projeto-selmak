/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Visit, ServiceType, VisitStatus, ScaleChecklist, SavedClient } from "../types";
import { X, Calendar, Clock, MapPin, Scale, User, Phone, Clipboard, Plus, Check } from "lucide-react";

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: Omit<Visit, "id" | "createdAt"> & { id?: string }) => void;
  visitToEdit?: Visit | null;
  selectedDate: string; // YYYY-MM-DD
  savedClients: SavedClient[];
}

export const VisitModal: React.FC<VisitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  visitToEdit,
  selectedDate,
  savedClients,
}) => {
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.Calibration);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("");
  const [status, setStatus] = useState<VisitStatus>(VisitStatus.Pending);

  // Autofill Clients list states
  const [filteredClients, setFilteredClients] = useState<SavedClient[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Scale Specifics
  const [includeScaleDetails, setIncludeScaleDetails] = useState(false);
  const [scaleBrandModel, setScaleBrandModel] = useState("");
  const [scaleCapacity, setScaleCapacity] = useState("");
  const [scaleResolution, setScaleResolution] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state if editing or selectedDate changes
  useEffect(() => {
    if (visitToEdit) {
      setClientName(visitToEdit.clientName);
      setAddress(visitToEdit.address);
      setContactPhone(visitToEdit.contactPhone || "");
      setServiceType(visitToEdit.serviceType);
      setDescription(visitToEdit.description);
      setDate(visitToEdit.date);
      setTime(visitToEdit.time || "");
      setStatus(visitToEdit.status);
      
      if (visitToEdit.scaleInfo) {
        setIncludeScaleDetails(true);
        setScaleBrandModel(visitToEdit.scaleInfo.brandModel || "");
        setScaleCapacity(visitToEdit.scaleInfo.capacity || "");
        setScaleResolution(visitToEdit.scaleInfo.resolution || "");
      } else {
        setIncludeScaleDetails(false);
        setScaleBrandModel("");
        setScaleCapacity("");
        setScaleResolution("");
      }
    } else {
      // Clear forms for new Entry
      setClientName("");
      setAddress("");
      setContactPhone("");
      setServiceType(ServiceType.Calibration);
      setDescription("");
      setDate(selectedDate); // Default to current selected day in calendar!
      setTime("");
      setStatus(VisitStatus.Pending);
      setIncludeScaleDetails(false);
      setScaleBrandModel("");
      setScaleCapacity("");
      setScaleResolution("");
    }
    setErrors({});
  }, [visitToEdit, selectedDate, isOpen]);

  // Client suggestions autocomplete logic
  useEffect(() => {
    if (!clientName.trim() || !savedClients.length) {
      setFilteredClients([]);
      return;
    }
    const filtered = savedClients.filter(c => 
      c.name.toLowerCase().includes(clientName.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [clientName, savedClients]);

  if (!isOpen) return null;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContactPhone(formatPhone(e.target.value));
  };

  const selectClientSuggestion = (client: SavedClient) => {
    setClientName(client.name);
    setAddress(client.address);
    if (client.contactPhone) {
      setContactPhone(formatPhone(client.contactPhone));
    }
    setShowClientSuggestions(false);
  };

  const handleValidation = () => {
    const tempErrors: Record<string, string> = {};
    
    // Client Name must not be empty
    if (!clientName.trim()) {
      tempErrors.clientName = "Nome do cliente é obrigatório.";
    } else if (clientName.trim().length < 3) {
      tempErrors.clientName = "O nome do cliente deve ter ao menos 3 caracteres.";
    }

    // Address verification: check if address looks like a real address with letters & street detail
    const cleanAddress = address.trim();
    const streetLabelRegex = /[a-zA-Z]{2,}/;
    if (!cleanAddress) {
      tempErrors.address = "Endereço da visita é obrigatório.";
    } else if (cleanAddress.length < 8) {
      tempErrors.address = "O endereço deve conter a rua e o número (mínimo de 8 caracteres).";
    } else if (!streetLabelRegex.test(cleanAddress)) {
      tempErrors.address = "Por favor, especifique um endereço de estabelecimento válido contendo letras.";
    }

    // Optional phone validation: if defined, must be formatted properly with 10 or 11 digits
    if (contactPhone.trim()) {
      const numeric = contactPhone.replace(/\D/g, "");
      if (numeric.length < 10 || numeric.length > 11) {
        tempErrors.contactPhone = "O telefone de contato deve conter um DDD e número válidos (ex: (67) 99999-1234).";
      }
    }

    if (!date) tempErrors.date = "Por favor, indique a data.";
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    let scaleInfo: ScaleChecklist | undefined = undefined;
    if (includeScaleDetails) {
      scaleInfo = {
        brandModel: scaleBrandModel || undefined,
        capacity: scaleCapacity || undefined,
        resolution: scaleResolution || undefined,
        // Carry forward previous or default to unchecked tests
        testsCompleted: visitToEdit?.scaleInfo?.testsCompleted || {
          zeroTest: false,
          loadTest: false,
          eccentricityTest: false
        }
      };
    }

    onSave({
      id: visitToEdit?.id, // Keeps previous id if editing
      clientName: clientName.trim(),
      address: address.trim(),
      contactPhone: contactPhone.trim() || undefined,
      serviceType,
      description: description.trim(),
      date,
      time: time || undefined,
      status,
      scaleInfo,
    });

    onClose();
  };

  return (
    <div id="modal-overlay" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Modal Canvas */}
      <div 
        id="modal-card"
        className="bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl border-t border-x sm:border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-950 text-white shrink-0 border-b border-slate-850">
          <div>
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 font-bold">
              {visitToEdit ? "Edição de Registro" : "Novo Cadastro de Visita"}
            </span>
            <h3 className="text-base font-black font-display text-white tracking-tight leading-tight mt-0.5">
              {visitToEdit ? "Atualizar Dados da Visita" : "Agendar Visita Selmak"}
            </h3>
          </div>
          <button
            id="close-modal-button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Client Name Input with custom suggestions dropdown */}
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-500" />
              Nome do Cliente *
            </label>
            <input
              id="input-client-name"
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setShowClientSuggestions(true);
              }}
              onFocus={() => setShowClientSuggestions(true)}
              placeholder="Ex: Supermercado Alvorada Ltda"
              className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {errors.clientName && (
              <span className="text-[10px] text-rose-455 font-bold font-mono mt-0.5 block">{errors.clientName}</span>
            )}

            {/* Client Suggestions List */}
            {showClientSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-h-44 overflow-y-auto">
                <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                  Clientes Recorrentes Sugeridos:
                </div>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => selectClientSuggestion(client)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-900 border-b border-slate-900/60 flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-white font-mono">{client.name}</span>
                    <span className="text-slate-450 text-[10px] truncate">{client.address}</span>
                  </button>
                ))}
              </div>
            )}
            
            {showClientSuggestions && clientName.trim() && (
              <div 
                className="fixed inset-0 z-20"
                onClick={() => setShowClientSuggestions(false)}
              />
            )}
          </div>

          {/* Visit Address */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              Endereço Completo *
            </label>
            <input
              id="input-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, Número - Bairro, Cidade - Estado"
              className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {errors.address && (
              <span className="text-[10px] text-rose-455 font-bold font-mono mt-0.5 block">{errors.address}</span>
            )}
          </div>

          {/* Phone Contact */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              Telefone de Contato (Opcional)
            </label>
            <input
              id="input-phone"
              type="text"
              value={contactPhone}
              onChange={handlePhoneInputChange}
              placeholder="Ex: (67) 99999-1234"
              className="w-full text-sm px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            {errors.contactPhone && (
              <span className="text-[10px] text-rose-455 font-bold font-mono mt-0.5 block">{errors.contactPhone}</span>
            )}
          </div>

          {/* Grid for Date, Time and Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Data da Visita *
              </label>
              <input
                id="input-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
              {errors.date && (
                <span className="text-[10px] text-rose-455 font-bold font-mono mt-0.5 block">{errors.date}</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Horário Estimado
              </label>
              <input
                id="input-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-sm px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Service Type and Initial Status Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5">
                Tipo do Serviço
              </label>
              <select
                id="input-service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as ServiceType)}
                className="w-full text-sm px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-250 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {Object.values(ServiceType).map((val, key) => (
                  <option key={key} value={val} className="bg-slate-950 text-white">
                    {val}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5">
                Status Inicial
              </label>
              <select
                id="input-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VisitStatus)}
                className="w-full text-sm px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-250 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {Object.values(VisitStatus).map((val, key) => (
                  <option key={key} value={val} className="bg-slate-950 text-white">
                    {val}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Details Box */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-455 tracking-widest font-mono mb-1.5 flex items-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5 text-amber-500" />
              O que vai fazer lá (Descrição / Detalhes)
            </label>
            <textarea
              id="input-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Verificar oscilação de peso, testes de cantos, limpar pés antivibração, selagem INMETRO."
              className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-600 focus:outline-hidden focus:ring-1 focus:ring-amber-500 resize-none font-mono"
            />
          </div>

          {/* Checkbox to trigger custom Scale specs */}
          <div className="pt-2">
            <label id="checkbox-scale-toggle" className="flex items-center gap-2.5 py-1.5 cursor-pointer selection:bg-none select-none">
              <input
                type="checkbox"
                checked={includeScaleDetails}
                onChange={(e) => setIncludeScaleDetails(e.target.checked)}
                className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-800 rounded-md focus:ring-amber-500 accent-amber-500"
              />
              <span className="text-[10px] font-black text-slate-350 hover:text-white uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Scale className="w-4 h-4 text-amber-500 font-bold" /> Detalhar Equipamento (Balança)
              </span>
            </label>

            {/* Scale Technical Inputs block */}
            {includeScaleDetails && (
              <div className="mt-2.5 p-4 bg-slate-950 border border-slate-850 rounded-2xl space-y-3 animate-in slide-in-from-top-1 duration-150">
                <div className="text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest mb-1.5">
                  Especificações do Instrumento
                </div>
                
                <div>
                  <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wide font-mono mb-1">
                    Marca / Modelo do Equipamento
                  </label>
                  <input
                    id="input-scale-model"
                    type="text"
                    value={scaleBrandModel}
                    onChange={(e) => setScaleBrandModel(e.target.value)}
                    placeholder="Ex: Toledo Prix 3 Fit / Urano Pop"
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wide font-mono mb-1">
                      Capacidade Máxima
                    </label>
                    <input
                      id="input-scale-capacity"
                      type="text"
                      value={scaleCapacity}
                      onChange={(e) => setScaleCapacity(e.target.value)}
                      placeholder="Ex: 15 kg ou 300 kg"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wide font-mono mb-1">
                      Resolução (e)
                    </label>
                    <input
                      id="input-scale-res"
                      type="text"
                      value={scaleResolution}
                      onChange={(e) => setScaleResolution(e.target.value)}
                      placeholder="Ex: 2 g, 5 g, 100 g"
                      className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </form>

        {/* Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-850 flex items-center justify-end gap-2.5 shrink-0">
          <button
            id="cancel-modal-button"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-300 bg-slate-800 rounded-xl hover:bg-slate-750 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            id="save-modal-button"
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-950 bg-amber-500 rounded-xl hover:bg-amber-600 active:scale-98 flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
            {visitToEdit ? "Confirmar Edição" : "Criar Agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
};
