"""
Module 3: Oogst Planning

Algoritme voor optimale demontage volgorde en planning van te oogsten balken.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Set, Tuple
from uuid import uuid4
from datetime import datetime, timedelta

import sys
sys.path.append("../..")
from modules.m02_gebouw_structuur.structuur import (
    Gebouw, StaalElement, ElementType, Verbinding
)


class OogstPrioriteit(Enum):
    """Prioriteit voor oogsten"""
    HOOG = 1      # Goed herbruikbaar, weinig schade
    MIDDEL = 2    # Herbruikbaar met bewerking
    LAAG = 3      # Alleen als schroot
    SKIP = 4      # Niet oogsten


class DemontageStatus(Enum):
    """Status van demontage"""
    GEPLAND = "gepland"
    IN_UITVOERING = "in_uitvoering"
    VOLTOOID = "voltooid"
    OVERGESLAGEN = "overgeslagen"


@dataclass
class HerbruikbaarheidsScore:
    """Analyse van herbruikbaarheid van een element"""
    element_id: str
    
    # Scores (0-100)
    conditie_score: float = 50      # Fysieke conditie
    profiel_score: float = 50       # Vraag naar dit profiel type
    lengte_score: float = 50        # Bruikbare lengte
    bewerking_score: float = 50     # Moeite om schoon te maken
    
    # Opmerkingen
    opmerkingen: List[str] = field(default_factory=list)
    
    @property
    def totaal_score(self) -> float:
        """Gewogen totaalscore"""
        return (
            self.conditie_score * 0.3 +
            self.profiel_score * 0.25 +
            self.lengte_score * 0.25 +
            self.bewerking_score * 0.2
        )
    
    @property
    def prioriteit(self) -> OogstPrioriteit:
        """Bepaal prioriteit op basis van score"""
        score = self.totaal_score
        if score >= 70:
            return OogstPrioriteit.HOOG
        elif score >= 50:
            return OogstPrioriteit.MIDDEL
        elif score >= 30:
            return OogstPrioriteit.LAAG
        else:
            return OogstPrioriteit.SKIP


@dataclass
class DemontageStap:
    """Eén stap in het demontageproces"""
    id: str = field(default_factory=lambda: str(uuid4()))
    volgorde: int = 0
    element_id: str = ""
    element_naam: str = ""
    
    # Acties
    actie: str = ""  # "verwijder verbindingen", "hijs uit", "transport"
    methode: str = ""  # "losschroeven", "snijden", etc.
    
    # Tijd en resources
    geschatte_tijd: timedelta = field(default_factory=lambda: timedelta(minutes=30))
    benodigde_apparatuur: List[str] = field(default_factory=list)
    aantal_personen: int = 2
    
    # Status
    status: DemontageStatus = DemontageStatus.GEPLAND
    
    # Veiligheid
    veiligheidsmaatregelen: List[str] = field(default_factory=list)
    afhankelijkheden: List[str] = field(default_factory=list)  # element IDs die eerst verwijderd moeten zijn


@dataclass
class OogstPlan:
    """Compleet oogstplan voor een gebouw"""
    id: str = field(default_factory=lambda: str(uuid4()))
    gebouw_id: str = ""
    gebouw_naam: str = ""
    
    # Planning
    startdatum: Optional[datetime] = None
    einddatum: Optional[datetime] = None
    
    # Stappen
    stappen: List[DemontageStap] = field(default_factory=list)
    
    # Scores per element
    herbruikbaarheid: Dict[str, HerbruikbaarheidsScore] = field(default_factory=dict)
    
    # Statistieken
    @property
    def totaal_gewicht_te_oogsten(self) -> float:
        """Kg staal dat geoogst wordt"""
        return sum(
            score.totaal_score for score in self.herbruikbaarheid.values()
            if score.prioriteit != OogstPrioriteit.SKIP
        )
    
    @property
    def totale_geschatte_tijd(self) -> timedelta:
        """Totale geschatte demontage tijd"""
        return sum(
            (stap.geschatte_tijd for stap in self.stappen),
            timedelta()
        )
    
    def naar_dict(self) -> dict:
        """Exporteer naar dictionary"""
        return {
            "id": self.id,
            "gebouw": self.gebouw_naam,
            "startdatum": self.startdatum.isoformat() if self.startdatum else None,
            "aantal_stappen": len(self.stappen),
            "geschatte_dagen": self.totale_geschatte_tijd.days,
            "stappen": [
                {
                    "volgorde": s.volgorde,
                    "element": s.element_naam,
                    "actie": s.actie,
                    "tijd_min": s.geschatte_tijd.total_seconds() / 60,
                    "status": s.status.value
                }
                for s in sorted(self.stappen, key=lambda x: x.volgorde)
            ]
        }


class OogstPlanner:
    """Genereert optimale oogstplannen"""
    
    def __init__(self):
        # Profiel populariteit (vraag in de markt)
        self.profiel_vraag = {
            "HEA 200": 90,
            "HEA 300": 85,
            "HEB 200": 95,
            "HEB 300": 90,
            "IPE 200": 80,
            "IPE 300": 85,
            "IPE 400": 80,
        }
        
        # Minimum lengte voor hergebruik (mm)
        self.min_herbruik_lengte = 3000
        
        # Standaard schoonmaaktijd per type aangelast item (minuten)
        self.schoonmaak_tijd = {
            "schot": 15,
            "plaat": 10,
            "strip": 5,
            "voetplaat": 20,
            "kopplaat": 15,
            "bout_plaat": 8,
            "anker": 25,
        }
    
    def analyseer_herbruikbaarheid(
        self, 
        element: StaalElement
    ) -> HerbruikbaarheidsScore:
        """Analyseer herbruikbaarheid van een element"""
        score = HerbruikbaarheidsScore(element_id=element.id)
        
        # Conditie score (basis op conditie veld)
        conditie_map = {"goed": 90, "matig": 60, "slecht": 30, "onbekend": 50}
        score.conditie_score = conditie_map.get(element.conditie, 50)
        
        # Profiel vraag score
        score.profiel_score = self.profiel_vraag.get(element.profiel_naam, 50)
        
        # Lengte score
        if element.lengte >= 6000:
            score.lengte_score = 100
        elif element.lengte >= 4000:
            score.lengte_score = 80
        elif element.lengte >= self.min_herbruik_lengte:
            score.lengte_score = 60
        else:
            score.lengte_score = 20
            score.opmerkingen.append("Te kort voor standaard hergebruik")
        
        # Bewerking score (minder aangelaste items = hogere score)
        totaal_werk = sum(
            self.schoonmaak_tijd.get(item.type, 10) 
            for item in element.aangelaste_items
        )
        if totaal_werk == 0:
            score.bewerking_score = 100
        elif totaal_werk < 30:
            score.bewerking_score = 80
        elif totaal_werk < 60:
            score.bewerking_score = 60
        elif totaal_werk < 120:
            score.bewerking_score = 40
        else:
            score.bewerking_score = 20
            score.opmerkingen.append(f"Veel schoonmaakwerk: {totaal_werk} min")
        
        return score
    
    def bepaal_demontage_volgorde(
        self, 
        gebouw: Gebouw
    ) -> List[str]:
        """
        Bepaal optimale demontage volgorde.
        
        Regels:
        1. Secundaire elementen eerst (liggers, windverband)
        2. Hoofdbalken na secundaire
        3. Kolommen als laatste
        4. Van boven naar beneden
        """
        elementen_met_hoogte = []
        
        for element in gebouw.elementen.values():
            # Bepaal hoogte (maximum z van start/eind)
            hoogte = max(element.start_positie.z, element.eind_positie.z)
            
            # Bepaal prioriteit (hoger = later verwijderen)
            if element.type == ElementType.KOLOM:
                type_prio = 3
            elif element.type == ElementType.BALK:
                type_prio = 2
            else:
                type_prio = 1
            
            elementen_met_hoogte.append((element.id, hoogte, type_prio))
        
        # Sorteer: eerst lage prioriteit, dan hoog naar laag
        # (secundair hoog, secundair laag, balken hoog, balken laag, kolommen hoog, kolommen laag)
        gesorteerd = sorted(
            elementen_met_hoogte,
            key=lambda x: (x[2], -x[1])  # type prio oplopend, hoogte aflopend
        )
        
        return [e[0] for e in gesorteerd]
    
    def genereer_demontage_stappen(
        self,
        element: StaalElement,
        volgorde: int
    ) -> List[DemontageStap]:
        """Genereer stappen voor één element"""
        stappen = []
        
        # Stap 1: Verbindingen verwijderen
        stappen.append(DemontageStap(
            volgorde=volgorde * 10 + 1,
            element_id=element.id,
            element_naam=element.naam,
            actie="Verbindingen verwijderen",
            methode="losschroeven" if element.start_verbinding.value == "gebout" else "snijden",
            geschatte_tijd=timedelta(minutes=20),
            benodigde_apparatuur=["Moersleutel set", "Steiger"],
            aantal_personen=2,
            veiligheidsmaatregelen=["Valbeveiliging", "Helm", "Veiligheidsschoenen"]
        ))
        
        # Stap 2: Element hijsen/verwijderen
        stappen.append(DemontageStap(
            volgorde=volgorde * 10 + 2,
            element_id=element.id,
            element_naam=element.naam,
            actie="Element uitnemen",
            methode="hijskraan",
            geschatte_tijd=timedelta(minutes=15),
            benodigde_apparatuur=["Hijskraan", "Hijsbanden"],
            aantal_personen=3,
            veiligheidsmaatregelen=["Afzetting werkgebied", "Veilige hijszone"]
        ))
        
        # Stap 3: Transport naar opslaglocatie
        stappen.append(DemontageStap(
            volgorde=volgorde * 10 + 3,
            element_id=element.id,
            element_naam=element.naam,
            actie="Transport naar opslag",
            methode="vrachtwagen",
            geschatte_tijd=timedelta(minutes=10),
            benodigde_apparatuur=["Vrachtwagen", "Sjorbanden"],
            aantal_personen=2
        ))
        
        return stappen
    
    def maak_oogstplan(
        self,
        gebouw: Gebouw,
        startdatum: Optional[datetime] = None
    ) -> OogstPlan:
        """Genereer compleet oogstplan voor een gebouw"""
        plan = OogstPlan(
            gebouw_id=gebouw.id,
            gebouw_naam=gebouw.naam,
            startdatum=startdatum or datetime.now()
        )
        
        # Analyseer alle elementen
        for element in gebouw.elementen.values():
            score = self.analyseer_herbruikbaarheid(element)
            plan.herbruikbaarheid[element.id] = score
        
        # Bepaal volgorde
        volgorde = self.bepaal_demontage_volgorde(gebouw)
        
        # Genereer stappen voor te oogsten elementen
        for idx, element_id in enumerate(volgorde):
            element = gebouw.get_element(element_id)
            score = plan.herbruikbaarheid[element_id]
            
            if score.prioriteit != OogstPrioriteit.SKIP:
                stappen = self.genereer_demontage_stappen(element, idx)
                plan.stappen.extend(stappen)
        
        # Bereken einddatum
        if plan.startdatum:
            plan.einddatum = plan.startdatum + plan.totale_geschatte_tijd
        
        return plan


def print_oogstplan(plan: OogstPlan, gebouw: Gebouw) -> None:
    """Print oogstplan naar console"""
    print(f"\n{'='*60}")
    print(f"OOGSTPLAN: {plan.gebouw_naam}")
    print(f"{'='*60}")
    print(f"Start: {plan.startdatum}")
    print(f"Geschat einde: {plan.einddatum}")
    print(f"Totale tijd: {plan.totale_geschatte_tijd}")
    print(f"Aantal stappen: {len(plan.stappen)}")
    
    print(f"\n{'='*60}")
    print("HERBRUIKBAARHEID ANALYSE")
    print(f"{'='*60}")
    
    for element_id, score in sorted(
        plan.herbruikbaarheid.items(),
        key=lambda x: x[1].totaal_score,
        reverse=True
    ):
        element = gebouw.get_element(element_id)
        print(f"\n{element.naam} ({element.profiel_naam}):")
        print(f"  Totaal score: {score.totaal_score:.0f}/100")
        print(f"  Prioriteit: {score.prioriteit.name}")
        print(f"  - Conditie: {score.conditie_score:.0f}")
        print(f"  - Profiel vraag: {score.profiel_score:.0f}")
        print(f"  - Lengte: {score.lengte_score:.0f}")
        print(f"  - Bewerking: {score.bewerking_score:.0f}")
        if score.opmerkingen:
            print(f"  Opmerkingen: {', '.join(score.opmerkingen)}")


if __name__ == "__main__":
    from modules.m02_gebouw_structuur.structuur import maak_voorbeeld_gebouw
    
    # Maak voorbeeld gebouw
    gebouw = maak_voorbeeld_gebouw()
    
    # Genereer plan
    planner = OogstPlanner()
    plan = planner.maak_oogstplan(gebouw)
    
    # Print resultaat
    print_oogstplan(plan, gebouw)
