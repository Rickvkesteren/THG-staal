"""
Module 9: Certificering & Traceerbaarheid

Herkomst registratie, materiaal certificaten en rapportage generatie.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict
from uuid import uuid4
from datetime import datetime, date
from enum import Enum
import json
import hashlib

import sys
sys.path.append("../..")
from modules.m01_profiel_bibliotheek.profielen import StaalKwaliteit
from modules.m04_originele_balken_db.voorraad import VoorraadItem


class CertificaatType(Enum):
    """Type certificaat"""
    MATERIAAL_3_1 = "3.1"      # EN 10204 - Inspectie certificaat 3.1
    MATERIAAL_3_2 = "3.2"      # EN 10204 - Inspectie certificaat 3.2
    HERKOMST = "herkomst"       # Certificaat van herkomst
    STERKTE_TEST = "sterkte"    # Sterkte test rapport
    CIRCULAIR = "circulair"     # Circulair staal certificaat


class TestMethode(Enum):
    """Test methode voor materiaal"""
    TREKPROEF = "trekproef"         # Treksterkte bepaling
    HARDHEID = "hardheid"           # Hardheidstest
    SLAGPROEF = "slagproef"         # Charpy slagproef
    CHEMISCH = "chemisch"           # Chemische analyse
    VISUEEL = "visueel"             # Visuele inspectie
    ULTRASONISCH = "ultrasonisch"   # Ultrasone inspectie


@dataclass
class HerkomstData:
    """Herkomst informatie van een balk"""
    id: str = field(default_factory=lambda: str(uuid4()))
    
    # Oorspronkelijk gebouw
    gebouw_naam: str = ""
    gebouw_adres: str = ""
    gebouw_bouwjaar: Optional[int] = None
    gebouw_functie: str = ""  # "kantoor", "fabriek", "woning", etc.
    
    # Originele constructeur/leverancier
    originele_fabrikant: str = ""
    originele_certificaat: str = ""  # Ref naar origineel 3.1 certificaat
    smelt_nummer: str = ""  # Als bekend
    
    # Oogst informatie
    oogst_datum: Optional[date] = None
    oogst_bedrijf: str = ""
    oogst_project_nummer: str = ""
    
    # Positie in origineel gebouw
    originele_element_id: str = ""
    originele_functie: str = ""  # "hoofdkolom", "vloerligger", etc.
    
    # Foto's en documentatie
    foto_paden: List[str] = field(default_factory=list)
    document_paden: List[str] = field(default_factory=list)
    
    def volledigheid_score(self) -> float:
        """Score voor volledigheid van herkomstdata (0-100)"""
        velden = [
            self.gebouw_naam, self.gebouw_adres, 
            self.oogst_datum, self.oogst_bedrijf
        ]
        ingevuld = sum(1 for v in velden if v)
        return (ingevuld / len(velden)) * 100


@dataclass
class TestResultaat:
    """Resultaat van een materiaaltest"""
    id: str = field(default_factory=lambda: str(uuid4()))
    
    # Test info
    test_methode: TestMethode = TestMethode.VISUEEL
    test_datum: date = field(default_factory=date.today)
    test_laboratorium: str = ""
    test_nummer: str = ""
    
    # Resultaten
    resultaat_waarde: Optional[float] = None
    resultaat_eenheid: str = ""  # "N/mm²", "HV", "J", etc.
    resultaat_tekst: str = ""
    
    # Normen en limieten
    norm: str = ""  # bijv. "EN 10025"
    minimum_waarde: Optional[float] = None
    maximum_waarde: Optional[float] = None
    
    # Status
    goedgekeurd: bool = False
    opmerkingen: str = ""
    
    @property
    def is_binnen_spec(self) -> bool:
        """Check of resultaat binnen specificatie valt"""
        if self.resultaat_waarde is None:
            return False
        if self.minimum_waarde and self.resultaat_waarde < self.minimum_waarde:
            return False
        if self.maximum_waarde and self.resultaat_waarde > self.maximum_waarde:
            return False
        return True


@dataclass
class Certificaat:
    """Een certificaat voor een stalen balk"""
    id: str = field(default_factory=lambda: str(uuid4()))
    certificaat_nummer: str = ""
    type: CertificaatType = CertificaatType.HERKOMST
    
    # Gerelateerde balk
    voorraad_item_id: str = ""
    
    # Uitgever
    uitgegeven_door: str = ""
    uitgave_datum: date = field(default_factory=date.today)
    geldig_tot: Optional[date] = None
    
    # Materiaal specificaties
    staal_kwaliteit: StaalKwaliteit = StaalKwaliteit.S235
    profiel_naam: str = ""
    
    # Herkomst
    herkomst: Optional[HerkomstData] = None
    
    # Test resultaten
    test_resultaten: List[TestResultaat] = field(default_factory=list)
    
    # Digitale handtekening (hash)
    handtekening: str = ""
    
    def __post_init__(self):
        if not self.certificaat_nummer:
            datum = self.uitgave_datum.strftime("%Y%m%d")
            self.certificaat_nummer = f"CERT-{datum}-{self.id[:8].upper()}"
    
    def bereken_handtekening(self) -> str:
        """Bereken digitale handtekening/hash"""
        data = f"{self.certificaat_nummer}|{self.voorraad_item_id}|{self.staal_kwaliteit.value}"
        if self.herkomst:
            data += f"|{self.herkomst.gebouw_naam}|{self.herkomst.oogst_datum}"
        for test in self.test_resultaten:
            data += f"|{test.test_nummer}|{test.resultaat_waarde}"
        
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def valideer(self) -> bool:
        """Valideer certificaat integriteit"""
        return self.handtekening == self.bereken_handtekening()
    
    @property
    def is_volledig(self) -> bool:
        """Is certificaat compleet?"""
        if self.type == CertificaatType.HERKOMST:
            return self.herkomst is not None and self.herkomst.volledigheid_score() >= 75
        elif self.type == CertificaatType.STERKTE_TEST:
            return len(self.test_resultaten) > 0 and all(t.goedgekeurd for t in self.test_resultaten)
        return True
    
    def naar_dict(self) -> dict:
        """Exporteer naar dictionary"""
        result = {
            "certificaat_nummer": self.certificaat_nummer,
            "type": self.type.value,
            "uitgegeven_door": self.uitgegeven_door,
            "uitgave_datum": self.uitgave_datum.isoformat(),
            "staal_kwaliteit": self.staal_kwaliteit.value,
            "profiel": self.profiel_naam,
            "handtekening": self.handtekening,
            "is_geldig": self.valideer()
        }
        
        if self.herkomst:
            result["herkomst"] = {
                "gebouw": self.herkomst.gebouw_naam,
                "adres": self.herkomst.gebouw_adres,
                "bouwjaar": self.herkomst.gebouw_bouwjaar,
                "oogst_datum": self.herkomst.oogst_datum.isoformat() if self.herkomst.oogst_datum else None,
                "volledigheid": f"{self.herkomst.volledigheid_score():.0f}%"
            }
        
        if self.test_resultaten:
            result["test_resultaten"] = [
                {
                    "methode": t.test_methode.value,
                    "waarde": t.resultaat_waarde,
                    "eenheid": t.resultaat_eenheid,
                    "goedgekeurd": t.goedgekeurd
                }
                for t in self.test_resultaten
            ]
        
        return result


class CertificeringsService:
    """Service voor certificaat beheer en rapportage"""
    
    def __init__(self):
        self.certificaten: Dict[str, Certificaat] = {}
    
    def maak_herkomst_certificaat(
        self,
        item: VoorraadItem,
        herkomst: HerkomstData,
        uitgever: str = "Ontmantelingsplan BV"
    ) -> Certificaat:
        """Maak herkomst certificaat voor geoogste balk"""
        cert = Certificaat(
            type=CertificaatType.HERKOMST,
            voorraad_item_id=item.id,
            uitgegeven_door=uitgever,
            staal_kwaliteit=item.kwaliteit,
            profiel_naam=item.profiel_naam,
            herkomst=herkomst
        )
        
        # Bereken en sla handtekening op
        cert.handtekening = cert.bereken_handtekening()
        
        self.certificaten[cert.id] = cert
        return cert
    
    def maak_sterkte_certificaat(
        self,
        item: VoorraadItem,
        test_resultaten: List[TestResultaat],
        uitgever: str = "Materiaal Test Lab"
    ) -> Certificaat:
        """Maak sterkte test certificaat"""
        cert = Certificaat(
            type=CertificaatType.STERKTE_TEST,
            voorraad_item_id=item.id,
            uitgegeven_door=uitgever,
            staal_kwaliteit=item.kwaliteit,
            profiel_naam=item.profiel_naam,
            test_resultaten=test_resultaten
        )
        
        cert.handtekening = cert.bereken_handtekening()
        
        self.certificaten[cert.id] = cert
        return cert
    
    def maak_circulair_certificaat(
        self,
        item: VoorraadItem,
        herkomst_cert: Certificaat,
        sterkte_cert: Optional[Certificaat] = None,
        uitgever: str = "Circulair Staal Keurmerk"
    ) -> Certificaat:
        """Maak circulair staal certificaat (combineert herkomst + test)"""
        cert = Certificaat(
            type=CertificaatType.CIRCULAIR,
            voorraad_item_id=item.id,
            uitgegeven_door=uitgever,
            staal_kwaliteit=item.kwaliteit,
            profiel_naam=item.profiel_naam,
            herkomst=herkomst_cert.herkomst
        )
        
        if sterkte_cert:
            cert.test_resultaten = sterkte_cert.test_resultaten
        
        cert.handtekening = cert.bereken_handtekening()
        
        self.certificaten[cert.id] = cert
        return cert
    
    def genereer_rapport(
        self,
        item: VoorraadItem,
        certificaten: List[Certificaat]
    ) -> str:
        """Genereer compleet rapport voor een balk"""
        rapport = []
        rapport.append("="*70)
        rapport.append("MATERIAAL CERTIFICAAT RAPPORT")
        rapport.append("="*70)
        rapport.append("")
        rapport.append(f"Datum: {datetime.now().strftime('%d-%m-%Y %H:%M')}")
        rapport.append("")
        
        # Product informatie
        rapport.append("-"*70)
        rapport.append("PRODUCT INFORMATIE")
        rapport.append("-"*70)
        rapport.append(f"Profiel:        {item.profiel_naam}")
        rapport.append(f"Lengte:         {item.lengte_mm} mm")
        rapport.append(f"Gewicht:        {item.gewicht_kg:.1f} kg")
        rapport.append(f"Staal kwaliteit: {item.kwaliteit.value}")
        rapport.append(f"Product ID:     {item.id}")
        rapport.append("")
        
        # Certificaten
        for cert in certificaten:
            rapport.append("-"*70)
            rapport.append(f"CERTIFICAAT: {cert.type.value.upper()}")
            rapport.append("-"*70)
            rapport.append(f"Certificaat nr: {cert.certificaat_nummer}")
            rapport.append(f"Uitgegeven door: {cert.uitgegeven_door}")
            rapport.append(f"Datum:          {cert.uitgave_datum}")
            rapport.append(f"Digitale hash:  {cert.handtekening}")
            rapport.append(f"Geldig:         {'✓ JA' if cert.valideer() else '✗ NEE'}")
            
            if cert.herkomst:
                rapport.append("")
                rapport.append("Herkomst:")
                rapport.append(f"  Gebouw:      {cert.herkomst.gebouw_naam}")
                rapport.append(f"  Adres:       {cert.herkomst.gebouw_adres}")
                rapport.append(f"  Bouwjaar:    {cert.herkomst.gebouw_bouwjaar or 'Onbekend'}")
                rapport.append(f"  Oogst datum: {cert.herkomst.oogst_datum}")
                rapport.append(f"  Oogst door:  {cert.herkomst.oogst_bedrijf}")
            
            if cert.test_resultaten:
                rapport.append("")
                rapport.append("Test resultaten:")
                for test in cert.test_resultaten:
                    status = "✓" if test.goedgekeurd else "✗"
                    rapport.append(f"  {status} {test.test_methode.value}: {test.resultaat_waarde} {test.resultaat_eenheid}")
            
            rapport.append("")
        
        rapport.append("="*70)
        rapport.append("EINDE RAPPORT")
        rapport.append("="*70)
        
        return "\n".join(rapport)
    
    def exporteer_naar_json(self, output_pad: str) -> None:
        """Exporteer alle certificaten naar JSON"""
        data = {
            "export_datum": datetime.now().isoformat(),
            "aantal_certificaten": len(self.certificaten),
            "certificaten": [
                cert.naar_dict() for cert in self.certificaten.values()
            ]
        }
        
        with open(output_pad, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def demo_certificering():
    """Demo van certificering systeem"""
    from modules.m04_originele_balken_db.voorraad import maak_voorbeeld_voorraad
    
    # Setup
    voorraad = maak_voorbeeld_voorraad()
    service = CertificeringsService()
    
    print("CERTIFICERING DEMO")
    print("="*60)
    
    # Pak een geoogst item
    geoogst_item = None
    for item in voorraad.items.values():
        if item.is_geoogst:
            geoogst_item = item
            break
    
    if not geoogst_item:
        print("Geen geoogst staal gevonden")
        return
    
    print(f"\nProduct: {geoogst_item.profiel_naam} - {geoogst_item.lengte_mm}mm")
    
    # Maak herkomst data
    herkomst = HerkomstData(
        gebouw_naam=geoogst_item.herkomst_gebouw,
        gebouw_adres=geoogst_item.herkomst_adres,
        gebouw_bouwjaar=1985,
        gebouw_functie="Industrieel",
        oogst_datum=geoogst_item.oogst_datum,
        oogst_bedrijf="Demontage Pro BV",
        oogst_project_nummer="PRJ-2024-001"
    )
    
    # Maak herkomst certificaat
    herkomst_cert = service.maak_herkomst_certificaat(
        geoogst_item, herkomst
    )
    
    print(f"\nHerkomst certificaat: {herkomst_cert.certificaat_nummer}")
    
    # Maak test resultaten
    test_resultaten = [
        TestResultaat(
            test_methode=TestMethode.TREKPROEF,
            test_laboratorium="Staal Test Lab BV",
            test_nummer="TL-2024-5678",
            resultaat_waarde=268,
            resultaat_eenheid="N/mm²",
            minimum_waarde=235,
            norm="EN 10025-2",
            goedgekeurd=True
        ),
        TestResultaat(
            test_methode=TestMethode.HARDHEID,
            test_laboratorium="Staal Test Lab BV",
            test_nummer="TL-2024-5679",
            resultaat_waarde=145,
            resultaat_eenheid="HV",
            goedgekeurd=True
        )
    ]
    
    # Maak sterkte certificaat
    sterkte_cert = service.maak_sterkte_certificaat(
        geoogst_item, test_resultaten
    )
    
    print(f"Sterkte certificaat: {sterkte_cert.certificaat_nummer}")
    
    # Maak circulair certificaat
    circulair_cert = service.maak_circulair_certificaat(
        geoogst_item, herkomst_cert, sterkte_cert
    )
    
    print(f"Circulair certificaat: {circulair_cert.certificaat_nummer}")
    
    # Genereer rapport
    print("\n" + "="*60)
    rapport = service.genereer_rapport(
        geoogst_item,
        [herkomst_cert, sterkte_cert, circulair_cert]
    )
    print(rapport)


if __name__ == "__main__":
    demo_certificering()
