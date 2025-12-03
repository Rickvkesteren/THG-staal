"""
Module 4: Originele Balken Database

Database van nieuw/origineel staal voor matching met geoogste balken.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict
from uuid import uuid4
from datetime import date
from enum import Enum
import json

import sys
sys.path.append("../..")
from modules.m01_profiel_bibliotheek.profielen import (
    StaalProfiel, ProfielType, StaalKwaliteit, PROFIEL_DATABASE
)


class VoorraadStatus(Enum):
    """Status van voorraad item"""
    BESCHIKBAAR = "beschikbaar"
    GERESERVEERD = "gereserveerd"
    VERKOCHT = "verkocht"
    IN_BEWERKING = "in_bewerking"


@dataclass
class VoorraadItem:
    """Een stalen balk in voorraad"""
    id: str = field(default_factory=lambda: str(uuid4()))
    
    # Profiel info
    profiel_naam: str = ""  # bijv. "HEA 200"
    profiel: Optional[StaalProfiel] = None
    kwaliteit: StaalKwaliteit = StaalKwaliteit.S235
    
    # Afmetingen
    lengte_mm: float = 0
    
    # Oorsprong
    is_geoogst: bool = False
    herkomst_gebouw: str = ""
    herkomst_adres: str = ""
    oogst_datum: Optional[date] = None
    origineel_element_id: str = ""
    
    # Certificering
    materiaal_certificaat: str = ""  # pad naar certificaat
    sterkte_getest: bool = False
    test_resultaat: Optional[float] = None  # N/mm²
    
    # Status
    status: VoorraadStatus = VoorraadStatus.BESCHIKBAAR
    locatie: str = ""  # opslaglocatie
    
    # Prijzen
    inkoop_prijs: float = 0  # €
    verkoop_prijs: float = 0  # €
    
    # Metadata
    toegevoegd_op: date = field(default_factory=date.today)
    opmerkingen: str = ""
    
    def __post_init__(self):
        if not self.profiel and self.profiel_naam:
            self.profiel = PROFIEL_DATABASE.get(self.profiel_naam)
    
    @property
    def gewicht_kg(self) -> float:
        """Gewicht in kg"""
        if self.profiel:
            return self.profiel.afmetingen.gewicht_per_m * (self.lengte_mm / 1000)
        return 0
    
    @property
    def prijs_per_kg(self) -> float:
        """Verkoop prijs per kg"""
        if self.gewicht_kg > 0:
            return self.verkoop_prijs / self.gewicht_kg
        return 0


@dataclass
class VoorraadDatabase:
    """Database van beschikbare stalen balken"""
    items: Dict[str, VoorraadItem] = field(default_factory=dict)
    
    def voeg_toe(self, item: VoorraadItem) -> None:
        """Voeg item toe aan voorraad"""
        self.items[item.id] = item
    
    def verwijder(self, item_id: str) -> Optional[VoorraadItem]:
        """Verwijder item uit voorraad"""
        return self.items.pop(item_id, None)
    
    def zoek_op_profiel(
        self, 
        profiel_naam: str,
        alleen_beschikbaar: bool = True
    ) -> List[VoorraadItem]:
        """Zoek items op profiel naam"""
        resultaten = [
            item for item in self.items.values()
            if item.profiel_naam == profiel_naam
        ]
        if alleen_beschikbaar:
            resultaten = [
                item for item in resultaten 
                if item.status == VoorraadStatus.BESCHIKBAAR
            ]
        return resultaten
    
    def zoek_op_lengte(
        self,
        min_lengte: float,
        max_lengte: Optional[float] = None,
        profiel_naam: Optional[str] = None
    ) -> List[VoorraadItem]:
        """Zoek items op lengte (en optioneel profiel)"""
        resultaten = []
        for item in self.items.values():
            if item.status != VoorraadStatus.BESCHIKBAAR:
                continue
            if item.lengte_mm < min_lengte:
                continue
            if max_lengte and item.lengte_mm > max_lengte:
                continue
            if profiel_naam and item.profiel_naam != profiel_naam:
                continue
            resultaten.append(item)
        return resultaten
    
    def zoek_gecertificeerd(self) -> List[VoorraadItem]:
        """Zoek alleen gecertificeerde items"""
        return [
            item for item in self.items.values()
            if item.sterkte_getest and item.materiaal_certificaat
        ]
    
    def totaal_voorraad(self) -> Dict[str, float]:
        """Totaal gewicht per profiel type"""
        totalen = {}
        for item in self.items.values():
            if item.status == VoorraadStatus.BESCHIKBAAR:
                key = item.profiel_naam
                totalen[key] = totalen.get(key, 0) + item.gewicht_kg
        return totalen
    
    def naar_json(self, pad: str) -> None:
        """Exporteer naar JSON"""
        data = {
            "voorraad": [
                {
                    "id": item.id,
                    "profiel": item.profiel_naam,
                    "kwaliteit": item.kwaliteit.value,
                    "lengte_mm": item.lengte_mm,
                    "gewicht_kg": item.gewicht_kg,
                    "is_geoogst": item.is_geoogst,
                    "herkomst": item.herkomst_gebouw,
                    "status": item.status.value,
                    "verkoop_prijs": item.verkoop_prijs,
                    "gecertificeerd": item.sterkte_getest
                }
                for item in self.items.values()
            ],
            "totalen": self.totaal_voorraad()
        }
        with open(pad, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    @classmethod
    def van_json(cls, pad: str) -> 'VoorraadDatabase':
        """Laad van JSON"""
        with open(pad, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        db = cls()
        for item_data in data.get("voorraad", []):
            item = VoorraadItem(
                id=item_data["id"],
                profiel_naam=item_data["profiel"],
                kwaliteit=StaalKwaliteit(item_data["kwaliteit"]),
                lengte_mm=item_data["lengte_mm"],
                is_geoogst=item_data.get("is_geoogst", False),
                herkomst_gebouw=item_data.get("herkomst", ""),
                status=VoorraadStatus(item_data["status"]),
                verkoop_prijs=item_data.get("verkoop_prijs", 0),
                sterkte_getest=item_data.get("gecertificeerd", False)
            )
            db.voeg_toe(item)
        return db


def maak_voorbeeld_voorraad() -> VoorraadDatabase:
    """Maak voorbeeld voorraad database"""
    db = VoorraadDatabase()
    
    # Nieuw staal
    for profiel in ["HEA 200", "HEA 300", "HEB 200", "IPE 200"]:
        for lengte in [6000, 8000, 12000]:
            item = VoorraadItem(
                profiel_naam=profiel,
                kwaliteit=StaalKwaliteit.S355,
                lengte_mm=lengte,
                is_geoogst=False,
                status=VoorraadStatus.BESCHIKBAAR,
                locatie="Hal A",
                verkoop_prijs=lengte / 1000 * 50  # €50 per meter
            )
            db.voeg_toe(item)
    
    # Geoogst staal
    geoogst_items = [
        ("HEA 200", 5800, "Oude Fabriek", "Industrieweg 10"),
        ("HEA 300", 5950, "Oude Fabriek", "Industrieweg 10"),
        ("HEB 200", 4500, "Kantoor Noord", "Businesspark 5"),
        ("IPE 300", 7200, "Oude Fabriek", "Industrieweg 10"),
    ]
    
    for profiel, lengte, gebouw, adres in geoogst_items:
        item = VoorraadItem(
            profiel_naam=profiel,
            kwaliteit=StaalKwaliteit.S235,
            lengte_mm=lengte,
            is_geoogst=True,
            herkomst_gebouw=gebouw,
            herkomst_adres=adres,
            oogst_datum=date(2024, 10, 15),
            sterkte_getest=True,
            test_resultaat=260,  # N/mm²
            status=VoorraadStatus.BESCHIKBAAR,
            locatie="Hal B - Geoogst",
            verkoop_prijs=lengte / 1000 * 35  # €35 per meter (goedkoper)
        )
        db.voeg_toe(item)
    
    return db


if __name__ == "__main__":
    db = maak_voorbeeld_voorraad()
    
    print("Voorraad overzicht:")
    print("="*50)
    
    for profiel, gewicht in sorted(db.totaal_voorraad().items()):
        print(f"  {profiel}: {gewicht:.0f} kg")
    
    print("\nGeoogst staal:")
    print("="*50)
    for item in db.items.values():
        if item.is_geoogst:
            print(f"  {item.profiel_naam} {item.lengte_mm}mm")
            print(f"    Herkomst: {item.herkomst_gebouw}")
            print(f"    Prijs: €{item.verkoop_prijs:.2f} (€{item.prijs_per_kg:.2f}/kg)")
