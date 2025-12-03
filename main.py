"""
Ontmantelingsplan - Staal Hergebruik Systeem

Hoofdmodule die alle submodules verbindt.
"""

# Module imports
from modules.m01_profiel_bibliotheek import (
    ProfielType, StaalKwaliteit, StaalProfiel, PROFIEL_DATABASE
)
from modules.m02_gebouw_structuur import (
    ElementType, StaalElement, Gebouw, maak_voorbeeld_gebouw
)
from modules.m03_oogst_planning import (
    OogstPlanner, OogstPlan, print_oogstplan
)
from modules.m04_originele_balken_db import (
    VoorraadItem, VoorraadDatabase, maak_voorbeeld_voorraad
)
from modules.m05_matching_algoritme import (
    MatchingAlgoritme, VraagItem, demo_matching
)
from modules.m06_schoonmaak_analyse import (
    SchoonmaakAnalyse, print_schoonmaakplan
)
from modules.m07_robot_bewerkingen import (
    RobotPadGenerator, demo_robot_bewerkingen
)
from modules.m08_voorraad_shop import (
    ShopService, CADExporter, demo_shop
)
from modules.m09_certificering import (
    CertificeringsService, demo_certificering
)


def demo_volledig_systeem():
    """
    Demonstratie van het volledige systeem.
    
    Workflow:
    1. Definieer gebouw met staalstructuur
    2. Genereer oogstplan
    3. Analyseer schoonmaak per balk
    4. Genereer robot instructies
    5. Voeg toe aan voorraad
    6. Match met vraag
    7. Certificeer en verkoop
    """
    print("="*70)
    print("ONTMANTELINGSPLAN - VOLLEDIG SYSTEEM DEMO")
    print("="*70)
    
    # =========================================================
    # STAP 1: Gebouw definiëren
    # =========================================================
    print("\n[1] GEBOUW STRUCTUUR LADEN...")
    gebouw = maak_voorbeeld_gebouw()
    print(f"    Gebouw: {gebouw.naam}")
    print(f"    Totaal staal: {gebouw.totaal_gewicht:.0f} kg")
    print(f"    Elementen: {len(gebouw.elementen)}")
    
    # =========================================================
    # STAP 2: Oogstplan genereren
    # =========================================================
    print("\n[2] OOGSTPLAN GENEREREN...")
    planner = OogstPlanner()
    plan = planner.maak_oogstplan(gebouw)
    print(f"    Aantal stappen: {len(plan.stappen)}")
    print(f"    Geschatte tijd: {plan.totale_geschatte_tijd}")
    
    # =========================================================
    # STAP 3: Schoonmaak analyse per element
    # =========================================================
    print("\n[3] SCHOONMAAK ANALYSE...")
    analyse = SchoonmaakAnalyse()
    schoonmaak_plannen = {}
    
    totaal_schoonmaak_tijd = 0
    for element in gebouw.elementen.values():
        sp = analyse.analyseer_element(element)
        schoonmaak_plannen[element.id] = sp
        totaal_schoonmaak_tijd += sp.totale_bewerking_tijd
    
    print(f"    Geanalyseerd: {len(schoonmaak_plannen)} elementen")
    print(f"    Totale schoonmaaktijd: {totaal_schoonmaak_tijd:.0f} minuten")
    
    # =========================================================
    # STAP 4: Robot instructies genereren
    # =========================================================
    print("\n[4] ROBOT INSTRUCTIES GENEREREN...")
    robot_gen = RobotPadGenerator()
    
    totaal_instructies = 0
    for element_id, sp in schoonmaak_plannen.items():
        instructies = robot_gen.genereer_alle_instructies(sp)
        totaal_instructies += len(instructies)
    
    print(f"    Gegenereerd: {totaal_instructies} robot instructies")
    
    # =========================================================
    # STAP 5: Toevoegen aan voorraad
    # =========================================================
    print("\n[5] VOORRAAD BIJWERKEN...")
    voorraad = maak_voorbeeld_voorraad()
    
    # Voeg geoogste balken toe
    nieuw_toegevoegd = 0
    for element in gebouw.elementen.values():
        if plan.herbruikbaarheid[element.id].prioriteit.value <= 2:
            item = VoorraadItem(
                profiel_naam=element.profiel_naam,
                kwaliteit=element.kwaliteit,
                lengte_mm=element.lengte,
                is_geoogst=True,
                herkomst_gebouw=gebouw.naam,
                herkomst_adres=gebouw.adres,
                origineel_element_id=element.id
            )
            voorraad.voeg_toe(item)
            nieuw_toegevoegd += 1
    
    print(f"    Toegevoegd: {nieuw_toegevoegd} balken")
    print(f"    Totaal in voorraad: {len(voorraad.items)}")
    
    # =========================================================
    # STAP 6: Matching met vraag
    # =========================================================
    print("\n[6] MATCHING MET KLANTVRAAG...")
    
    vragen = [
        VraagItem(profiel_naam="HEA 200", lengte_mm=5000, aantal=2),
        VraagItem(profiel_naam="HEA 300", lengte_mm=5500, aantal=1),
        VraagItem(profiel_naam="HEB 200", lengte_mm=4000, aantal=2),
    ]
    
    algo = MatchingAlgoritme()
    resultaten, cutting_plans = algo.optimaliseer_cutting(vragen, voorraad)
    stats = algo.bereken_totale_efficiency(resultaten)
    
    print(f"    Match percentage: {stats['match_percentage']:.1f}%")
    print(f"    Gemiddelde efficiency: {stats['gemiddelde_efficiency']:.1f}%")
    
    # =========================================================
    # STAP 7: Certificering
    # =========================================================
    print("\n[7] CERTIFICERING...")
    cert_service = CertificeringsService()
    
    gecertificeerd = 0
    for item in voorraad.items.values():
        if item.is_geoogst:
            from modules.m09_certificering.certificering import HerkomstData
            herkomst = HerkomstData(
                gebouw_naam=item.herkomst_gebouw,
                gebouw_adres=item.herkomst_adres
            )
            cert = cert_service.maak_herkomst_certificaat(item, herkomst)
            gecertificeerd += 1
    
    print(f"    Gecertificeerd: {gecertificeerd} balken")
    
    # =========================================================
    # SAMENVATTING
    # =========================================================
    print("\n" + "="*70)
    print("SAMENVATTING")
    print("="*70)
    print(f"""
    📦 Gebouw:              {gebouw.naam}
    ⚖️  Totaal staal:        {gebouw.totaal_gewicht:.0f} kg
    📋 Oogstbare balken:    {nieuw_toegevoegd}
    🔧 Schoonmaaktijd:      {totaal_schoonmaak_tijd:.0f} minuten
    🤖 Robot instructies:   {totaal_instructies}
    📊 Match efficiency:    {stats['gemiddelde_efficiency']:.1f}%
    📜 Certificaten:        {gecertificeerd}
    """)
    print("="*70)


if __name__ == "__main__":
    demo_volledig_systeem()
