"""
Module 1: Staal Profiel Bibliotheek

Bevat alle standaard staalprofielen met hun eigenschappen.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict
from uuid import uuid4


class ProfielType(Enum):
    """Standaard Europese staalprofielen"""
    HEA = "HEA"  # Europese brede flens balken (licht)
    HEB = "HEB"  # Europese brede flens balken (normaal)
    HEM = "HEM"  # Europese brede flens balken (zwaar)
    IPE = "IPE"  # Europese I-profielen
    IPN = "IPN"  # Standaard I-profielen
    UNP = "UNP"  # U-profielen (kanaalstaal)
    UPE = "UPE"  # Europese U-profielen
    L = "L"      # Hoekprofielen
    T = "T"      # T-profielen
    RHS = "RHS"  # Rechthoekige kokers
    SHS = "SHS"  # Vierkante kokers
    CHS = "CHS"  # Ronde kokers


class StaalKwaliteit(Enum):
    """Staal sterkteklassen volgens EN 10025"""
    S235 = "S235"    # 235 N/mm² vloeigrens
    S275 = "S275"    # 275 N/mm² vloeigrens
    S355 = "S355"    # 355 N/mm² vloeigrens
    S420 = "S420"    # 420 N/mm² vloeigrens
    S460 = "S460"    # 460 N/mm² vloeigrens


@dataclass
class ProfielAfmetingen:
    """Afmetingen van een staalprofiel in mm"""
    hoogte: float          # h - totale hoogte
    breedte: float         # b - flens breedte
    lijf_dikte: float      # tw - lijf dikte
    flens_dikte: float     # tf - flens dikte
    radius: float = 0      # r - hoekradius
    
    # Berekende eigenschappen
    oppervlakte: float = 0     # A - doorsnede oppervlak (mm²)
    gewicht_per_m: float = 0   # kg/m
    
    # Traagheidsmomenten
    Iy: float = 0  # mm⁴ - sterk as
    Iz: float = 0  # mm⁴ - zwak as
    
    # Weerstandsmomenten
    Wy: float = 0  # mm³
    Wz: float = 0  # mm³


@dataclass
class StaalProfiel:
    """Een standaard staalprofiel definitie"""
    id: str = field(default_factory=lambda: str(uuid4()))
    type: ProfielType = ProfielType.HEA
    naam: str = ""  # bijv. "HEA 200"
    afmetingen: ProfielAfmetingen = field(default_factory=ProfielAfmetingen)
    
    def __post_init__(self):
        if not self.naam:
            self.naam = f"{self.type.value} {int(self.afmetingen.hoogte)}"


# ============================================================
# PROFIEL DATABASE - Standaard Europese profielen
# ============================================================

def get_standaard_profielen() -> Dict[str, StaalProfiel]:
    """Retourneert database van standaard profielen"""
    
    profielen = {}
    
    # HEA Profielen (European wide flange beams - light series)
    hea_data = [
        # (hoogte, breedte, tw, tf, r, A, kg/m, Iy, Iz, Wy, Wz)
        (100, 100, 5, 8, 12, 2124, 16.7, 3490000, 1340000, 69800, 26800),
        (120, 120, 5, 8, 12, 2534, 19.9, 6060000, 2310000, 101000, 38500),
        (140, 140, 5.5, 8.5, 12, 3142, 24.7, 10300000, 3890000, 147000, 55600),
        (160, 160, 6, 9, 15, 3877, 30.4, 16700000, 6160000, 209000, 77000),
        (180, 180, 6, 9.5, 15, 4525, 35.5, 25100000, 9250000, 279000, 103000),
        (200, 200, 6.5, 10, 18, 5383, 42.3, 36900000, 13400000, 369000, 134000),
        (220, 220, 7, 11, 18, 6434, 50.5, 54100000, 19500000, 492000, 177000),
        (240, 240, 7.5, 12, 21, 7684, 60.3, 77600000, 27700000, 647000, 231000),
        (260, 260, 7.5, 12.5, 24, 8682, 68.2, 104500000, 36700000, 804000, 282000),
        (280, 280, 8, 13, 24, 9726, 76.4, 136700000, 47600000, 976000, 340000),
        (300, 300, 8.5, 14, 27, 11253, 88.3, 182600000, 63100000, 1217000, 421000),
        (320, 310, 9, 15.5, 27, 12440, 97.6, 229300000, 69900000, 1433000, 451000),
        (340, 300, 9.5, 16.5, 27, 13340, 105, 276900000, 72000000, 1628000, 480000),
        (360, 300, 10, 17.5, 27, 14280, 112, 330900000, 78900000, 1838000, 526000),
        (400, 300, 11, 19, 27, 15900, 125, 450700000, 85600000, 2253000, 571000),
        (450, 300, 11.5, 21, 27, 17800, 140, 637200000, 93700000, 2832000, 625000),
        (500, 300, 12, 23, 27, 19760, 155, 869700000, 107200000, 3479000, 715000),
        (550, 300, 12.5, 24, 27, 21180, 166, 1119600000, 111900000, 4071000, 746000),
        (600, 300, 13, 25, 27, 22640, 178, 1412400000, 116600000, 4708000, 777000),
    ]
    
    for data in hea_data:
        h, b, tw, tf, r, A, kg, Iy, Iz, Wy, Wz = data
        afm = ProfielAfmetingen(
            hoogte=h, breedte=b, lijf_dikte=tw, flens_dikte=tf,
            radius=r, oppervlakte=A, gewicht_per_m=kg,
            Iy=Iy, Iz=Iz, Wy=Wy, Wz=Wz
        )
        profiel = StaalProfiel(type=ProfielType.HEA, afmetingen=afm)
        profielen[profiel.naam] = profiel
    
    # HEB Profielen (European wide flange beams - normal series)
    heb_data = [
        (100, 100, 6, 10, 12, 2604, 20.4, 4500000, 1670000, 90000, 33500),
        (120, 120, 6.5, 11, 12, 3401, 26.7, 8640000, 3180000, 144000, 53000),
        (140, 140, 7, 12, 12, 4296, 33.7, 15100000, 5500000, 216000, 78600),
        (160, 160, 8, 13, 15, 5425, 42.6, 24900000, 8890000, 311000, 111000),
        (180, 180, 8.5, 14, 15, 6525, 51.2, 38300000, 13600000, 426000, 151000),
        (200, 200, 9, 15, 18, 7808, 61.3, 57000000, 20000000, 570000, 200000),
        (220, 220, 9.5, 16, 18, 9104, 71.5, 80900000, 28400000, 736000, 258000),
        (240, 240, 10, 17, 21, 10600, 83.2, 112600000, 39200000, 938000, 327000),
        (260, 260, 10, 17.5, 24, 11840, 93, 149200000, 51300000, 1148000, 395000),
        (280, 280, 10.5, 18, 24, 13140, 103, 192700000, 65400000, 1376000, 467000),
        (300, 300, 11, 19, 27, 14910, 117, 251700000, 85600000, 1678000, 571000),
        (320, 300, 11.5, 20.5, 27, 16130, 127, 308200000, 94300000, 1926000, 629000),
        (340, 300, 12, 21.5, 27, 17090, 134, 366600000, 96900000, 2156000, 646000),
        (360, 300, 12.5, 22.5, 27, 18100, 142, 431900000, 101400000, 2400000, 676000),
        (400, 300, 13.5, 24, 27, 19780, 155, 576800000, 108200000, 2884000, 721000),
        (450, 300, 14, 26, 27, 21800, 171, 798800000, 117200000, 3551000, 781000),
        (500, 300, 14.5, 28, 27, 23860, 187, 1072000000, 126200000, 4287000, 842000),
        (550, 300, 15, 29, 27, 25410, 199, 1367000000, 130800000, 4971000, 872000),
        (600, 300, 15.5, 30, 27, 27000, 212, 1710000000, 135400000, 5701000, 903000),
    ]
    
    for data in heb_data:
        h, b, tw, tf, r, A, kg, Iy, Iz, Wy, Wz = data
        afm = ProfielAfmetingen(
            hoogte=h, breedte=b, lijf_dikte=tw, flens_dikte=tf,
            radius=r, oppervlakte=A, gewicht_per_m=kg,
            Iy=Iy, Iz=Iz, Wy=Wy, Wz=Wz
        )
        profiel = StaalProfiel(type=ProfielType.HEB, afmetingen=afm)
        profielen[profiel.naam] = profiel
    
    # IPE Profielen (European I-beams)
    ipe_data = [
        (80, 46, 3.8, 5.2, 5, 764, 6.0, 801000, 84900, 20000, 3690),
        (100, 55, 4.1, 5.7, 7, 1032, 8.1, 1710000, 159000, 34200, 5790),
        (120, 64, 4.4, 6.3, 7, 1321, 10.4, 3180000, 277000, 53000, 8650),
        (140, 73, 4.7, 6.9, 7, 1643, 12.9, 5410000, 449000, 77300, 12300),
        (160, 82, 5.0, 7.4, 9, 2009, 15.8, 8690000, 683000, 109000, 16700),
        (180, 91, 5.3, 8.0, 9, 2395, 18.8, 13170000, 1010000, 146000, 22200),
        (200, 100, 5.6, 8.5, 12, 2848, 22.4, 19430000, 1420000, 194000, 28500),
        (220, 110, 5.9, 9.2, 12, 3337, 26.2, 27720000, 2050000, 252000, 37300),
        (240, 120, 6.2, 9.8, 15, 3912, 30.7, 38920000, 2840000, 324000, 47300),
        (270, 135, 6.6, 10.2, 15, 4594, 36.1, 57900000, 4200000, 429000, 62200),
        (300, 150, 7.1, 10.7, 15, 5381, 42.2, 83560000, 6040000, 557000, 80500),
        (330, 160, 7.5, 11.5, 18, 6261, 49.1, 117700000, 7880000, 713000, 98500),
        (360, 170, 8.0, 12.7, 18, 7273, 57.1, 162700000, 10400000, 904000, 123000),
        (400, 180, 8.6, 13.5, 21, 8446, 66.3, 231300000, 13200000, 1156000, 146000),
        (450, 190, 9.4, 14.6, 21, 9882, 77.6, 337400000, 16800000, 1500000, 176000),
        (500, 200, 10.2, 16.0, 21, 11550, 90.7, 482000000, 21400000, 1928000, 214000),
        (550, 210, 11.1, 17.2, 24, 13440, 106, 671200000, 26700000, 2441000, 254000),
        (600, 220, 12.0, 19.0, 24, 15600, 122, 920800000, 33900000, 3069000, 308000),
    ]
    
    for data in ipe_data:
        h, b, tw, tf, r, A, kg, Iy, Iz, Wy, Wz = data
        afm = ProfielAfmetingen(
            hoogte=h, breedte=b, lijf_dikte=tw, flens_dikte=tf,
            radius=r, oppervlakte=A, gewicht_per_m=kg,
            Iy=Iy, Iz=Iz, Wy=Wy, Wz=Wz
        )
        profiel = StaalProfiel(type=ProfielType.IPE, afmetingen=afm)
        profielen[profiel.naam] = profiel
    
    return profielen


# Singleton instance
PROFIEL_DATABASE = get_standaard_profielen()


def zoek_profiel(naam: str) -> Optional[StaalProfiel]:
    """Zoek een profiel op naam"""
    return PROFIEL_DATABASE.get(naam)


def zoek_profielen_op_type(type: ProfielType) -> List[StaalProfiel]:
    """Zoek alle profielen van een bepaald type"""
    return [p for p in PROFIEL_DATABASE.values() if p.type == type]


def zoek_profiel_op_capaciteit(
    min_Wy: float,
    type: Optional[ProfielType] = None
) -> List[StaalProfiel]:
    """Zoek profielen met minimale weerstandsmoment"""
    profielen = PROFIEL_DATABASE.values()
    if type:
        profielen = [p for p in profielen if p.type == type]
    return sorted(
        [p for p in profielen if p.afmetingen.Wy >= min_Wy],
        key=lambda p: p.afmetingen.Wy
    )


if __name__ == "__main__":
    # Test
    print("Beschikbare profielen:")
    for naam, profiel in sorted(PROFIEL_DATABASE.items()):
        print(f"  {naam}: {profiel.afmetingen.gewicht_per_m} kg/m")
