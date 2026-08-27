/**
 * DigiReady - Shared Type Definitions
 */

export * from "./ontology";
export * from "./service";
export * from "./readiness";
export * from "./consistency";

export interface HealthCheckResponse {
  status: "ok" | "error";
  dbStatus: "connected" | "disconnected";
  timestamp: string;
  error?: string;
}
