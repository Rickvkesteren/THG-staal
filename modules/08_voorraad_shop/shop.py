"""
Module 8: Voorraad & Shop

Inventaris management en webshop functionaliteit met CAD/BIM export.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict
from uuid import uuid4
from datetime import datetime, date
from enum import Enum
import json

import sys
sys.path.append("../..")
from modules.m04_originele_balken_db.voorraad import (
    VoorraadItem, VoorraadDatabase, VoorraadStatus
)


class OrderStatus(Enum):
    """Status van een order"""
    OFFERTE = "offerte"
    BESTELD = "besteld"
    IN_BEWERKING = "in_bewerking"
    KLAAR_VOOR_LEVERING = "klaar_voor_levering"
    VERZONDEN = "verzonden"
    GELEVERD = "geleverd"
    GEANNULEERD = "geannuleerd"


@dataclass
class Klant:
    """Klant informatie"""
    id: str = field(default_factory=lambda: str(uuid4()))
    bedrijfsnaam: str = ""
    contactpersoon: str = ""
    email: str = ""
    telefoon: str = ""
    adres: str = ""
    postcode: str = ""
    plaats: str = ""
    land: str = "Nederland"
    kvk_nummer: str = ""
    btw_nummer: str = ""


@dataclass
class OrderRegel:
    """Een regel in een order"""
    id: str = field(default_factory=lambda: str(uuid4()))
    voorraad_item_id: str = ""
    profiel_naam: str = ""
    lengte_mm: float = 0
    aantal: int = 1
    
    # Prijzen
    stuk_prijs: float = 0
    
    # CAD export opties
    include_cad: bool = False
    cad_formaat: str = "STEP"  # STEP, DXF, IFC
    
    @property
    def totaal_prijs(self) -> float:
        return self.stuk_prijs * self.aantal


@dataclass
class Order:
    """Een klant order"""
    id: str = field(default_factory=lambda: str(uuid4()))
    order_nummer: str = ""
    klant: Optional[Klant] = None
    
    # Regels
    regels: List[OrderRegel] = field(default_factory=list)
    
    # Status en data
    status: OrderStatus = OrderStatus.OFFERTE
    aangemaakt: datetime = field(default_factory=datetime.now)
    gewijzigd: datetime = field(default_factory=datetime.now)
    leverdatum: Optional[date] = None
    
    # Financieel
    korting_percentage: float = 0
    verzendkosten: float = 0
    btw_percentage: float = 21
    
    # Opmerkingen
    interne_notities: str = ""
    klant_opmerkingen: str = ""
    
    def __post_init__(self):
        if not self.order_nummer:
            self.order_nummer = f"ORD-{datetime.now().strftime('%Y%m%d')}-{self.id[:8].upper()}"
    
    @property
    def subtotaal(self) -> float:
        return sum(r.totaal_prijs for r in self.regels)
    
    @property
    def korting(self) -> float:
        return self.subtotaal * (self.korting_percentage / 100)
    
    @property
    def btw(self) -> float:
        return (self.subtotaal - self.korting + self.verzendkosten) * (self.btw_percentage / 100)
    
    @property
    def totaal(self) -> float:
        return self.subtotaal - self.korting + self.verzendkosten + self.btw
    
    def naar_dict(self) -> dict:
        return {
            "order_nummer": self.order_nummer,
            "klant": self.klant.bedrijfsnaam if self.klant else "",
            "status": self.status.value,
            "aangemaakt": self.aangemaakt.isoformat(),
            "regels": [
                {
                    "profiel": r.profiel_naam,
                    "lengte_mm": r.lengte_mm,
                    "aantal": r.aantal,
                    "stuk_prijs": r.stuk_prijs,
                    "totaal": r.totaal_prijs
                }
                for r in self.regels
            ],
            "subtotaal": self.subtotaal,
            "korting": self.korting,
            "verzendkosten": self.verzendkosten,
            "btw": self.btw,
            "totaal": self.totaal
        }


class ShopService:
    """Service voor webshop functionaliteit"""
    
    def __init__(self, voorraad: VoorraadDatabase):
        self.voorraad = voorraad
        self.orders: Dict[str, Order] = {}
        self.klanten: Dict[str, Klant] = {}
    
    def zoek_producten(
        self,
        profiel_naam: Optional[str] = None,
        min_lengte: Optional[float] = None,
        max_lengte: Optional[float] = None,
        alleen_geoogst: bool = False,
        alleen_gecertificeerd: bool = False
    ) -> List[VoorraadItem]:
        """Zoek producten voor webshop"""
        resultaten = []
        
        for item in self.voorraad.items.values():
            if item.status != VoorraadStatus.BESCHIKBAAR:
                continue
            
            if profiel_naam and item.profiel_naam != profiel_naam:
                continue
            
            if min_lengte and item.lengte_mm < min_lengte:
                continue
            
            if max_lengte and item.lengte_mm > max_lengte:
                continue
            
            if alleen_geoogst and not item.is_geoogst:
                continue
            
            if alleen_gecertificeerd and not item.sterkte_getest:
                continue
            
            resultaten.append(item)
        
        return sorted(resultaten, key=lambda x: (x.profiel_naam, x.lengte_mm))
    
    def maak_order(self, klant: Klant) -> Order:
        """Maak nieuwe order aan"""
        order = Order(klant=klant)
        self.orders[order.id] = order
        return order
    
    def voeg_toe_aan_order(
        self,
        order_id: str,
        voorraad_item_id: str,
        aantal: int = 1
    ) -> Optional[OrderRegel]:
        """Voeg item toe aan order"""
        order = self.orders.get(order_id)
        item = self.voorraad.items.get(voorraad_item_id)
        
        if not order or not item:
            return None
        
        regel = OrderRegel(
            voorraad_item_id=item.id,
            profiel_naam=item.profiel_naam,
            lengte_mm=item.lengte_mm,
            aantal=aantal,
            stuk_prijs=item.verkoop_prijs
        )
        
        order.regels.append(regel)
        order.gewijzigd = datetime.now()
        
        return regel
    
    def bevestig_order(self, order_id: str) -> bool:
        """Bevestig order en reserveer voorraad"""
        order = self.orders.get(order_id)
        if not order or order.status != OrderStatus.OFFERTE:
            return False
        
        # Reserveer voorraad items
        for regel in order.regels:
            item = self.voorraad.items.get(regel.voorraad_item_id)
            if item and item.status == VoorraadStatus.BESCHIKBAAR:
                item.status = VoorraadStatus.GERESERVEERD
        
        order.status = OrderStatus.BESTELD
        order.gewijzigd = datetime.now()
        return True
    
    def genereer_offerte_pdf(self, order_id: str) -> str:
        """Genereer offerte PDF (retourneert pad)"""
        order = self.orders.get(order_id)
        if not order:
            return ""
        
        # In echte implementatie: gebruik reportlab
        # Hier: return placeholder pad
        return f"/output/offertes/{order.order_nummer}.pdf"


class CADExporter:
    """Export staal producten naar CAD formaten"""
    
    def __init__(self):
        self.ondersteunde_formaten = ["STEP", "DXF", "IFC", "STL"]
    
    def genereer_step(self, item: VoorraadItem) -> str:
        """Genereer STEP bestand inhoud (placeholder)"""
        # In echte implementatie: gebruik pythonocc of FreeCAD
        step_content = f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Staal profiel {item.profiel_naam}'),'2;1');
FILE_NAME('{item.id}.step','2024-01-01',('Ontmantelingsplan'),(''),'',' ','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
/* Profiel: {item.profiel_naam} */
/* Lengte: {item.lengte_mm} mm */
/* Kwaliteit: {item.kwaliteit.value} */
/* Gegenereerd door Ontmantelingsplan Systeem */
ENDSEC;
END-ISO-10303-21;"""
        return step_content
    
    def genereer_dxf(self, item: VoorraadItem) -> str:
        """Genereer DXF bestand inhoud (placeholder)"""
        # In echte implementatie: gebruik ezdxf
        return f"DXF voor {item.profiel_naam} - {item.lengte_mm}mm"
    
    def genereer_ifc(self, item: VoorraadItem) -> str:
        """Genereer IFC bestand voor BIM (placeholder)"""
        # In echte implementatie: gebruik ifcopenshell
        return f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('IFC4'),'2;1');
FILE_NAME('{item.id}.ifc','2024-01-01',(''),(''),'IfcOpenShell','Ontmantelingsplan','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project1',$,'Geoogst Staal',$,$,$,$,$,#3);
#2=IFCBEAM('{item.id}',$,'{item.profiel_naam}',$,$,$,$,$,$);
/* Profiel: {item.profiel_naam} */
/* Lengte: {item.lengte_mm} mm */
/* Herkomst: {item.herkomst_gebouw or 'Nieuw'} */
ENDSEC;
END-ISO-10303-21;"""
    
    def exporteer(
        self, 
        item: VoorraadItem, 
        formaat: str,
        output_pad: str
    ) -> bool:
        """Exporteer naar CAD bestand"""
        if formaat.upper() not in self.ondersteunde_formaten:
            return False
        
        # Genereer content
        if formaat.upper() == "STEP":
            content = self.genereer_step(item)
        elif formaat.upper() == "DXF":
            content = self.genereer_dxf(item)
        elif formaat.upper() == "IFC":
            content = self.genereer_ifc(item)
        else:
            content = ""
        
        # Schrijf naar bestand
        try:
            with open(output_pad, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception:
            return False


def demo_shop():
    """Demo van shop functionaliteit"""
    from modules.m04_originele_balken_db.voorraad import maak_voorbeeld_voorraad
    
    # Setup
    voorraad = maak_voorbeeld_voorraad()
    shop = ShopService(voorraad)
    cad = CADExporter()
    
    print("WEBSHOP DEMO")
    print("="*60)
    
    # Zoek producten
    print("\nBeschikbare geoogste producten:")
    producten = shop.zoek_producten(alleen_geoogst=True)
    for p in producten:
        print(f"  {p.profiel_naam} - {p.lengte_mm}mm - €{p.verkoop_prijs:.2f}")
        print(f"    Herkomst: {p.herkomst_gebouw}")
    
    # Maak order
    klant = Klant(
        bedrijfsnaam="Bouwbedrijf Jansen",
        contactpersoon="Jan Jansen",
        email="jan@jansen-bouw.nl",
        telefoon="020-1234567",
        adres="Bouwstraat 123",
        postcode="1234 AB",
        plaats="Amsterdam"
    )
    
    order = shop.maak_order(klant)
    
    # Voeg producten toe
    for product in producten[:2]:
        shop.voeg_toe_aan_order(order.id, product.id)
    
    print(f"\n{'='*60}")
    print("ORDER OVERZICHT")
    print(f"{'='*60}")
    print(json.dumps(order.naar_dict(), indent=2, ensure_ascii=False))
    
    # CAD export demo
    print(f"\n{'='*60}")
    print("CAD EXPORT")
    print(f"{'='*60}")
    
    if producten:
        step_content = cad.genereer_step(producten[0])
        print(f"STEP export voor {producten[0].profiel_naam}:")
        print(step_content[:500])


if __name__ == "__main__":
    demo_shop()
