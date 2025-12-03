"""
Module 6: Schoonmaak Analyse

Detectie van aangelaste items en markering van te verwijderen onderdelen.
Generatie van schoonmaakplan met ROOD gemarkeerde zones.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from uuid import uuid4
from enum import Enum
import json

import sys
sys.path.append("../..")
from modules.m02_gebouw_structuur.structuur import (
    StaalElement, AangelastItem, Positie3D
)


class BewerkingType(Enum):
    """Type bewerking voor schoonmaken"""
    SNIJBRANDEN = "snijbranden"      # Voor dikke lassen, grote onderdelen
    SLIJPEN = "slijpen"              # Voor kleine oneffenheden
    FREZEN = "frezen"                # Voor precieze vlakken
    STRALEN = "stralen"              # Voor roest/verf verwijderen
    BOREN = "boren"                  # Voor bout gaten dichten
    GEEN = "geen"                    # Geen bewerking nodig


class UrgentieNiveau(Enum):
    """Urgentie van verwijdering"""
    KRITIEK = "kritiek"      # Moet verwijderd voor hergebruik
    HOOG = "hoog"            # Sterk aanbevolen
    MIDDEL = "middel"        # Optioneel voor kwaliteit
    LAAG = "laag"            # Cosmetisch


@dataclass
class SchoonmaakZone:
    """Een zone die schoongemaakt moet worden"""
    id: str = field(default_factory=lambda: str(uuid4()))
    
    # Locatie op de balk
    positie_start: Positie3D = field(default_factory=Positie3D)
    positie_eind: Positie3D = field(default_factory=Positie3D)
    
    # Type probleem
    type: str = ""  # "las", "schot", "plaat", "boutgat", "roest", "verf"
    beschrijving: str = ""
    
    # Bewerking nodig
    bewerking: BewerkingType = BewerkingType.SNIJBRANDEN
    urgentie: UrgentieNiveau = UrgentieNiveau.HOOG
    
    # Afmetingen zone
    lengte: float = 0  # mm
    breedte: float = 0  # mm
    diepte: float = 0  # mm (diepte van materiaal te verwijderen)
    
    # Geschatte tijd en kosten
    bewerking_tijd: float = 0  # minuten
    materiaal_kosten: float = 0  # €
    
    # Kleurcode voor visualisatie
    @property
    def kleur(self) -> str:
        """Kleurcode voor visualisatie"""
        if self.urgentie == UrgentieNiveau.KRITIEK:
            return "#FF0000"  # ROOD
        elif self.urgentie == UrgentieNiveau.HOOG:
            return "#FF6600"  # Oranje
        elif self.urgentie == UrgentieNiveau.MIDDEL:
            return "#FFCC00"  # Geel
        else:
            return "#00CC00"  # Groen


@dataclass
class SchoonmaakPlan:
    """Compleet schoonmaakplan voor een balk"""
    id: str = field(default_factory=lambda: str(uuid4()))
    element_id: str = ""
    element_naam: str = ""
    profiel_naam: str = ""
    
    # Zones
    zones: List[SchoonmaakZone] = field(default_factory=list)
    
    # Samenvatting
    @property
    def totale_bewerking_tijd(self) -> float:
        """Totale bewerking tijd in minuten"""
        return sum(z.bewerking_tijd for z in self.zones)
    
    @property
    def totale_kosten(self) -> float:
        """Totale geschatte kosten"""
        # Arbeid: €75/uur
        arbeid = (self.totale_bewerking_tijd / 60) * 75
        materiaal = sum(z.materiaal_kosten for z in self.zones)
        return arbeid + materiaal
    
    @property
    def bewerkingen_per_type(self) -> Dict[BewerkingType, int]:
        """Aantal zones per bewerking type"""
        result = {}
        for z in self.zones:
            result[z.bewerking] = result.get(z.bewerking, 0) + 1
        return result
    
    @property
    def is_complex(self) -> bool:
        """Is dit een complex schoonmaakplan?"""
        return len(self.zones) > 5 or self.totale_bewerking_tijd > 120
    
    def naar_dict(self) -> dict:
        """Exporteer naar dictionary"""
        return {
            "id": self.id,
            "element": self.element_naam,
            "profiel": self.profiel_naam,
            "aantal_zones": len(self.zones),
            "totale_tijd_min": self.totale_bewerking_tijd,
            "totale_kosten": self.totale_kosten,
            "zones": [
                {
                    "type": z.type,
                    "bewerking": z.bewerking.value,
                    "urgentie": z.urgentie.value,
                    "tijd_min": z.bewerking_tijd,
                    "kleur": z.kleur
                }
                for z in self.zones
            ]
        }


class SchoonmaakAnalyse:
    """Analyseer geoogste balken en genereer schoonmaakplannen"""
    
    def __init__(self):
        # Tijd per type aangelast item (minuten)
        self.basis_tijd = {
            "schot": 15,
            "plaat": 12,
            "strip": 8,
            "voetplaat": 25,
            "kopplaat": 20,
            "bout_plaat": 10,
            "anker": 30,
            "stijver": 12,
            "ligger_aansluiting": 18,
        }
        
        # Bewerking per type
        self.bewerking_mapping = {
            "schot": BewerkingType.SNIJBRANDEN,
            "plaat": BewerkingType.SNIJBRANDEN,
            "strip": BewerkingType.SLIJPEN,
            "voetplaat": BewerkingType.SNIJBRANDEN,
            "kopplaat": BewerkingType.SNIJBRANDEN,
            "bout_plaat": BewerkingType.SNIJBRANDEN,
            "anker": BewerkingType.SNIJBRANDEN,
            "stijver": BewerkingType.SNIJBRANDEN,
            "ligger_aansluiting": BewerkingType.SNIJBRANDEN,
        }
        
        # Urgentie per type
        self.urgentie_mapping = {
            "schot": UrgentieNiveau.HOOG,
            "plaat": UrgentieNiveau.HOOG,
            "strip": UrgentieNiveau.MIDDEL,
            "voetplaat": UrgentieNiveau.KRITIEK,
            "kopplaat": UrgentieNiveau.KRITIEK,
            "bout_plaat": UrgentieNiveau.HOOG,
            "anker": UrgentieNiveau.KRITIEK,
            "stijver": UrgentieNiveau.HOOG,
            "ligger_aansluiting": UrgentieNiveau.HOOG,
        }
    
    def analyseer_element(self, element: StaalElement) -> SchoonmaakPlan:
        """Analyseer een element en genereer schoonmaakplan"""
        plan = SchoonmaakPlan(
            element_id=element.id,
            element_naam=element.naam,
            profiel_naam=element.profiel_naam
        )
        
        # Verwerk alle aangelaste items
        for item in element.aangelaste_items:
            zone = self._maak_zone_van_item(item)
            plan.zones.append(zone)
        
        # Voeg standaard zones toe
        # Las nabewerking op verbindingspunten
        if element.start_verbinding.value == "gelast":
            plan.zones.append(SchoonmaakZone(
                type="las_rest",
                beschrijving="Las resten bij startverbinding",
                bewerking=BewerkingType.SLIJPEN,
                urgentie=UrgentieNiveau.MIDDEL,
                positie_start=element.start_positie,
                lengte=50,
                breedte=element.profiel.afmetingen.breedte if element.profiel else 100,
                bewerking_tijd=10
            ))
        
        if element.eind_verbinding.value == "gelast":
            plan.zones.append(SchoonmaakZone(
                type="las_rest",
                beschrijving="Las resten bij eindverbinding",
                bewerking=BewerkingType.SLIJPEN,
                urgentie=UrgentieNiveau.MIDDEL,
                positie_start=element.eind_positie,
                lengte=50,
                breedte=element.profiel.afmetingen.breedte if element.profiel else 100,
                bewerking_tijd=10
            ))
        
        # Roest behandeling (standaard check)
        if element.conditie in ["matig", "slecht"]:
            plan.zones.append(SchoonmaakZone(
                type="roest",
                beschrijving="Roest behandeling volledig profiel",
                bewerking=BewerkingType.STRALEN,
                urgentie=UrgentieNiveau.MIDDEL,
                lengte=element.lengte,
                bewerking_tijd=element.lengte / 1000 * 5  # 5 min per meter
            ))
        
        return plan
    
    def _maak_zone_van_item(self, item: AangelastItem) -> SchoonmaakZone:
        """Converteer aangelast item naar schoonmaak zone"""
        return SchoonmaakZone(
            type=item.type,
            beschrijving=item.beschrijving,
            positie_start=item.positie,
            bewerking=self.bewerking_mapping.get(item.type, BewerkingType.SNIJBRANDEN),
            urgentie=self.urgentie_mapping.get(item.type, UrgentieNiveau.HOOG),
            lengte=item.afmetingen.get("L", 100),
            breedte=item.afmetingen.get("B", 100),
            diepte=item.afmetingen.get("H", 10),
            bewerking_tijd=self.basis_tijd.get(item.type, 15) * (1 + item.las_lengte / 1000),
            materiaal_kosten=2.5  # €2.50 per zone (slijpschijven, gas, etc.)
        )
    
    def genereer_visualisatie_data(
        self, 
        plan: SchoonmaakPlan
    ) -> Dict:
        """Genereer data voor 3D visualisatie met RODE zones"""
        zones_data = []
        
        for zone in plan.zones:
            zones_data.append({
                "id": zone.id,
                "type": zone.type,
                "kleur": zone.kleur,  # ROOD voor kritiek
                "positie": {
                    "x": zone.positie_start.x,
                    "y": zone.positie_start.y,
                    "z": zone.positie_start.z
                },
                "afmetingen": {
                    "lengte": zone.lengte,
                    "breedte": zone.breedte,
                    "diepte": zone.diepte
                },
                "bewerking": zone.bewerking.value,
                "urgentie": zone.urgentie.value
            })
        
        return {
            "element_id": plan.element_id,
            "element_naam": plan.element_naam,
            "profiel": plan.profiel_naam,
            "zones": zones_data,
            "legenda": {
                "#FF0000": "Kritiek - Moet verwijderd",
                "#FF6600": "Hoog - Sterk aanbevolen",
                "#FFCC00": "Middel - Optioneel",
                "#00CC00": "Laag - Cosmetisch"
            }
        }


def print_schoonmaakplan(plan: SchoonmaakPlan) -> None:
    """Print schoonmaakplan naar console"""
    print(f"\n{'='*60}")
    print(f"SCHOONMAAKPLAN: {plan.element_naam}")
    print(f"Profiel: {plan.profiel_naam}")
    print(f"{'='*60}")
    
    print(f"\nAantal zones: {len(plan.zones)}")
    print(f"Totale tijd: {plan.totale_bewerking_tijd:.0f} minuten")
    print(f"Geschatte kosten: €{plan.totale_kosten:.2f}")
    
    print("\nBewerkingen nodig:")
    for bew_type, aantal in plan.bewerkingen_per_type.items():
        print(f"  {bew_type.value}: {aantal}x")
    
    print(f"\n{'='*60}")
    print("ZONES (gesorteerd op urgentie)")
    print(f"{'='*60}")
    
    # Sorteer op urgentie
    sorted_zones = sorted(plan.zones, key=lambda z: z.urgentie.value)
    
    for zone in sorted_zones:
        urgentie_symbool = {
            "kritiek": "🔴",
            "hoog": "🟠", 
            "middel": "🟡",
            "laag": "🟢"
        }
        print(f"\n{urgentie_symbool.get(zone.urgentie.value, '⚪')} {zone.type.upper()}")
        print(f"   {zone.beschrijving}")
        print(f"   Bewerking: {zone.bewerking.value}")
        print(f"   Tijd: {zone.bewerking_tijd:.0f} min")
        print(f"   Afmetingen: {zone.lengte}x{zone.breedte}x{zone.diepte}mm")


if __name__ == "__main__":
    from modules.m02_gebouw_structuur.structuur import maak_voorbeeld_gebouw
    
    gebouw = maak_voorbeeld_gebouw()
    analyse = SchoonmaakAnalyse()
    
    print("SCHOONMAAK ANALYSE DEMO")
    print("="*60)
    
    # Analyseer eerste paar elementen
    for element in list(gebouw.elementen.values())[:3]:
        plan = analyse.analyseer_element(element)
        print_schoonmaakplan(plan)
        
        # Print visualisatie data
        vis_data = analyse.genereer_visualisatie_data(plan)
        print("\nVisualisatie data (JSON):")
        print(json.dumps(vis_data, indent=2))
