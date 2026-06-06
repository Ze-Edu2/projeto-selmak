/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Visit, VisitStatus, ServiceType, ScaleChecklist } from "../types";
import { 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  Play, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Wrench, 
  Scale, 
  Compass, 
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot
} from "lucide-react";

interface VisitCardProps {
  visit: Visit;
  onStatusChange: (id: string, nextStatus: VisitStatus) => void;
  onEdit: (visit: Visit) => void;
  onDelete: (id: string) => void;
  onUpdateScaleChecklist?: (id: string, scaleInfo: ScaleChecklist) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onStatusChange,
  onEdit,
  onDelete,
  onUpdateScaleChecklist,
}) => {
  const [showChecklist, setShowChecklist] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteTimeoutId, setDeleteTimeoutId] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
      }
    };
  }, [deleteTimeoutId]);

  const handleDeleteClick = () => {
    if (showConfirmDelete) {
      onDelete(visit.id);
      setShowConfirmDelete(false);
      if (deleteTimeoutId) {
        clearTimeout(deleteTimeoutId);
        setDeleteTimeoutId(null);
      }
    } else {
      setShowConfirmDelete(true);
      const timeout = setTimeout(() => {
        setShowConfirmDelete(false);
      }, 4000); // Reset after 4s
      setDeleteTimeoutId(timeout);
    }
  };

  // Style helper based on service types
  const getServiceTypeStyles = (type: ServiceType) => {
    switch (type) {
      case ServiceType.Calibration:
        return {
          bg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          iconColor: "text-amber-500",
          accentColor: "border-l-4 border-amber-500",
        };
      case ServiceType.PreventiveMaintenance:
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          iconColor: "text-emerald-400",
          accentColor: "border-l-4 border-emerald-500",
        };
      case ServiceType.CorrectiveMaintenance:
        return {
          bg: "bg-rose-500/10 text-rose-455 border-rose-500/20",
          iconColor: "text-rose-400",
          accentColor: "border-l-4 border-rose-500",
        };
      case ServiceType.DeliveryInstallation:
        return {
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          iconColor: "text-indigo-400",
          accentColor: "border-l-4 border-indigo-500",
        };
      case ServiceType.CommercialVisit:
        return {
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          iconColor: "text-purple-400",
          accentColor: "border-l-4 border-purple-500",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          iconColor: "text-slate-400",
          accentColor: "border-l-4 border-slate-700",
        };
    }
  };

  // Status badges
  const getStatusBadge = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.Completed:
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/25 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-405" /> Concluído
          </span>
        );
      case VisitStatus.InProgress:
        return (
          <span className="inline-flex items-center gap-1 bg-sky-500/15 text-sky-450 text-[11px] font-bold px-2.5 py-1 rounded-full border border-sky-400/30 animate-pulse font-mono">
            <CircleDot className="w-3.5 h-3.5 text-sky-400" /> Atendendo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-500 text-[11px] font-bold px-2.5 py-1 rounded-full border border-amber-500/25 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Pendente
          </span>
        );
    }
  };

  const serviceStyle = getServiceTypeStyles(visit.serviceType);

  // Status transitions: Pending -> InProgress -> Completed -> Pending
  const cycleStatus = () => {
    let next: VisitStatus;
    if (visit.status === VisitStatus.Pending) next = VisitStatus.InProgress;
    else if (visit.status === VisitStatus.InProgress) next = VisitStatus.Completed;
    else next = VisitStatus.Pending;
    onStatusChange(visit.id, next);
  };

  // Trigger Waze navigation
  const openCoordinates = () => {
    const url = `https://waze.com/ul?q=${encodeURIComponent(visit.address)}&navigate=yes`;
    window.open(url, "_blank");
  };

  // Toggle checklist checkboxes
  const handleChecklistToggle = (testName: "zeroTest" | "loadTest" | "eccentricityTest") => {
    if (!onUpdateScaleChecklist || !visit.scaleInfo) return;
    
    const scale = visit.scaleInfo;
    const prevTests = scale.testsCompleted || { zeroTest: false, loadTest: false, eccentricityTest: false };
    
    const updatedChecklist: ScaleChecklist = {
      ...scale,
      testsCompleted: {
        ...prevTests,
        [testName]: !prevTests[testName]
      }
    };
    onUpdateScaleChecklist(visit.id, updatedChecklist);
  };

  const hasScaleInfo = visit.scaleInfo && (visit.scaleInfo.brandModel || visit.scaleInfo.capacity);

  return (
    <div 
      className={`bg-slate-900 rounded-3xl shadow-md border border-slate-800 ${serviceStyle.accentColor} transition-all duration-200 overflow-hidden relative`}
      id={`visit-card-${visit.id}`}
    >
      {/* Top Banner Status */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-850/80 bg-slate-950/30">
        <div className="flex items-center gap-2">
          {visit.time && (
            <div className="flex items-center gap-1 bg-slate-950 text-slate-300 font-mono text-xs font-bold px-2 py-1.5 rounded-xl text-[11px] border border-slate-800 shadow-sm">
              <Clock className="w-3 h-3 text-amber-500" />
              {visit.time}
            </div>
          )}
          <span className={`text-[10px] font-black px-2 py-1 rounded-xl border uppercase tracking-wide font-mono ${serviceStyle.bg}`}>
            {visit.serviceType}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button
            id={`status-toggle-${visit.id}`}
            onClick={cycleStatus}
            title="Alterar Status"
            className="p-1 text-slate-400 hover:text-slate-100"
          >
            {getStatusBadge(visit.status)}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5">
        {/* Client Title and Phone Dialer */}
        <div className="flex justify-between items-start gap-3">
          <h4 className="text-base font-black font-display text-white leading-tight">
            {visit.clientName}
          </h4>
          {visit.contactPhone && (
            <a
              id={`phone-dial-${visit.id}`}
              href={`tel:${visit.contactPhone.replace(/\D/g, "")}`}
              className="p-1 px-2.5 flex items-center justify-center text-xs gap-1 font-bold tracking-tight text-emerald-400 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/20 shrink-0 font-mono"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Ligar
            </a>
          )}
        </div>

        {/* Address & Navigation */}
        <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-300">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 pr-2">
            <p className="line-clamp-2 leading-relaxed text-slate-300">{visit.address}</p>
          </div>
          <button
            id={`map-nav-${visit.id}`}
            onClick={openCoordinates}
            className="p-1 px-2.5 flex items-center justify-center text-xs gap-1 font-bold tracking-tight text-amber-400 bg-amber-500/10 rounded-xl hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/20 shrink-0 font-mono"
          >
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            Rota
          </button>
        </div>

        {/* Description / Task scope */}
        <div className="mt-3 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-850">
          <p className="text-slate-400 leading-relaxed font-mono whitespace-pre-line text-[11px]">
            {visit.description || "Sem observações cadastradas."}
          </p>
        </div>

        {/* Scale Technical Checklist (Bespoke for Selmak) */}
        {hasScaleInfo && (
          <div className="mt-3 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="w-full flex items-center justify-between p-3 bg-slate-950 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Balança: {visit.scaleInfo?.brandModel}
                </span>
              </div>
              {showChecklist ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showChecklist && (
              <div className="p-3 bg-slate-950/40 border-t border-slate-850 text-xs">
                {/* Equipment Specs */}
                <div className="grid grid-cols-2 gap-2 pb-2.5 mb-2.5 border-b border-slate-850 text-[11px] font-mono text-slate-300">
                  <div>
                    <span className="font-bold block text-slate-500 uppercase text-[9px] tracking-wide">Modelo</span>
                    <span className="text-white font-bold">{visit.scaleInfo?.brandModel || "-"}</span>
                  </div>
                  <div>
                    <span className="font-bold block text-slate-500 uppercase text-[9px] tracking-wide">Capacidade / Divisão</span>
                    <span className="text-white font-bold">
                      {visit.scaleInfo?.capacity ? `${visit.scaleInfo.capacity}` : "-"}
                      {visit.scaleInfo?.resolution ? ` e: ${visit.scaleInfo.resolution}` : ""}
                    </span>
                  </div>
                </div>

                {/* Tests Checklist */}
                {visit.scaleInfo?.testsCompleted && (
                  <div className="space-y-2">
                    <span className="font-black text-[10px] text-amber-500/90 uppercase block tracking-widest mb-1.5 font-mono">
                      Checklist Técnico (Calibração):
                    </span>
                    
                    <label id={`check-zero-${visit.id}`} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-850/40 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visit.scaleInfo.testsCompleted.zeroTest}
                        onChange={() => handleChecklistToggle("zeroTest")}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      <span className={`text-[11px] font-mono ${visit.scaleInfo.testsCompleted.zeroTest ? "line-through text-slate-500 font-semibold" : "text-slate-200"}`}>
                        Ajuste de Zero (Retorno/Estabilidade)
                      </span>
                    </label>

                    <label id={`check-load-${visit.id}`} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-850/40 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visit.scaleInfo.testsCompleted.loadTest}
                        onChange={() => handleChecklistToggle("loadTest")}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      <span className={`text-[11px] font-mono ${visit.scaleInfo.testsCompleted.loadTest ? "line-through text-slate-500 font-semibold" : "text-slate-200"}`}>
                        Ensaio de Carga (Linearidade)
                      </span>
                    </label>

                    <label id={`check-eccentricity-${visit.id}`} className="flex items-center gap-2.5 py-1 px-1.5 hover:bg-slate-850/40 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visit.scaleInfo.testsCompleted.eccentricityTest}
                        onChange={() => handleChecklistToggle("eccentricityTest")}
                        className="w-4 h-4 text-amber-500 bg-slate-900 border-slate-700 rounded focus:ring-amber-500 accent-amber-500"
                      />
                      <span className={`text-[11px] font-mono ${visit.scaleInfo.testsCompleted.eccentricityTest ? "line-through text-slate-500 font-semibold" : "text-slate-200"}`}>
                        Ensaio de Excentricidade (Cantos)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* EASY CONCLUDE / START ATTENDANCE BUTTON */}
        {visit.status !== VisitStatus.Completed && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {visit.status === VisitStatus.Pending ? (
              <>
                <button
                  id={`direct-start-${visit.id}`}
                  onClick={() => onStatusChange(visit.id, VisitStatus.InProgress)}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm font-mono"
                >
                  <Play className="w-4 h-4 text-slate-950 fill-slate-950 stroke-[3]" />
                  <span>Iniciar Atendimento</span>
                </button>
                
                <button
                  id={`direct-conclude-${visit.id}`}
                  onClick={() => onStatusChange(visit.id, VisitStatus.Completed)}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm font-mono"
                >
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                  <span>Encerrar / Concluir</span>
                </button>
              </>
            ) : (
              <button
                id={`direct-conclude-${visit.id}`}
                onClick={() => onStatusChange(visit.id, VisitStatus.Completed)}
                className="col-span-2 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md shadow-emerald-950/20 font-mono"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Encerrar / Concluir Atendimento</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer controls: Edit/Delete */}
      <div className="flex items-center justify-between border-t border-slate-850 px-4 py-3 bg-slate-950/20">
        <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
          Criado em: {new Date(visit.createdAt).toLocaleDateString("pt-BR")}
        </span>

        <div className="flex items-center gap-2">
          <button
            id={`visit-edit-${visit.id}`}
            onClick={() => onEdit(visit)}
            className="p-1.5 px-3 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-slate-800 text-slate-200 hover:bg-slate-750 hover:text-white rounded-xl shadow-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            Editar
          </button>
          
          <button
            id={`visit-delete-${visit.id}`}
            onClick={handleDeleteClick}
            className={`p-1.5 px-3 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
              showConfirmDelete 
                ? "bg-rose-600 text-white hover:bg-rose-700 animate-pulse border border-rose-500 shadow-md" 
                : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 border border-rose-500/10"
            } rounded-xl`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{showConfirmDelete ? "CONFIRMA?" : "Excluir"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
