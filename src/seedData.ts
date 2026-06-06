/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Visit } from "./types";

// Helper to format Date objects as YYYY-MM-DD
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSeedVisits(): Visit[] {
  // Returns an empty array to ensure no mock/example data remains in the system
  return [];
}
