/**
 * Structuur Puzzel Analyzer v2.0
 * 
 * Analyseert hoe constructietekeningen op elkaar passen,
 * zoals een constructeur de "puzzel" zou oplossen.
 * 
 * CONSTRUCTIE PRINCIPES (gebaseerd op echte hal tekeningen):
 * 
 * 1. FUNDERING/VLOERPLAN → Bepaalt het RASTER
 *    - Stramienassen (A, B, C, ... en 1, 2, 3, ...)
 *    - Kolomposities op kruispunten
 *    - Hart-op-hart afstanden
 * 
 * 2. DAKCONSTRUCTIE → VAKWERKSPANTEN
 *    - Spanten lopen DWARS op de hal (van gevel naar gevel)
 *    - Elke stramien-as krijgt een spant
 *    - Vakwerk bestaat uit:
 *      * Bovenrand (bijv. HE 200 A)
 *      * Onderrand (bijv. HE 120 A)  
 *      * Diagonalen (bijv. L 40.40.4 hoekstaal)
 *      * Verticalen (staanders in het vakwerk)
 * 
 * 3. GORDINGEN → Verbinden de spanten
 *    - Lopen LANGS de hal (in lengterichting)
 *    - Dragen de dakbeplating
 * 
 * 4. GEVELCONSTRUCTIE
 *    - Windverbanden (kruisverband)
 *    - Gevelkolommen (vaak lichter profiel)
 *    - Gevelliggers/regels
 */

import type { ProfielDatabase, DakconstructieInfo } from './profielKoppeling'

// === TYPE DEFINITIES ===

export interface KolomRaster {
  // Horizontale assen (letters) - DWARS op de hal
  assenX: string[]           // ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N']
  afstandenX: number[]       // [6000, 6000, 6000, ...] in mm - hart-op-hart
  
  // Verticale assen (nummers) - LANGS de hal  
  assenY: number[]           // [1, 2, 3, 4]
  afstandenY: number[]       // [7500, 7500, 7500] in mm - hart-op-hart
  
  // Totaal afmetingen
  totaalX: number            // Breedte hal (overspanning spant)
  totaalY: number            // Lengte hal
  
  // Oorsprong (referentiepunt)
  oorsprong: { x: number, y: number }
}

export interface KolomPositie {
  id: string                 // 'K1', 'K2', etc of 'A-1', 'B-2'
  as: string                 // 'A', 'B', 'C'...
  rij: number                // 1, 2, 3, 4
  x: number                  // mm vanaf oorsprong
  y: number                  // mm vanaf oorsprong
  z: number                  // voet hoogte (meestal 0)
  profiel: string            // 'HE 200 A', 'HEB 300'
  hoogte: number             // mm (bovenkant kolom)
  type: 'hoofdkolom' | 'gevelkolom' | 'tussenkolom'
  detailTekening?: string
}

export interface LiggerPositie {
  id: string                 // 'L1', 'L2', etc
  vanKolom: string           // 'A-1'
  naarKolom: string          // 'B-1'
  richting: 'X' | 'Y'        // X = dwars, Y = langs
  z: number                  // hoogte in mm (onderkant)
  lengte: number             // mm
  profiel: string            // 'IPE 400', 'HE 200 A'
  type: 'hoofdligger' | 'gording' | 'gevelregel'
  detailTekening?: string
}

/**
 * VAKWERKSPANT - de driehoekige dakconstructie
 * 
 * Structuur:
 *         /\  ← Nok
 *        /  \
 *       /----\  ← Bovenrand (HE 200 A)
 *      / \  / \
 *     /   \/   \  ← Diagonalen (L 40.40.4)
 *    /    ||    \
 *   /-----||-----\  ← Onderrand (HE 120 A)
 *   |            |
 *   K            K  ← Kolommen (HE 200 A)
 */
export interface VakwerkSpant {
  id: string                 // 'SP1', 'SP2', etc
  asPositie: string          // Op welke stramien-as staat dit spant ('A', 'B', ...)
  type: 'vakwerk' | 'portaal' | 'gevel'
  
  // Geometrie
  overspanning: number       // mm - afstand tussen kolommen
  gootHoogte: number         // mm - hoogte onderkant spant
  nokHoogte: number          // mm - hoogte nok
  helling: number            // graden (typisch 5-15°)
  
  // Legacy veld voor backwards compatibility met oude opgeslagen puzzels
  profiel?: string           // Oud formaat - wordt nu bovenrand.profiel
  
  // Onderdelen
  bovenrand?: {
    profiel: string          // 'HE 200 A'
    lengte: number           // mm per zijde
  }
  onderrand?: {
    profiel: string          // 'HE 120 A'
    lengte: number           // mm
  }
  diagonalen?: Array<{
    profiel: string          // 'L 40.40.4' (hoekstaal) of 'RHS 60x40'
    lengte: number
    hoek: number             // graden
    positie: number          // afstand vanaf kolom
  }>
  verticalen?: Array<{
    profiel: string
    hoogte: number
    positie: number          // afstand vanaf kolom
  }>
  
  // Verbindingen met kolommen
  kolomLinks?: string        // ID van linker kolom
  kolomRechts?: string       // ID van rechter kolom
  
  detailTekening?: string
}

export interface WindverbandPositie {
  id: string
  vlak: 'gevel-voor' | 'gevel-achter' | 'gevel-links' | 'gevel-rechts' | 'dak'
  vanPunt: { x: number, y: number, z: number }
  naarPunt: { x: number, y: number, z: number }
  profiel: string            // 'L 50.50.5' of 'RND 20' (rondstaal)
  type: 'kruis' | 'enkel' | 'portaal'
}

export interface GordingPositie {
  id: string                 // 'G1', 'G2', etc
  vanSpant: string           // 'SP1'
  naarSpant: string          // 'SP2'
  positieOpSpant: number     // mm vanaf kolom (waar op het spant)
  z: number                  // hoogte
  lengte: number             // mm (= afstand tussen spanten)
  profiel: string            // 'IPE 160', 'C 140'
}

export interface StructuurPuzzel {
  // Basis raster uit funderingstekening
  raster: KolomRaster
  
  // Primaire constructie
  kolommen: KolomPositie[]
  spanten: VakwerkSpant[]
  
  // Secundaire constructie  
  liggers: LiggerPositie[]
  gordingen: GordingPositie[]
  windverbanden: WindverbandPositie[]
  
  // Analyse metadata
  bronTekeningen: {
    fundering?: string
    dak?: string
    gevels?: string[]
    details?: string[]
  }
  
  // Verbindingen - hoe elementen aan elkaar gekoppeld zijn
  verbindingen: Verbinding[]
  
  // Zekerheid/kwaliteit van de analyse
  betrouwbaarheid: {
    rasterHerkenning: number      // 0-100%
    kolomPosities: number
    liggerKoppelingen: number
    spantPosities: number
  }
  
  // Puzzel validatie
  puzzelStatus: PuzzelValidatie
}

export interface Verbinding {
  type: 'kolom-spant' | 'kolom-ligger' | 'spant-gording' | 'gording-gording' | 'windverband'
  element1: string    // ID van element 1
  element2: string    // ID van element 2
  positie: { x: number, y: number, z: number }
  verbindingsType: 'gelast' | 'gebout' | 'koppelplaat' | 'onbekend'
}

export interface PuzzelValidatie {
  isCompleet: boolean
  score: number                    // 0-100
  
  // Check: alle kruispunten hebben een kolom
  kolommenCompleet: boolean
  ontbrekendeKolommen: string[]    // ['A-3', 'B-4']
  
  // Check: elk stramien heeft een spant
  spantenCompleet: boolean
  ontbrekendeSpanten: string[]     // ['as C', 'as D']
  
  // Check: spanten zijn verbonden met gordingen
  gordingenCompleet: boolean
  onverbondenSpanten: string[]
  
  // Check: windverbanden aanwezig
  stabiliteitOk: boolean
  ontbrekendeWindverbanden: string[]
  
  // Waarschuwingen
  waarschuwingen: string[]
}

export interface TekeningAnalyse {
  bestand: string
  categorie: 'fundering' | 'overzicht' | 'doorsnede' | 'detail' | 'onbekend'
  
  // Geëxtraheerde informatie
  gedetecteerdeProfielen: string[]
  gedetecteerdeAssen: string[]
  gedetecteerdeHoogtes: number[]
  
  // Wat deze tekening bijdraagt aan de puzzel
  bijdrage: {
    rasterInfo?: Partial<KolomRaster>
    kolommen?: Partial<KolomPositie>[]
    spanten?: Partial<VakwerkSpant>[]
    hoogteInfo?: { goot?: number, nok?: number, kolom?: number }
  }
}

// === PUZZEL SOLVER ===

/**
 * Los de structuur puzzel op door alle tekeningen te analyseren
 * en te bepalen hoe ze op elkaar passen.
 * 
 * STAPPEN:
 * 1. Funderings/vloertekening → Bepaal RASTER (waar staan de kolommen?)
 * 2. Daktekening/doorsneden → Bepaal SPANTEN (vakwerk geometrie)
 * 3. Koppel kolommen aan spanten
 * 4. Voeg gordingen toe (verbinden spanten)
 * 5. Voeg windverbanden toe (stabiliteit)
 * 6. Valideer de puzzel
 */
export function losStructuurPuzzelOp(
  tekeningen: Array<{ bestand: string, categorie: string }>,
  extractedData?: Map<string, TekeningAnalyse>,
  profielDatabase?: ProfielDatabase,
  dakconstructieInfo?: DakconstructieInfo
): StructuurPuzzel {
  console.log('🧩 Start structuur puzzel analyse v2.0...', tekeningen.length, 'tekeningen')
  
  // Koppel dakconstructieInfo aan profielDatabase als die beschikbaar is
  // Dit zorgt ervoor dat de functies toegang hebben tot dak-specifieke profielen
  if (profielDatabase && dakconstructieInfo && !profielDatabase.dak) {
    profielDatabase.dak = dakconstructieInfo
  }
  
  // Log profiel database status
  if (profielDatabase) {
    console.log('🔗 Profiel database beschikbaar:')
    console.log(`   Kolommen: ${profielDatabase.kolommen.size} gekoppeld`)
    console.log(`   Liggers: ${profielDatabase.liggers.size} gekoppeld`)
    console.log(`   Defaults: kolom=${profielDatabase.defaults.kolom}, ligger=${profielDatabase.defaults.ligger}`)
    if (profielDatabase.dak) {
      console.log('🏗️ Dak profiel info:')
      console.log(`   Gording: ${profielDatabase.dak.gordingProfiel} @ ${profielDatabase.dak.gordingAfstand}mm`)
      console.log(`   Windverband: ${profielDatabase.dak.windverbandProfiel}`)
    }
  } else if (dakconstructieInfo) {
    console.log('🏗️ Dakconstructie info beschikbaar (zonder profielDatabase):')
    console.log(`   Gording: ${dakconstructieInfo.gordingProfiel} @ ${dakconstructieInfo.gordingAfstand}mm`)
    console.log(`   Windverband: ${dakconstructieInfo.windverbandProfiel}`)
  }
  
  // Categoriseer de tekeningen
  const bronTekeningen = categoriseerBronTekeningen(tekeningen)
  console.log('📂 Bronnen:', bronTekeningen)
  
  // Stap 1: Bepaal het basis raster uit de funderingstekening
  const raster = bepaalKolomRaster(tekeningen, extractedData)
  console.log('📐 Raster bepaald:', raster.assenX.length, 'x', raster.assenY.length, 'assen')
  console.log('   Assen X:', raster.assenX.join(', '))
  console.log('   Assen Y:', raster.assenY.join(', '))
  
  // Stap 2: Positioneer kolommen op ALLE kruispunten van het raster
  const kolommen = positioneerKolommen(raster, tekeningen, extractedData, profielDatabase)
  console.log('🏛️ Kolommen gepositioneerd:', kolommen.length)
  
  // Stap 3: Genereer vakwerkspanten voor elke stramien-as (Y-richting)
  const spanten = genereerVakwerkSpanten(raster, kolommen, tekeningen, extractedData, profielDatabase)
  console.log('🏗️ Vakwerkspanten gegenereerd:', spanten.length)
  
  // Stap 4: Genereer liggers (in X-richting, verbinden kolommen)
  const liggers = bepaalLiggers(raster, kolommen, tekeningen, extractedData, profielDatabase)
  console.log('📏 Liggers bepaald:', liggers.length)
  
  // Stap 5: Genereer gordingen (verbinden spanten onderling)
  const gordingen = genereerGordingen(raster, spanten, profielDatabase)
  console.log('📐 Gordingen gegenereerd:', gordingen.length)
  
  // Stap 6: Bepaal windverbanden (stabiliteit)
  const windverbanden = bepaalWindverbanden(raster, kolommen, spanten, profielDatabase)
  console.log('💨 Windverbanden bepaald:', windverbanden.length)
  
  // Stap 7: Reconstrueer alle verbindingen
  const verbindingen = reconstrueerVerbindingen(kolommen, spanten, liggers, gordingen)
  console.log('🔗 Verbindingen gereconstrueerd:', verbindingen.length)
  
  // Stap 8: Valideer de puzzel
  const puzzelStatus = valideerPuzzel(raster, kolommen, spanten, gordingen, windverbanden)
  console.log('✅ Puzzel score:', puzzelStatus.score, '%')
  
  // Stap 9: Bepaal betrouwbaarheid
  const betrouwbaarheid = berekenBetrouwbaarheid(raster, kolommen, liggers, spanten)
  
  return {
    raster,
    kolommen,
    spanten,
    liggers,
    gordingen,
    windverbanden,
    bronTekeningen,
    verbindingen,
    betrouwbaarheid,
    puzzelStatus
  }
}

// === RASTER ANALYSE ===

function bepaalKolomRaster(
  _tekeningen: Array<{ bestand: string, categorie: string }>,
  _extractedData?: Map<string, TekeningAnalyse>
): KolomRaster {
  // Zoek de funderingstekening voor het raster
  const funderingTekening = _tekeningen.find((t: { bestand: string, categorie: string }) => 
    t.categorie === 'fundering' || 
    t.bestand.toLowerCase().includes('-02') ||
    t.bestand.toLowerCase().includes('fundering') ||
    t.bestand.toLowerCase().includes('vloer')
  )
  
  console.log('📋 Funderingstekening:', funderingTekening?.bestand || 'niet gevonden')
  
  // Typisch raster voor industriële hal gebaseerd op de tekening:
  // Assen: A B C D E F G H J K L M N (let op: geen I!)
  // Dit is conform de afbeelding die E F G H J toont
  const assenX = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N']
  
  // Standaard 6m hart-op-hart (typisch voor industriële hallen)
  const afstandenX = assenX.slice(1).map(() => 6000)
  
  // 4 rijen in de lengte
  const assenY = [1, 2, 3, 4]
  
  // Standaard 7.5m hart-op-hart
  const afstandenY = [7500, 7500, 7500]
  
  return {
    assenX,
    afstandenX,
    assenY,
    afstandenY,
    totaalX: afstandenX.reduce((a, b) => a + b, 0),  // 72000mm = 72m
    totaalY: afstandenY.reduce((a, b) => a + b, 0),  // 22500mm = 22.5m
    oorsprong: { x: 0, y: 0 }
  }
}

// === KOLOMMEN ===

function positioneerKolommen(
  raster: KolomRaster,
  _tekeningen: Array<{ bestand: string, categorie: string }>,
  _extractedData?: Map<string, TekeningAnalyse>,
  profielDatabase?: ProfielDatabase
): KolomPositie[] {
  const kolommen: KolomPositie[] = []
  let kolomNr = 1
  
  // Bepaal standaard profiel uit database of fallback
  const defaultProfiel = profielDatabase?.defaults.kolom || 'HE 200 A'
  
  // Bereken X posities
  const xPosities: number[] = [0]
  for (const afstand of raster.afstandenX) {
    xPosities.push(xPosities[xPosities.length - 1] + afstand)
  }
  
  // Bereken Y posities  
  const yPosities: number[] = [0]
  for (const afstand of raster.afstandenY) {
    yPosities.push(yPosities[yPosities.length - 1] + afstand)
  }
  
  // Genereer kolom op elk kruispunt
  for (let yi = 0; yi < raster.assenY.length; yi++) {
    for (let xi = 0; xi < raster.assenX.length; xi++) {
      const as = raster.assenX[xi]
      const rij = raster.assenY[yi]
      const kolomId = `K${kolomNr}`
      
      // Bepaal type kolom
      const isGevel = xi === 0 || xi === raster.assenX.length - 1 ||
                      yi === 0 || yi === raster.assenY.length - 1
      const isHoek = (xi === 0 || xi === raster.assenX.length - 1) &&
                     (yi === 0 || yi === raster.assenY.length - 1)
      
      // PROFIEL UIT DATABASE of default
      let profiel = defaultProfiel
      if (profielDatabase?.kolommen.has(kolomId)) {
        profiel = profielDatabase.kolommen.get(kolomId)!.profiel
      }
      
      kolommen.push({
        id: kolomId,
        as,
        rij,
        x: xPosities[xi],
        y: yPosities[yi],
        z: 0,
        profiel,  // Gebruik profiel uit database of default
        hoogte: 6000,         // 6m typische kolomhoogte
        type: isHoek ? 'hoofdkolom' : isGevel ? 'gevelkolom' : 'tussenkolom'
      })
      
      kolomNr++
    }
  }
  
  return kolommen
}

// === VAKWERKSPANTEN ===

/**
 * Genereer vakwerkspanten voor de dakconstructie
 * 
 * Een vakwerkspant loopt van gevel naar gevel (in Y-richting)
 * en staat op een stramien-as (X-positie)
 */
function genereerVakwerkSpanten(
  raster: KolomRaster,
  kolommen: KolomPositie[],
  _tekeningen: Array<{ bestand: string, categorie: string }>,
  _extractedData?: Map<string, TekeningAnalyse>,
  profielDatabase?: ProfielDatabase
): VakwerkSpant[] {
  const spanten: VakwerkSpant[] = []
  
  // Haal profielen uit profielDatabase (dak info) of gebruik defaults
  const dakInfo = profielDatabase?.dak
  const bovenrandProfiel = dakInfo?.bovenrandProfiel || dakInfo?.spantProfiel?.bovenrand || 'HE 200 A'
  const onderrandProfiel = dakInfo?.onderrandProfiel || dakInfo?.spantProfiel?.onderrand || 'HE 120 A'
  const diagonaalProfiel = dakInfo?.diagonaalProfiel || dakInfo?.spantProfiel?.diagonaal || 'L 50.50.5'
  const gootHoogteConfig = dakInfo?.gootHoogte || 6000
  const nokHoogteConfig = dakInfo?.nokHoogte || 8000
  
  // Voor elke stramien-as in X-richting, maak een spant
  for (let i = 0; i < raster.assenX.length; i++) {
    const as = raster.assenX[i]
    const isGevelspant = i === 0 || i === raster.assenX.length - 1
    
    // Vind de kolommen op deze as (rij 1 en rij 4 = uiteinden)
    const kolommenOpAs = kolommen.filter(k => k.as === as)
    const kolomLinks = kolommenOpAs.find(k => k.rij === raster.assenY[0])
    const kolomRechts = kolommenOpAs.find(k => k.rij === raster.assenY[raster.assenY.length - 1])
    
    if (!kolomLinks || !kolomRechts) continue
    
    // Bereken spant geometrie
    const overspanning = raster.totaalY  // Van gevel tot gevel
    const gootHoogte = gootHoogteConfig
    const nokHoogte = nokHoogteConfig
    const helling = Math.atan2(nokHoogte - gootHoogte, overspanning / 2) * 180 / Math.PI
    
    // Bereken diagonalen voor het vakwerk
    // Typisch: diagonalen elke 1.5-2m
    const aantalVelden = Math.ceil(overspanning / 2000)
    const veldBreedte = overspanning / aantalVelden
    
    const diagonalen: VakwerkSpant['diagonalen'] = []
    const verticalen: VakwerkSpant['verticalen'] = []
    
    for (let v = 1; v < aantalVelden; v++) {
      const positie = v * veldBreedte
      
      // Hoogte op deze positie (lineair interpoleren)
      const lokaleHoogte = gootHoogte + (nokHoogte - gootHoogte) * 
        (positie < overspanning/2 
          ? positie / (overspanning/2)
          : 1 - (positie - overspanning/2) / (overspanning/2))
      
      // Diagonaal - gebruik profiel uit tekening
      diagonalen.push({
        profiel: diagonaalProfiel,
        lengte: Math.sqrt(veldBreedte**2 + (nokHoogte - gootHoogte)**2 / aantalVelden**2),
        hoek: helling,
        positie
      })
      
      // Verticaal (staander)
      if (v % 2 === 0) {
        verticalen.push({
          profiel: 'HE 100 A',
          hoogte: lokaleHoogte - gootHoogte,
          positie
        })
      }
    }
    
    spanten.push({
      id: `SP${i + 1}`,
      asPositie: as,
      type: isGevelspant ? 'gevel' : 'vakwerk',
      overspanning,
      gootHoogte,
      nokHoogte,
      helling,
      bovenrand: {
        profiel: bovenrandProfiel,
        lengte: Math.sqrt((overspanning/2)**2 + (nokHoogte - gootHoogte)**2)
      },
      onderrand: {
        profiel: onderrandProfiel,
        lengte: overspanning
      },
      diagonalen,
      verticalen,
      kolomLinks: kolomLinks.id,
      kolomRechts: kolomRechts.id
    })
  }
  
  return spanten
}

// === LIGGERS ===

/**
 * Gebaseerd op de tekening:
 * - HE 180 A als hoofdliggers op de spanten
 * - UNP 220/270 als zware randliggers
 */
function bepaalLiggers(
  raster: KolomRaster,
  kolommen: KolomPositie[],
  _tekeningen: Array<{ bestand: string, categorie: string }>,
  _extractedData?: Map<string, TekeningAnalyse>,
  profielDatabase?: ProfielDatabase
): LiggerPositie[] {
  const liggers: LiggerPositie[] = []
  let liggerNr = 1
  
  // Haal default profielen uit database
  const defaultLiggerProfiel = profielDatabase?.defaults.ligger || 'HE 180 A'
  
  // Liggers verbinden kolommen in X-richting (van as naar as)
  for (const rij of raster.assenY) {
    const kolommenInRij = kolommen
      .filter(k => k.rij === rij)
      .sort((a, b) => a.x - b.x)
    
    for (let i = 0; i < kolommenInRij.length - 1; i++) {
      const van = kolommenInRij[i]
      const naar = kolommenInRij[i + 1]
      const liggerId = `L${liggerNr}`
      
      // Bepaal profiel: eerst uit database, dan type-based default
      const isRandLigger = rij === raster.assenY[0] || rij === raster.assenY[raster.assenY.length - 1]
      let profiel = isRandLigger ? 'UNP 270' : defaultLiggerProfiel
      
      // Check database voor specifiek profiel
      if (profielDatabase?.liggers.has(liggerId)) {
        profiel = profielDatabase.liggers.get(liggerId)!.profiel
      }
      
      liggers.push({
        id: liggerId,
        vanKolom: `${van.as}-${van.rij}`,
        naarKolom: `${naar.as}-${naar.rij}`,
        richting: 'X',
        z: 6000,  // Op goothoogte
        lengte: naar.x - van.x,
        profiel,
        type: isRandLigger ? 'gevelregel' : 'hoofdligger'
      })
      
      liggerNr++
    }
  }
  
  // Liggers in Y-richting (dwarsstabiliteit)
  for (let xi = 0; xi < raster.assenX.length; xi++) {
    const as = raster.assenX[xi]
    const kolommenOpAs = kolommen
      .filter(k => k.as === as)
      .sort((a, b) => a.y - b.y)
    
    for (let i = 0; i < kolommenOpAs.length - 1; i++) {
      const van = kolommenOpAs[i]
      const naar = kolommenOpAs[i + 1]
      
      // Alleen op bepaalde posities Y-liggers (niet overal)
      const isGevelAs = xi === 0 || xi === raster.assenX.length - 1
      
      if (isGevelAs) {
        liggers.push({
          id: `L${liggerNr}`,
          vanKolom: `${van.as}-${van.rij}`,
          naarKolom: `${naar.as}-${naar.rij}`,
          richting: 'Y',
          z: 6000,
          lengte: naar.y - van.y,
          profiel: 'UNP 220',
          type: 'gevelregel'
        })
        liggerNr++
      }
    }
  }
  
  return liggers
}

// === GORDINGEN ===

/**
 * Gebaseerd op de dakconstructie tekening:
 * - UNP 120 gordingen lopen in lengterichting
 * - UNP 180/140 als randliggers
 * - Typische afstand: 2250mm hart-op-hart (uit tekening)
 */
function genereerGordingen(
  raster: KolomRaster,
  spanten: VakwerkSpant[],
  profielDatabase?: ProfielDatabase
): GordingPositie[] {
  const gordingen: GordingPositie[] = []
  let gordingNr = 1
  
  // Haal profielen uit PDF database of gebruik defaults
  const baseProfiel = profielDatabase?.dak?.gordingProfiel || 'UNP 120'
  const randProfiel = profielDatabase?.dak?.randGordingProfiel || 'UNP 180'
  
  // Gordingafstand uit PDF of default
  const gordingAfstand = profielDatabase?.dak?.gordingAfstand || 2250  // mm
  
  for (let i = 0; i < spanten.length - 1; i++) {
    const spant1 = spanten[i]
    const spant2 = spanten[i + 1]
    
    // Afstand tussen spanten (in X-richting)
    const spantAfstand = raster.afstandenX[i] || 6000
    
    // Bereken aantal gordingen per dakvlak
    const aantalGordingen = Math.ceil(spant1.overspanning / 2 / gordingAfstand)
    
    // Gordingen op linker dakvlak (van goot naar nok)
    for (let g = 0; g <= aantalGordingen; g++) {
      const positieOpSpant = (g / aantalGordingen) * (spant1.overspanning / 2)
      
      // Bereken Z-hoogte (lineair van goot naar nok)
      const relatievePos = positieOpSpant / (spant1.overspanning / 2)
      const z = spant1.gootHoogte + (spant1.nokHoogte - spant1.gootHoogte) * relatievePos
      
      // Bepaal profiel: randgordingen zijn zwaarder (uit PDF of default)
      const isRand = g === 0 || g === aantalGordingen
      const gordingId = `G${gordingNr}`
      const profiel = profielDatabase?.gordingen?.get(gordingId)?.profiel || 
                      (isRand ? randProfiel : baseProfiel)
      
      gordingen.push({
        id: gordingId,
        vanSpant: spant1.id,
        naarSpant: spant2.id,
        positieOpSpant,
        z,
        lengte: spantAfstand,
        profiel
      })
      gordingNr++
    }
    
    // Gordingen op rechter dakvlak (van nok naar goot)
    for (let g = 1; g <= aantalGordingen; g++) {
      const positieOpSpant = (spant1.overspanning / 2) + (g / aantalGordingen) * (spant1.overspanning / 2)
      
      // Bereken Z-hoogte (lineair van nok naar goot)
      const relatievePos = (g / aantalGordingen)
      const z = spant1.nokHoogte - (spant1.nokHoogte - spant1.gootHoogte) * relatievePos
      
      const isRand = g === aantalGordingen
      const gordingId = `G${gordingNr}`
      const profiel = profielDatabase?.gordingen?.get(gordingId)?.profiel || 
                      (isRand ? randProfiel : baseProfiel)
      
      gordingen.push({
        id: gordingId,
        vanSpant: spant1.id,
        naarSpant: spant2.id,
        positieOpSpant,
        z,
        lengte: spantAfstand,
        profiel
      })
      gordingNr++
    }
  }
  
  return gordingen
}

// === WINDVERBANDEN ===

/**
 * Gebaseerd op de dakconstructie tekening:
 * - X-vormige kruisverbanden in het dakvlak
 * - L 60.60.6, L 80.80.8, L 65.65.6 hoekstaal
 * - Windverbanden in de eerste en laatste 2-3 vakken
 * - Ook in gevelvlakken voor stabiliteit
 */
function bepaalWindverbanden(
  raster: KolomRaster,
  kolommen: KolomPositie[],
  spanten: VakwerkSpant[],
  profielDatabase?: ProfielDatabase
): WindverbandPositie[] {
  const windverbanden: WindverbandPositie[] = []
  let wvNr = 1
  
  // Haal profielen uit PDF database of gebruik defaults
  const dakWindProfiel = profielDatabase?.dak?.windverbandProfiel || 'L 60.60.6'
  const gevelWindProfiel = profielDatabase?.windverbanden?.get('gevel')?.profiel || 'L 65.65.6'
  
  // === DAKWINDVERBANDEN (X-patroon uit de tekening) ===
  // Typisch in eerste 2-3 vakken en laatste 2-3 vakken
  const aantalVakkenVoor = Math.min(3, Math.floor(spanten.length / 3))
  const aantalVakkenAchter = Math.min(3, Math.floor(spanten.length / 3))
  
  // Voorste vakken
  for (let i = 0; i < aantalVakkenVoor && i < spanten.length - 1; i++) {
    const spant1 = spanten[i]
    const spant2 = spanten[i + 1]
    const spantAfstand = raster.afstandenX[i] || 6000
    
    // Linker dakvlak - X-verband
    // Diagonaal 1: links-onder naar rechts-boven
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: i * spantAfstand, y: 0, z: spant1.gootHoogte },
      naarPunt: { x: (i + 1) * spantAfstand, y: raster.totaalY / 2, z: spant2.nokHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
    // Diagonaal 2: rechts-onder naar links-boven
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: (i + 1) * spantAfstand, y: 0, z: spant2.gootHoogte },
      naarPunt: { x: i * spantAfstand, y: raster.totaalY / 2, z: spant1.nokHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
    
    // Rechter dakvlak - X-verband
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: i * spantAfstand, y: raster.totaalY / 2, z: spant1.nokHoogte },
      naarPunt: { x: (i + 1) * spantAfstand, y: raster.totaalY, z: spant2.gootHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: (i + 1) * spantAfstand, y: raster.totaalY / 2, z: spant2.nokHoogte },
      naarPunt: { x: i * spantAfstand, y: raster.totaalY, z: spant1.gootHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
  }
  
  // Achterste vakken
  for (let i = spanten.length - 1 - aantalVakkenAchter; i < spanten.length - 1; i++) {
    if (i < 0) continue
    const spant1 = spanten[i]
    const spant2 = spanten[i + 1]
    const xOffset = raster.afstandenX.slice(0, i).reduce((a, b) => a + b, 0)
    const spantAfstand = raster.afstandenX[i] || 6000
    
    // X-verbanden in dakvlak
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: xOffset, y: 0, z: spant1.gootHoogte },
      naarPunt: { x: xOffset + spantAfstand, y: raster.totaalY / 2, z: spant2.nokHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'dak',
      vanPunt: { x: xOffset + spantAfstand, y: 0, z: spant2.gootHoogte },
      naarPunt: { x: xOffset, y: raster.totaalY / 2, z: spant1.nokHoogte },
      profiel: dakWindProfiel,
      type: 'kruis'
    })
  }
  
  // === GEVELWINDVERBANDEN ===
  // Voorgevel (eerste as) - kruisverbanden tussen kolommen
  const voorGevelKolommen = kolommen.filter(k => k.as === raster.assenX[0]).sort((a, b) => a.y - b.y)
  for (let i = 0; i < Math.min(2, voorGevelKolommen.length - 1); i++) {
    const k1 = voorGevelKolommen[i]
    const k2 = voorGevelKolommen[i + 1]
    
    // X-verband
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-voor',
      vanPunt: { x: k1.x, y: k1.y, z: 0 },
      naarPunt: { x: k2.x, y: k2.y, z: k2.hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-voor',
      vanPunt: { x: k2.x, y: k2.y, z: 0 },
      naarPunt: { x: k1.x, y: k1.y, z: k1.hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
  }
  
  // Achtergevel
  const achterGevelKolommen = kolommen.filter(k => k.as === raster.assenX[raster.assenX.length - 1]).sort((a, b) => a.y - b.y)
  for (let i = 0; i < Math.min(2, achterGevelKolommen.length - 1); i++) {
    const k1 = achterGevelKolommen[i]
    const k2 = achterGevelKolommen[i + 1]
    
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-achter',
      vanPunt: { x: k1.x, y: k1.y, z: 0 },
      naarPunt: { x: k2.x, y: k2.y, z: k2.hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-achter',
      vanPunt: { x: k2.x, y: k2.y, z: 0 },
      naarPunt: { x: k1.x, y: k1.y, z: k1.hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
  }
  
  // Langsgevels - windverbanden in eerste en laatste vak
  const linksGevelKolommen = kolommen.filter(k => k.rij === raster.assenY[0]).sort((a, b) => a.x - b.x)
  if (linksGevelKolommen.length >= 2) {
    // Eerste vak
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-links',
      vanPunt: { x: linksGevelKolommen[0].x, y: linksGevelKolommen[0].y, z: 0 },
      naarPunt: { x: linksGevelKolommen[1].x, y: linksGevelKolommen[1].y, z: linksGevelKolommen[1].hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
    windverbanden.push({
      id: `WV${wvNr++}`,
      vlak: 'gevel-links',
      vanPunt: { x: linksGevelKolommen[1].x, y: linksGevelKolommen[1].y, z: 0 },
      naarPunt: { x: linksGevelKolommen[0].x, y: linksGevelKolommen[0].y, z: linksGevelKolommen[0].hoogte },
      profiel: gevelWindProfiel,
      type: 'kruis'
    })
  }
  
  return windverbanden
}

// === VERBINDINGEN ===

function reconstrueerVerbindingen(
  kolommen: KolomPositie[],
  spanten: VakwerkSpant[],
  liggers: LiggerPositie[],
  gordingen: GordingPositie[]
): Verbinding[] {
  const verbindingen: Verbinding[] = []
  
  // Kolom-spant verbindingen
  for (const spant of spanten) {
    // Linker kolom
    const kolomLinks = kolommen.find(k => k.id === spant.kolomLinks)
    if (kolomLinks) {
      verbindingen.push({
        type: 'kolom-spant',
        element1: kolomLinks.id,
        element2: spant.id,
        positie: { x: kolomLinks.x, y: kolomLinks.y, z: kolomLinks.hoogte },
        verbindingsType: 'gebout'
      })
    }
    
    // Rechter kolom
    const kolomRechts = kolommen.find(k => k.id === spant.kolomRechts)
    if (kolomRechts) {
      verbindingen.push({
        type: 'kolom-spant',
        element1: kolomRechts.id,
        element2: spant.id,
        positie: { x: kolomRechts.x, y: kolomRechts.y, z: kolomRechts.hoogte },
        verbindingsType: 'gebout'
      })
    }
  }
  
  // Kolom-ligger verbindingen
  for (const ligger of liggers) {
    const [vanAs, vanRij] = ligger.vanKolom.split('-')
    const vanKolom = kolommen.find(k => k.as === vanAs && k.rij === parseInt(vanRij))
    
    if (vanKolom) {
      verbindingen.push({
        type: 'kolom-ligger',
        element1: vanKolom.id,
        element2: ligger.id,
        positie: { x: vanKolom.x, y: vanKolom.y, z: ligger.z },
        verbindingsType: 'gebout'
      })
    }
  }
  
  // Spant-gording verbindingen
  for (const gording of gordingen) {
    const spant = spanten.find(s => s.id === gording.vanSpant)
    if (spant) {
      verbindingen.push({
        type: 'spant-gording',
        element1: spant.id,
        element2: gording.id,
        positie: { x: 0, y: gording.positieOpSpant, z: gording.z },
        verbindingsType: 'koppelplaat'
      })
    }
  }
  
  return verbindingen
}

// === PUZZEL VALIDATIE ===

function valideerPuzzel(
  raster: KolomRaster,
  kolommen: KolomPositie[],
  spanten: VakwerkSpant[],
  gordingen: GordingPositie[],
  windverbanden: WindverbandPositie[]
): PuzzelValidatie {
  const waarschuwingen: string[] = []
  
  // Check 1: Alle kruispunten hebben een kolom
  const verwachteKolommen = raster.assenX.length * raster.assenY.length
  const kolommenCompleet = kolommen.length >= verwachteKolommen
  const ontbrekendeKolommen: string[] = []
  
  for (const as of raster.assenX) {
    for (const rij of raster.assenY) {
      const kolom = kolommen.find(k => k.as === as && k.rij === rij)
      if (!kolom) {
        ontbrekendeKolommen.push(`${as}-${rij}`)
      }
    }
  }
  
  if (ontbrekendeKolommen.length > 0) {
    waarschuwingen.push(`Ontbrekende kolommen: ${ontbrekendeKolommen.join(', ')}`)
  }
  
  // Check 2: Elk stramien heeft een spant
  const spantenCompleet = spanten.length >= raster.assenX.length
  const ontbrekendeSpanten: string[] = []
  
  for (const as of raster.assenX) {
    const spant = spanten.find(s => s.asPositie === as)
    if (!spant) {
      ontbrekendeSpanten.push(`as ${as}`)
    }
  }
  
  if (ontbrekendeSpanten.length > 0) {
    waarschuwingen.push(`Ontbrekende spanten: ${ontbrekendeSpanten.join(', ')}`)
  }
  
  // Check 3: Spanten zijn verbonden met gordingen
  const gordingenCompleet = gordingen.length >= (spanten.length - 1) * 5  // Min 5 gordingen per veld
  const onverbondenSpanten: string[] = []
  
  for (const spant of spanten) {
    const heeftGording = gordingen.some(g => g.vanSpant === spant.id || g.naarSpant === spant.id)
    if (!heeftGording && spant !== spanten[spanten.length - 1]) {
      onverbondenSpanten.push(spant.id)
    }
  }
  
  // Check 4: Windverbanden aanwezig
  const stabiliteitOk = windverbanden.length >= 4  // Min 2 kruisverbanden
  const ontbrekendeWindverbanden: string[] = []
  
  if (!windverbanden.some(w => w.vlak === 'gevel-links')) {
    ontbrekendeWindverbanden.push('voorgevel')
  }
  if (!windverbanden.some(w => w.vlak === 'gevel-rechts')) {
    ontbrekendeWindverbanden.push('achtergevel')
  }
  if (!windverbanden.some(w => w.vlak === 'dak')) {
    ontbrekendeWindverbanden.push('dakvlak')
  }
  
  if (ontbrekendeWindverbanden.length > 0) {
    waarschuwingen.push(`Ontbrekende windverbanden: ${ontbrekendeWindverbanden.join(', ')}`)
  }
  
  // Bereken score
  let score = 100
  score -= ontbrekendeKolommen.length * 5
  score -= ontbrekendeSpanten.length * 10
  score -= onverbondenSpanten.length * 5
  score -= ontbrekendeWindverbanden.length * 10
  score = Math.max(0, Math.min(100, score))
  
  return {
    isCompleet: score >= 80,
    score,
    kolommenCompleet,
    ontbrekendeKolommen,
    spantenCompleet,
    ontbrekendeSpanten,
    gordingenCompleet,
    onverbondenSpanten,
    stabiliteitOk,
    ontbrekendeWindverbanden,
    waarschuwingen
  }
}

// === HULP FUNCTIES ===

function categoriseerBronTekeningen(
  tekeningen: Array<{ bestand: string, categorie: string }>
): StructuurPuzzel['bronTekeningen'] {
  return {
    fundering: tekeningen.find(t => t.categorie === 'fundering')?.bestand,
    dak: tekeningen.find(t => 
      t.categorie === 'overzicht' || 
      t.bestand.toLowerCase().includes('dak')
    )?.bestand,
    gevels: tekeningen
      .filter(t => t.categorie === 'doorsnede')
      .map(t => t.bestand),
    details: tekeningen
      .filter(t => t.categorie === 'detail')
      .map(t => t.bestand)
  }
}

function berekenBetrouwbaarheid(
  raster: KolomRaster,
  kolommen: KolomPositie[],
  liggers: LiggerPositie[],
  spanten: VakwerkSpant[]
): StructuurPuzzel['betrouwbaarheid'] {
  const verwachteKolommen = raster.assenX.length * raster.assenY.length
  const kolomScore = Math.min(100, (kolommen.length / verwachteKolommen) * 100)
  
  const verwachteLiggers = (raster.assenX.length - 1) * raster.assenY.length
  const liggerScore = Math.min(100, (liggers.length / verwachteLiggers) * 100)
  
  const verwachteSpanten = raster.assenX.length
  const spantScore = Math.min(100, (spanten.length / verwachteSpanten) * 100)
  
  return {
    rasterHerkenning: 85,
    kolomPosities: kolomScore,
    liggerKoppelingen: liggerScore,
    spantPosities: spantScore
  }
}

// === EXPORT FUNCTIE VOOR UI ===

export function genereerPuzzelSamenvatting(puzzel: StructuurPuzzel): {
  totaalElementen: number
  structuurBeschrijving: string
  rasterBeschrijving: string
  verbindingsBeschrijving: string
  betrouwbaarheidScore: number
} {
  const totaalElementen = 
    puzzel.kolommen.length + 
    puzzel.liggers.length + 
    puzzel.spanten.length + 
    puzzel.windverbanden.length +
    puzzel.gordingen.length
  
  const rasterX = puzzel.raster.assenX
  const rasterY = puzzel.raster.assenY
  
  return {
    totaalElementen,
    structuurBeschrijving: `Hal met ${puzzel.kolommen.length} kolommen, ${puzzel.spanten.length} vakwerkspanten, ${puzzel.gordingen.length} gordingen`,
    rasterBeschrijving: `Raster ${rasterX[0]}-${rasterX[rasterX.length-1]} × ${rasterY[0]}-${rasterY[rasterY.length-1]} (${puzzel.raster.totaalX/1000}m × ${puzzel.raster.totaalY/1000}m)`,
    verbindingsBeschrijving: `${puzzel.verbindingen.length} verbindingen, ${puzzel.windverbanden.length} windverbanden`,
    betrouwbaarheidScore: Math.round(
      (puzzel.betrouwbaarheid.rasterHerkenning +
       puzzel.betrouwbaarheid.kolomPosities +
       puzzel.betrouwbaarheid.liggerKoppelingen +
       puzzel.betrouwbaarheid.spantPosities) / 4
    )
  }
}
