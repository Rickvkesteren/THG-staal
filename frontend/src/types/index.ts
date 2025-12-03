// ============================================================
// TYPE DEFINITIONS - Staal Hergebruik Systeem
// ============================================================

// Profiel Types
export type ProfielType = 'HEA' | 'HEB' | 'HEM' | 'IPE' | 'IPN' | 'UNP' | 'UPE' | 'L' | 'T' | 'RHS' | 'SHS' | 'CHS';

export type StaalKwaliteit = 'S235' | 'S275' | 'S355' | 'S420' | 'S460';

export interface ProfielAfmetingen {
  hoogte: number;
  breedte: number;
  lijfDikte: number;
  flensDikte: number;
  radius: number;
  oppervlakte: number;
  gewichtPerM: number;
  Iy: number;
  Iz: number;
  Wy: number;
  Wz: number;
}

export interface StaalProfiel {
  id: string;
  type: ProfielType;
  naam: string;
  afmetingen: ProfielAfmetingen;
}

// Gebouw Structuur Types
export type ElementType = 'balk' | 'kolom' | 'ligger' | 'windverband' | 'vloerligger' | 'schoor' | 'spant' | 'gording' | 'dakspoor' | 'stijl' | 'regel';
export type VerbindingType = 'gelast' | 'gebout' | 'momentvast' | 'scharnier';
export type Conditie = 'goed' | 'matig' | 'slecht' | 'onbekend';
export type OntmantelingsStatus = 'gepland' | 'in_uitvoering' | 'voltooid' | 'geannuleerd' | 'actief';

export interface Positie3D {
  x: number;
  y: number;
  z: number;
}

export interface AangelastItem {
  id: string;
  type: string;
  beschrijving: string;
  positie: Positie3D;
  afmetingen: { L: number; B: number; H: number };
  gewicht: number;
  lasLengte: number;
  verwijderTijd: number;
}

export interface StaalElement {
  id: string;
  naam: string;
  type: ElementType;
  profielNaam: string;
  kwaliteit: StaalKwaliteit;
  startPositie: Positie3D;
  eindPositie: Positie3D;
  lengte: number;
  rotatie: number;
  startVerbinding: VerbindingType;
  eindVerbinding: VerbindingType;
  aangelasteItems: AangelastItem[];
  conditie: Conditie;
  opmerkingen: string;
  gewicht: number;
  schoonGewicht: number;
}

// GebouwElement voor CAD import en 3D weergave (vereenvoudigd)
export interface GebouwElement {
  id: string;
  gebouwId: string;
  type: ElementType;
  profielId: string;
  profielNaam: string;
  lengte: number;
  gewicht: number;
  conditie: Conditie;
  positie: Positie3D;
  rotatie: Positie3D;
  verdieping: number;
  kleur?: string;
  zichtbaar?: boolean;
  geselecteerd?: boolean;
}

// CAD Import Element (alias)
export type CADElement = GebouwElement;

export interface Gebouw {
  id: string;
  naam: string;
  adres: string;
  bouwjaar?: number;
  status: OntmantelingsStatus;
  verdiepingen?: number;
  ontmantelingsDatum?: string;
  elementen?: Record<string, StaalElement>;
  totaalGewicht: number;
  aantalElementen: number;
}

// Voorraad Types
export type VoorraadStatus = 'beschikbaar' | 'gereserveerd' | 'verkocht' | 'in_bewerking';

export interface VoorraadItem {
  id: string;
  profielId?: string;
  profielNaam: string;
  kwaliteit?: StaalKwaliteit;
  lengte?: number;
  lengteMm?: number;
  gewicht?: number;
  gewichtKg?: number;
  conditie?: Conditie;
  isGeoogst?: boolean;
  herkomstGebouw: string;
  herkomstElement?: string;
  herkomstAdres?: string;
  oogstDatum?: string;
  status: VoorraadStatus;
  locatie?: string;
  verkoopPrijs?: number;
  prijsPerKg?: number;
  sterkteGetest?: boolean;
  certificaatId?: string;
  schoonmaakVoltooid?: boolean;
}

// Oogst Planning Types
export type OogstPrioriteit = 'hoog' | 'middel' | 'laag' | 'skip';
export type DemontageStatus = 'gepland' | 'in_uitvoering' | 'voltooid' | 'overgeslagen';

export interface HerbruikbaarheidsScore {
  elementId: string;
  conditieScore: number;
  profielScore: number;
  lengteScore: number;
  bewerkingScore: number;
  totaalScore: number;
  prioriteit: OogstPrioriteit;
  opmerkingen: string[];
}

export interface DemontageStap {
  id: string;
  volgorde: number;
  elementId: string;
  elementNaam: string;
  actie: string;
  methode: string;
  geschatteTijdMin: number;
  benodigdeApparatuur: string[];
  aantalPersonen: number;
  status: DemontageStatus;
  veiligheidsmaatregelen: string[];
}

export interface OogstPlan {
  id: string;
  gebouwId: string;
  gebouwNaam: string;
  startdatum?: string;
  einddatum?: string;
  stappen: DemontageStap[];
  herbruikbaarheid: Record<string, HerbruikbaarheidsScore>;
  totaleGeschatteTijd: number;
}

// Schoonmaak Types
export type BewerkingType = 'snijbranden' | 'slijpen' | 'frezen' | 'stralen' | 'boren' | 'geen';
export type UrgentieNiveau = 'kritiek' | 'hoog' | 'middel' | 'laag';

export interface SchoonmaakZone {
  id: string;
  positieStart: Positie3D;
  positieEind: Positie3D;
  type: string;
  beschrijving: string;
  bewerking: BewerkingType;
  urgentie: UrgentieNiveau;
  lengte: number;
  breedte: number;
  diepte: number;
  bewerkingTijd: number;
  materiaalKosten: number;
  kleur: string;
}

export interface SchoonmaakPlan {
  id: string;
  elementId: string;
  elementNaam: string;
  profielNaam: string;
  zones: SchoonmaakZone[];
  totaleBewerkingTijd: number;
  totaleKosten: number;
  isComplex: boolean;
}

// Matching Types
export type MatchStatus = 'perfect' | 'goed' | 'matig' | 'geen';

export interface VraagItem {
  id: string;
  profielNaam: string;
  lengteMm: number;
  aantal: number;
  prioriteit: number;
}

export interface MatchResultaat {
  vraagId: string;
  voorraadId?: string;
  status: MatchStatus;
  gevraagdProfiel: string;
  gematchProfiel: string;
  gevraagdeLengte: number;
  beschikbareLengte: number;
  restlengte: number;
  efficiency: number;
  geschatteKosten: number;
}

// Certificering Types
export type CertificaatType = '3.1' | '3.2' | 'herkomst' | 'sterkte' | 'circulair';
export type TestMethode = 'trekproef' | 'hardheid' | 'slagproef' | 'chemisch' | 'visueel' | 'ultrasonisch';

export interface HerkomstData {
  id: string;
  gebouwNaam: string;
  gebouwAdres: string;
  gebouwBouwjaar?: number;
  gebouwFunctie: string;
  oogstDatum?: string;
  oogstBedrijf: string;
  volledigheid: number;
}

export interface TestResultaat {
  id: string;
  testMethode: TestMethode;
  testDatum: string;
  testLaboratorium: string;
  resultaatWaarde?: number;
  resultaatEenheid: string;
  goedgekeurd: boolean;
}

export interface Certificaat {
  id: string;
  certificaatNummer: string;
  type: CertificaatType;
  voorraadItemId: string;
  uitgegevenDoor: string;
  uitgaveDatum: string;
  staalKwaliteit: StaalKwaliteit;
  profielNaam: string;
  herkomst?: HerkomstData;
  testResultaten: TestResultaat[];
  handtekening: string;
  isGeldig: boolean;
}

// Order Types
export type OrderStatus = 'offerte' | 'besteld' | 'in_bewerking' | 'klaar_voor_levering' | 'verzonden' | 'geleverd' | 'geannuleerd';

export interface Klant {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  adres: string;
  postcode: string;
  plaats: string;
}

export interface OrderRegel {
  id: string;
  voorraadItemId: string;
  profielNaam: string;
  lengteMm: number;
  aantal: number;
  stukPrijs: number;
  totaalPrijs: number;
}

export interface Order {
  id: string;
  orderNummer: string;
  klant: Klant;
  regels: OrderRegel[];
  status: OrderStatus;
  aangemaakt: string;
  subtotaal: number;
  korting: number;
  btw: number;
  totaal: number;
}

// Dashboard Stats
export interface DashboardStats {
  totaalVoorraadKg: number;
  totaalGeoogstKg: number;
  aantalElementen: number;
  aantalCertificaten: number;
  openOrders: number;
  matchEfficiency: number;
}
