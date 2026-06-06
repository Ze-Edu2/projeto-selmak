/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  Calibration = "Calibração de Balança",
  PreventiveMaintenance = "Manutenção Preventiva",
  CorrectiveMaintenance = "Manutenção Corretiva",
  DeliveryInstallation = "Entrega / Instalação",
  CommercialVisit = "Visita Comercial",
  Other = "Outro Visita / Serviço"
}

export enum VisitStatus {
  Pending = "Pendente",
  InProgress = "Em Execução",
  Completed = "Concluído"
}

export interface ScaleChecklist {
  capacity?: string; // e.g., "15kg", "300kg"
  resolution?: string; // e.g., "5g", "100g"
  brandModel?: string; // e.g., "Toledo Prix 3"
  testsCompleted?: {
    zeroTest: boolean;
    loadTest: boolean;
    eccentricityTest: boolean;
  };
}

export interface Visit {
  id: string;
  clientName: string;
  address: string;
  serviceType: ServiceType;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  status: VisitStatus;
  contactPhone?: string;
  scaleInfo?: ScaleChecklist; // Optional scale-specific checklist
  createdAt: string;
}

export interface ClientStats {
  totalVisits: number;
  completedVisits: number;
  lastVisitDate?: string;
}

export interface SavedClient {
  id: string;
  name: string;
  address: string;
  contactPhone?: string;
  stats?: ClientStats;
}
