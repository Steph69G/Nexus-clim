export type MissionStatus = 
  | "BROUILLON" 
  | "PUBLIEE" 
  | "ACCEPTEE" 
  | "PLANIFIEE" 
  | "EN_ROUTE" 
  | "EN_INTERVENTION" 
  | "TERMINEE" 
  | "FACTURABLE" 
  | "FACTUREE" 
  | "PAYEE" 
  | "CLOTUREE" 
  | "ANNULEE";

export interface Mission {
  id: number;
  title: string;
  owner: string;
  status: MissionStatus;
  created_at: string;    // ISO
  updated_at: string | null;
}
