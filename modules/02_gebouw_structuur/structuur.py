"""
Module 2: Gebouw Structuur & BIM

Definieert staalstructuren met balken, kolommen en verbindingen.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Tuple
from uuid import uuid4
from datetime import date
import json

import sys
sys.path.append("../..")
from modules.m01_profiel_bibliotheek.profielen import (
    StaalProfiel, ProfielType, StaalKwaliteit, zoek_profiel
)


class ElementType(Enum):
    """Type constructie element"""
    BALK = "balk"              # Horizontaal dragend
    KOLOM = "kolom"            # Verticaal dragend
    LIGGER = "ligger"          # Secundaire balk
    WINDVERBAND = "windverband"
    VLOERLIGGER = "vloerligger"


class VerbindingType(Enum):
    """Type verbinding tussen elementen"""
    GELAST = "gelast"
    GEBOUT = "gebout"
    MOMENTVAST = "momentvast"
    SCHARNIER = "scharnier"


@dataclass
class Positie3D:
    """3D positie in mm"""
    x: float = 0
    y: float = 0
    z: float = 0
    
    def naar_tuple(self) -> Tuple[float, float, float]:
        return (self.x, self.y, self.z)
    
    def afstand_naar(self, andere: 'Positie3D') -> float:
        return ((self.x - andere.x)**2 + 
                (self.y - andere.y)**2 + 
                (self.z - andere.z)**2) ** 0.5


@dataclass
class AangelastItem:
    """Een item dat aan een balk is gelast"""
    id: str = field(default_factory=lambda: str(uuid4()))
    type: str = ""  # "schot", "plaat", "strip", "bout_plaat", "anker"
    beschrijving: str = ""
    positie: Positie3D = field(default_factory=Positie3D)
    afmetingen: Dict[str, float] = field(default_factory=dict)  # LxBxH in mm
    gewicht: float = 0  # kg
    las_lengte: float = 0  # mm - totale laslengte
    verwijder_tijd: float = 0  # minuten geschatte tijd om te verwijderen


@dataclass
class StaalElement:
    """Een stalen constructie-element (balk, kolom, etc.)"""
    id: str = field(default_factory=lambda: str(uuid4()))
    naam: str = ""
    type: ElementType = ElementType.BALK
    profiel: Optional[StaalProfiel] = None
    profiel_naam: str = ""  # bijv. "HEA 200"
    kwaliteit: StaalKwaliteit = StaalKwaliteit.S235
    
    # Geometrie
    start_positie: Positie3D = field(default_factory=Positie3D)
    eind_positie: Positie3D = field(default_factory=Positie3D)
    lengte: float = 0  # mm
    rotatie: float = 0  # graden rotatie om lengte-as
    
    # Verbindingen
    start_verbinding: VerbindingType = VerbindingType.GEBOUT
    eind_verbinding: VerbindingType = VerbindingType.GEBOUT
    
    # Aangelaste items
    aangelaste_items: List[AangelastItem] = field(default_factory=list)
    
    # Status
    conditie: str = "onbekend"  # "goed", "matig", "slecht"
    opmerkingen: str = ""
    
    def __post_init__(self):
        if not self.lengte and self.start_positie and self.eind_positie:
            self.lengte = self.start_positie.afstand_naar(self.eind_positie)
        if not self.profiel and self.profiel_naam:
            self.profiel = zoek_profiel(self.profiel_naam)
    
    @property
    def gewicht(self) -> float:
        """Totaal gewicht inclusief aangelaste items (kg)"""
        basis = 0
        if self.profiel:
            basis = self.profiel.afmetingen.gewicht_per_m * (self.lengte / 1000)
        extra = sum(item.gewicht for item in self.aangelaste_items)
        return basis + extra
    
    @property
    def schoon_gewicht(self) -> float:
        """Gewicht van alleen het basisprofiel (kg)"""
        if self.profiel:
            return self.profiel.afmetingen.gewicht_per_m * (self.lengte / 1000)
        return 0
    
    @property
    def totale_verwijder_tijd(self) -> float:
        """Geschatte tijd om alle aangelaste items te verwijderen (minuten)"""
        return sum(item.verwijder_tijd for item in self.aangelaste_items)


@dataclass
class Verbinding:
    """Verbinding tussen twee elementen"""
    id: str = field(default_factory=lambda: str(uuid4()))
    element1_id: str = ""
    element2_id: str = ""
    type: VerbindingType = VerbindingType.GEBOUT
    positie: Positie3D = field(default_factory=Positie3D)
    
    # Details
    aantal_bouten: int = 0
    bout_diameter: float = 0  # mm
    las_lengte: float = 0  # mm
    
    # Demontage info
    demontage_tijd: float = 0  # minuten
    demontage_methode: str = ""  # "losschroeven", "snijden", "slijpen"


@dataclass
class Gebouw:
    """Complete gebouwstructuur"""
    id: str = field(default_factory=lambda: str(uuid4()))
    naam: str = ""
    adres: str = ""
    bouwjaar: Optional[int] = None
    
    # Structuur
    elementen: Dict[str, StaalElement] = field(default_factory=dict)
    verbindingen: List[Verbinding] = field(default_factory=list)
    
    # Metadata
    ontwerp_levensduur: int = 50  # jaar
    laatst_geinspecteerd: Optional[date] = None
    documentatie: List[str] = field(default_factory=list)  # paden naar docs
    
    def voeg_element_toe(self, element: StaalElement) -> None:
        """Voeg een staal element toe aan het gebouw"""
        self.elementen[element.id] = element
    
    def voeg_verbinding_toe(self, verbinding: Verbinding) -> None:
        """Voeg een verbinding toe"""
        self.verbindingen.append(verbinding)
    
    def get_element(self, element_id: str) -> Optional[StaalElement]:
        """Haal element op met ID"""
        return self.elementen.get(element_id)
    
    def get_balken(self) -> List[StaalElement]:
        """Alle horizontale elementen"""
        return [e for e in self.elementen.values() 
                if e.type in [ElementType.BALK, ElementType.LIGGER, ElementType.VLOERLIGGER]]
    
    def get_kolommen(self) -> List[StaalElement]:
        """Alle verticale elementen"""
        return [e for e in self.elementen.values() if e.type == ElementType.KOLOM]
    
    @property
    def totaal_gewicht(self) -> float:
        """Totaal gewicht van alle staal (kg)"""
        return sum(e.gewicht for e in self.elementen.values())
    
    @property
    def totaal_schoon_gewicht(self) -> float:
        """Gewicht van alleen basisprofielen (kg)"""
        return sum(e.schoon_gewicht for e in self.elementen.values())
    
    def naar_dict(self) -> dict:
        """Exporteer naar dictionary (voor JSON)"""
        return {
            "id": self.id,
            "naam": self.naam,
            "adres": self.adres,
            "bouwjaar": self.bouwjaar,
            "totaal_gewicht_kg": self.totaal_gewicht,
            "aantal_elementen": len(self.elementen),
            "elementen": [
                {
                    "id": e.id,
                    "naam": e.naam,
                    "type": e.type.value,
                    "profiel": e.profiel_naam,
                    "lengte_mm": e.lengte,
                    "gewicht_kg": e.gewicht,
                    "aantal_aangelast": len(e.aangelaste_items)
                }
                for e in self.elementen.values()
            ]
        }
    
    def naar_json(self, pad: str) -> None:
        """Exporteer naar JSON bestand"""
        with open(pad, 'w', encoding='utf-8') as f:
            json.dump(self.naar_dict(), f, indent=2, ensure_ascii=False)


def maak_voorbeeld_gebouw() -> Gebouw:
    """Maak een voorbeeld gebouwstructuur"""
    gebouw = Gebouw(
        naam="Voorbeeld Fabriekshal",
        adres="Industrieweg 1, Amsterdam",
        bouwjaar=1985
    )
    
    # Kolommen
    for i in range(4):
        for j in range(3):
            kolom = StaalElement(
                naam=f"K{i+1}{j+1}",
                type=ElementType.KOLOM,
                profiel_naam="HEB 200",
                kwaliteit=StaalKwaliteit.S355,
                start_positie=Positie3D(i * 6000, j * 8000, 0),
                eind_positie=Positie3D(i * 6000, j * 8000, 6000),
                lengte=6000
            )
            # Voetplaat
            kolom.aangelaste_items.append(AangelastItem(
                type="voetplaat",
                beschrijving="Voetplaat 300x300x20",
                afmetingen={"L": 300, "B": 300, "H": 20},
                gewicht=14.1,
                las_lengte=800,
                verwijder_tijd=15
            ))
            # Kopplaat
            kolom.aangelaste_items.append(AangelastItem(
                type="kopplaat",
                beschrijving="Kopplaat 200x200x15",
                afmetingen={"L": 200, "B": 200, "H": 15},
                gewicht=4.7,
                las_lengte=400,
                verwijder_tijd=10
            ))
            gebouw.voeg_element_toe(kolom)
    
    # Hoofdliggers
    for j in range(3):
        for i in range(3):
            balk = StaalElement(
                naam=f"HB{i+1}{j+1}",
                type=ElementType.BALK,
                profiel_naam="HEA 300",
                kwaliteit=StaalKwaliteit.S355,
                start_positie=Positie3D(i * 6000, j * 8000, 6000),
                eind_positie=Positie3D((i+1) * 6000, j * 8000, 6000),
                lengte=6000
            )
            # Verstijvingsschotten
            for k in range(2):
                balk.aangelaste_items.append(AangelastItem(
                    type="schot",
                    beschrijving=f"Verstijvingsschot {k+1}",
                    afmetingen={"L": 280, "B": 280, "H": 10},
                    gewicht=6.2,
                    las_lengte=1000,
                    verwijder_tijd=12
                ))
            gebouw.voeg_element_toe(balk)
    
    return gebouw


if __name__ == "__main__":
    gebouw = maak_voorbeeld_gebouw()
    print(f"Gebouw: {gebouw.naam}")
    print(f"Totaal gewicht: {gebouw.totaal_gewicht:.0f} kg")
    print(f"Schoon gewicht: {gebouw.totaal_schoon_gewicht:.0f} kg")
    print(f"Aantal elementen: {len(gebouw.elementen)}")
    
    print("\nElementen met meeste aangelaste items:")
    for e in sorted(gebouw.elementen.values(), 
                   key=lambda x: len(x.aangelaste_items), 
                   reverse=True)[:5]:
        print(f"  {e.naam}: {len(e.aangelaste_items)} items, "
              f"{e.totale_verwijder_tijd:.0f} min verwijdertijd")
