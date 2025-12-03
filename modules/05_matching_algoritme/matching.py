"""
Module 5: Matching Algoritme

Fit geoogste balken op vraag - Cutting Stock Problem Solver
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from uuid import uuid4
from enum import Enum

import sys
sys.path.append("../..")
from modules.m04_originele_balken_db.voorraad import VoorraadItem, VoorraadDatabase


class MatchStatus(Enum):
    """Status van een match"""
    PERFECT = "perfect"        # Exact of bijna exact passend
    GOED = "goed"              # Kleine aanpassing nodig
    MATIG = "matig"            # Significant afval
    GEEN = "geen"              # Geen match gevonden


@dataclass
class VraagItem:
    """Een gevraagde balk"""
    id: str = field(default_factory=lambda: str(uuid4()))
    profiel_naam: str = ""
    lengte_mm: float = 0
    aantal: int = 1
    
    # Toleranties
    lengte_tolerantie_plus: float = 100   # mm extra lengte toegestaan
    lengte_tolerantie_min: float = 0      # mm korter toegestaan
    
    # Optioneel: alternatieve profielen
    alternatieven: List[str] = field(default_factory=list)
    
    # Prioriteit
    prioriteit: int = 1  # 1 = hoogste


@dataclass
class MatchResultaat:
    """Resultaat van een match tussen vraag en aanbod"""
    vraag_id: str
    voorraad_id: Optional[str] = None
    
    # Status
    status: MatchStatus = MatchStatus.GEEN
    
    # Details
    gevraagd_profiel: str = ""
    gematcht_profiel: str = ""
    gevraagde_lengte: float = 0
    beschikbare_lengte: float = 0
    
    # Afval/efficiency
    restlengte: float = 0  # mm
    efficiency: float = 0  # % (100 = perfect)
    
    # Kosten
    geschatte_kosten: float = 0
    
    @property
    def is_gematcht(self) -> bool:
        return self.status != MatchStatus.GEEN


@dataclass
class CuttingPlan:
    """Plan voor het snijden van balken"""
    voorraad_id: str
    voorraad_profiel: str
    voorraad_lengte: float
    
    # Snijplan
    snedes: List[Tuple[float, str]]  # [(lengte, vraag_id), ...]
    rest_lengte: float
    
    # Efficiency
    benut_percentage: float
    
    def __str__(self) -> str:
        lines = [
            f"Balk: {self.voorraad_profiel} ({self.voorraad_lengte}mm)",
            "Snedes:"
        ]
        for lengte, vraag_id in self.snedes:
            lines.append(f"  - {lengte}mm (voor {vraag_id})")
        lines.append(f"Rest: {self.rest_lengte}mm ({100-self.benut_percentage:.1f}% afval)")
        return "\n".join(lines)


class MatchingAlgoritme:
    """
    Algoritme voor het matchen van geoogste balken met vraag.
    
    Implementeert een variant van het Cutting Stock Problem.
    """
    
    def __init__(
        self,
        zaagsnede_breedte: float = 5,  # mm verlies per zaagsnede
        minimum_restlengte: float = 500,  # mm - kleinere rest is afval
    ):
        self.zaagsnede = zaagsnede_breedte
        self.min_rest = minimum_restlengte
        
        # Profiel equivalenten (kan vervangen worden door)
        self.profiel_alternatieven = {
            "HEA 200": ["HEB 180", "IPE 240"],
            "HEB 200": ["HEA 220", "IPE 270"],
            "IPE 200": ["HEA 160"],
        }
    
    def vind_beste_match(
        self,
        vraag: VraagItem,
        voorraad: VoorraadDatabase,
        prefereer_geoogst: bool = True
    ) -> MatchResultaat:
        """
        Vind beste match voor een enkele vraag.
        """
        resultaat = MatchResultaat(
            vraag_id=vraag.id,
            gevraagd_profiel=vraag.profiel_naam,
            gevraagde_lengte=vraag.lengte_mm
        )
        
        # Zoek kandidaten
        profielen_te_zoeken = [vraag.profiel_naam] + vraag.alternatieven
        kandidaten = []
        
        for profiel in profielen_te_zoeken:
            items = voorraad.zoek_op_profiel(profiel)
            for item in items:
                # Check lengte
                min_nodig = vraag.lengte_mm - vraag.lengte_tolerantie_min
                max_nodig = vraag.lengte_mm + vraag.lengte_tolerantie_plus
                
                if item.lengte_mm >= min_nodig:
                    # Bereken efficiency
                    rest = item.lengte_mm - vraag.lengte_mm - self.zaagsnede
                    efficiency = (vraag.lengte_mm / item.lengte_mm) * 100
                    
                    kandidaten.append({
                        "item": item,
                        "rest": rest,
                        "efficiency": efficiency,
                        "is_exact_profiel": profiel == vraag.profiel_naam
                    })
        
        if not kandidaten:
            return resultaat
        
        # Sorteer kandidaten
        def score(k):
            s = 0
            # Prefereer exact profiel
            if k["is_exact_profiel"]:
                s += 100
            # Prefereer hoge efficiency
            s += k["efficiency"]
            # Prefereer geoogst (goedkoper)
            if prefereer_geoogst and k["item"].is_geoogst:
                s += 20
            # Straf voor te veel rest (afval)
            if k["rest"] < self.min_rest:
                s -= 10  # Te kleine rest is afval
            return s
        
        kandidaten.sort(key=score, reverse=True)
        beste = kandidaten[0]
        
        # Bepaal status
        if beste["efficiency"] >= 95:
            status = MatchStatus.PERFECT
        elif beste["efficiency"] >= 80:
            status = MatchStatus.GOED
        else:
            status = MatchStatus.MATIG
        
        resultaat.voorraad_id = beste["item"].id
        resultaat.status = status
        resultaat.gematcht_profiel = beste["item"].profiel_naam
        resultaat.beschikbare_lengte = beste["item"].lengte_mm
        resultaat.restlengte = beste["rest"]
        resultaat.efficiency = beste["efficiency"]
        resultaat.geschatte_kosten = beste["item"].verkoop_prijs * (vraag.lengte_mm / beste["item"].lengte_mm)
        
        return resultaat
    
    def optimaliseer_cutting(
        self,
        vragen: List[VraagItem],
        voorraad: VoorraadDatabase
    ) -> Tuple[List[MatchResultaat], List[CuttingPlan]]:
        """
        Optimaliseer snijplannen voor meerdere vragen.
        
        Gebruikt First Fit Decreasing heuristiek.
        """
        # Sorteer vragen op lengte (groot naar klein)
        gesorteerde_vragen = sorted(
            vragen, 
            key=lambda v: (v.profiel_naam, -v.lengte_mm)
        )
        
        resultaten = []
        cutting_plans = []
        gebruikte_voorraad = set()
        
        # Groepeer vragen per profiel
        per_profiel: Dict[str, List[VraagItem]] = {}
        for vraag in gesorteerde_vragen:
            if vraag.profiel_naam not in per_profiel:
                per_profiel[vraag.profiel_naam] = []
            for _ in range(vraag.aantal):
                per_profiel[vraag.profiel_naam].append(vraag)
        
        # Verwerk per profiel
        for profiel, profiel_vragen in per_profiel.items():
            # Haal beschikbare voorraad
            beschikbaar = [
                item for item in voorraad.zoek_op_profiel(profiel)
                if item.id not in gebruikte_voorraad
            ]
            # Sorteer voorraad op lengte (groot naar klein)
            beschikbaar.sort(key=lambda x: -x.lengte_mm)
            
            # Probeer vragen te fitten
            for vraag in profiel_vragen:
                match_gevonden = False
                
                for item in beschikbaar:
                    if item.id in gebruikte_voorraad:
                        continue
                    
                    rest = item.lengte_mm - vraag.lengte_mm - self.zaagsnede
                    
                    if rest >= -vraag.lengte_tolerantie_min:
                        # Match gevonden!
                        efficiency = (vraag.lengte_mm / item.lengte_mm) * 100
                        
                        resultaat = MatchResultaat(
                            vraag_id=vraag.id,
                            voorraad_id=item.id,
                            status=MatchStatus.GOED if efficiency >= 80 else MatchStatus.MATIG,
                            gevraagd_profiel=profiel,
                            gematcht_profiel=item.profiel_naam,
                            gevraagde_lengte=vraag.lengte_mm,
                            beschikbare_lengte=item.lengte_mm,
                            restlengte=max(0, rest),
                            efficiency=efficiency,
                            geschatte_kosten=item.verkoop_prijs * (vraag.lengte_mm / item.lengte_mm)
                        )
                        resultaten.append(resultaat)
                        
                        # Cutting plan
                        plan = CuttingPlan(
                            voorraad_id=item.id,
                            voorraad_profiel=item.profiel_naam,
                            voorraad_lengte=item.lengte_mm,
                            snedes=[(vraag.lengte_mm, vraag.id)],
                            rest_lengte=max(0, rest),
                            benut_percentage=efficiency
                        )
                        cutting_plans.append(plan)
                        
                        gebruikte_voorraad.add(item.id)
                        match_gevonden = True
                        break
                
                if not match_gevonden:
                    # Geen match
                    resultaten.append(MatchResultaat(
                        vraag_id=vraag.id,
                        status=MatchStatus.GEEN,
                        gevraagd_profiel=profiel,
                        gevraagde_lengte=vraag.lengte_mm
                    ))
        
        return resultaten, cutting_plans
    
    def bereken_totale_efficiency(
        self,
        resultaten: List[MatchResultaat]
    ) -> Dict[str, float]:
        """Bereken totale efficiency statistieken"""
        gematchte = [r for r in resultaten if r.is_gematcht]
        
        if not gematchte:
            return {
                "match_percentage": 0,
                "gemiddelde_efficiency": 0,
                "totaal_afval_mm": 0,
                "totale_kosten": 0
            }
        
        return {
            "match_percentage": len(gematchte) / len(resultaten) * 100,
            "gemiddelde_efficiency": sum(r.efficiency for r in gematchte) / len(gematchte),
            "totaal_afval_mm": sum(r.restlengte for r in gematchte),
            "totale_kosten": sum(r.geschatte_kosten for r in gematchte)
        }


def demo_matching():
    """Demo van matching algoritme"""
    from modules.m04_originele_balken_db.voorraad import maak_voorbeeld_voorraad
    
    # Maak voorraad
    voorraad = maak_voorbeeld_voorraad()
    
    # Maak vraag
    vragen = [
        VraagItem(profiel_naam="HEA 200", lengte_mm=5500, aantal=2),
        VraagItem(profiel_naam="HEA 300", lengte_mm=4000, aantal=1),
        VraagItem(profiel_naam="HEB 200", lengte_mm=3500, aantal=3),
        VraagItem(profiel_naam="IPE 200", lengte_mm=6000, aantal=1),
    ]
    
    # Match
    algo = MatchingAlgoritme()
    resultaten, plans = algo.optimaliseer_cutting(vragen, voorraad)
    
    # Print resultaten
    print("MATCHING RESULTATEN")
    print("="*60)
    
    for res in resultaten:
        if res.is_gematcht:
            print(f"\n✓ {res.gevraagd_profiel} {res.gevraagde_lengte}mm")
            print(f"  Gematcht met: {res.beschikbare_lengte}mm")
            print(f"  Efficiency: {res.efficiency:.1f}%")
            print(f"  Rest: {res.restlengte}mm")
            print(f"  Kosten: €{res.geschatte_kosten:.2f}")
        else:
            print(f"\n✗ {res.gevraagd_profiel} {res.gevraagde_lengte}mm - GEEN MATCH")
    
    # Statistieken
    stats = algo.bereken_totale_efficiency(resultaten)
    print("\n" + "="*60)
    print("STATISTIEKEN")
    print(f"Match percentage: {stats['match_percentage']:.1f}%")
    print(f"Gemiddelde efficiency: {stats['gemiddelde_efficiency']:.1f}%")
    print(f"Totaal afval: {stats['totaal_afval_mm']:.0f}mm")
    print(f"Totale kosten: €{stats['totale_kosten']:.2f}")


if __name__ == "__main__":
    demo_matching()
