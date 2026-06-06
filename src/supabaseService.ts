import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { Visit, SavedClient } from "./types";

// This file implements a dual-persistence strategy: always keep LocalStorage updated for instant offline access,
// and mirror updates to Supabase in the background when connected!

// Helper to convert visit fields to snake_case for PostgreSQL/Supabase
function mapVisitToSupabase(visit: Visit) {
  return {
    id: visit.id,
    client_name: visit.clientName,
    address: visit.address,
    service_type: visit.serviceType,
    description: visit.description,
    date: visit.date,
    time: visit.time || null,
    status: visit.status,
    contact_phone: visit.contactPhone || null,
    scale_info: visit.scaleInfo ? JSON.stringify(visit.scaleInfo) : null,
    created_at: visit.createdAt || new Date().toISOString()
  };
}

// Helper to convert Supabase row back to Visit model
function mapVisitFromSupabase(row: any): Visit {
  let scaleInfoExpanded = undefined;
  if (row.scale_info) {
    try {
      scaleInfoExpanded = typeof row.scale_info === "string" 
        ? JSON.parse(row.scale_info) 
        : row.scale_info;
    } catch (e) {
      console.warn("Error parsing scale_info from database row", e);
    }
  }

  return {
    id: row.id,
    clientName: row.client_name,
    address: row.address,
    serviceType: row.service_type,
    description: row.description || "",
    date: row.date,
    time: row.time || undefined,
    status: row.status,
    contactPhone: row.contact_phone || undefined,
    scaleInfo: scaleInfoExpanded,
    createdAt: row.created_at
  };
}

// Helper to convert client fields to snake_case for PostgreSQL/Supabase
function mapClientToSupabase(client: SavedClient) {
  return {
    id: client.id,
    name: client.name,
    address: client.address,
    contact_phone: client.contactPhone || null,
    created_at: new Date().toISOString()
  };
}

// Helper to convert Supabase row back to Loaded Client
function mapClientFromSupabase(row: any): SavedClient {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    contactPhone: row.contact_phone || undefined,
    stats: {
      totalVisits: 0,
      completedVisits: 0
    } // stats will be synchronized dynamically based on visits in App.tsx
  };
}

/**
 * Pushes (upserts) a single visit to Supabase in a non-blocking way.
 */
export async function pushVisitToSupabase(visit: Visit): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = mapVisitToSupabase(visit);
    const { error } = await supabase
      .from("visits")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Supabase Error upserting visit:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to connect to Supabase to save details:", err);
    return false;
  }
}

/**
 * Deletes a single visit from Supabase in the background.
 */
export async function deleteVisitFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from("visits")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase Error deleting visit:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to connect to Supabase to delete details:", err);
    return false;
  }
}

/**
 * Pushes (upserts) a single client into the "clients" table.
 */
export async function pushClientToSupabase(client: SavedClient): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = mapClientToSupabase(client);
    const { error } = await supabase
      .from("clients")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Supabase Error upserting client:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to connect to Supabase to save client:", err);
    return false;
  }
}

/**
 * Deletes a client from Supabase.
 */
export async function deleteClientFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase Error deleting client:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to connect to Supabase to delete client:", err);
    return false;
  }
}

/**
 * Downloads all data from Supabase to sync local storage of the device if desired.
 */
export async function pullAllFromSupabase(): Promise<{ visits: Visit[]; clients: SavedClient[] } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // 1. Fetch visits
    const { data: visitsData, error: visitsError } = await supabase
      .from("visits")
      .select("*")
      .order("date", { ascending: false });

    if (visitsError) {
      console.error("Supabase Error loading visits:", visitsError);
      throw visitsError;
    }

    // 2. Fetch clients
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });

    if (clientsError) {
      console.error("Supabase Error loading clients:", clientsError);
      throw clientsError;
    }

    const compiledVisits = (visitsData || []).map(row => mapVisitFromSupabase(row));
    const compiledClients = (clientsData || []).map(row => mapClientFromSupabase(row));

    return {
      visits: compiledVisits,
      clients: compiledClients
    };
  } catch (err) {
    console.error("Failed to fetch tables from Supabase repository:", err);
    return null;
  }
}

/**
 * Utility to execute a full cloud sync: upsert all local records to Supabase.
 */
export async function performCloudSync(visits: Visit[], clients: SavedClient[]): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: "Supabase não está configurado. Por favor, adicione as variáveis correspondentes no seu painel ou arquivo .env." };
  }

  try {
    let successCountVisits = 0;
    let successCountClients = 0;

    // Direct batch operations if possible, otherwise map and upsert
    for (const client of clients) {
      const ok = await pushClientToSupabase(client);
      if (ok) successCountClients++;
    }

    for (const visit of visits) {
      const ok = await pushVisitToSupabase(visit);
      if (ok) successCountVisits++;
    }

    return {
      success: true,
      message: `Enviados ${successCountClients} clientes e ${successCountVisits} registros para o Supabase com sucesso!`
    };
  } catch (e: any) {
    return {
      success: false,
      message: `Erro ao sincronizar tabelas: ${e.message || e}`
    };
  }
}
