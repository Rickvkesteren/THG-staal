"""
Module 7: Robot Bewerkingen

Generatie van instructies voor robotgestuurde bewerkingen:
- Snijbranders
- Freesmachines
- Spuitrobots
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from uuid import uuid4
from enum import Enum
import json

import sys
sys.path.append("../..")
from modules.m06_schoonmaak_analyse.analyse import (
    SchoonmaakPlan, SchoonmaakZone, BewerkingType
)


class RobotType(Enum):
    """Type robot"""
    SNIJBRANDER = "snijbrander"
    FREES = "frees"
    SPUITROBOT = "spuitrobot"
    SLIJPROBOT = "slijprobot"
    STRAALROBOT = "straalrobot"


class InstructieStatus(Enum):
    """Status van robot instructie"""
    CONCEPT = "concept"
    GOEDGEKEURD = "goedgekeurd"
    IN_UITVOERING = "in_uitvoering"
    VOLTOOID = "voltooid"
    MISLUKT = "mislukt"


@dataclass
class RobotPositie:
    """Robot positie en oriëntatie"""
    x: float = 0  # mm
    y: float = 0  # mm
    z: float = 0  # mm
    rx: float = 0  # rotatie x (graden)
    ry: float = 0  # rotatie y (graden)
    rz: float = 0  # rotatie z (graden)
    
    def naar_gcode(self) -> str:
        """Converteer naar G-code positie"""
        return f"G1 X{self.x:.2f} Y{self.y:.2f} Z{self.z:.2f}"
    
    def naar_rapid(self) -> str:
        """Converteer naar ABB RAPID formaat"""
        return f"[[{self.x:.2f},{self.y:.2f},{self.z:.2f}],[{self.rx:.2f},{self.ry:.2f},{self.rz:.2f}]]"


@dataclass
class RobotPad:
    """Een pad dat de robot moet volgen"""
    id: str = field(default_factory=lambda: str(uuid4()))
    posities: List[RobotPositie] = field(default_factory=list)
    
    # Parameters
    snelheid: float = 100  # mm/s
    versnelling: float = 50  # mm/s²
    
    # Tool parameters
    tool_aan: bool = True
    tool_vermogen: float = 100  # % (bijv. snijbrander intensiteit)
    
    def lengte(self) -> float:
        """Totale padlengte in mm"""
        if len(self.posities) < 2:
            return 0
        
        totaal = 0
        for i in range(len(self.posities) - 1):
            p1, p2 = self.posities[i], self.posities[i+1]
            afstand = ((p2.x - p1.x)**2 + (p2.y - p1.y)**2 + (p2.z - p1.z)**2) ** 0.5
            totaal += afstand
        return totaal
    
    def geschatte_tijd(self) -> float:
        """Geschatte uitvoertijd in seconden"""
        return self.lengte() / self.snelheid


@dataclass 
class RobotInstructie:
    """Complete instructie set voor een robot bewerking"""
    id: str = field(default_factory=lambda: str(uuid4()))
    zone_id: str = ""
    robot_type: RobotType = RobotType.SNIJBRANDER
    
    # Status
    status: InstructieStatus = InstructieStatus.CONCEPT
    
    # Paden
    paden: List[RobotPad] = field(default_factory=list)
    
    # Veiligheid
    veilige_hoogte: float = 100  # mm boven werkstuk
    aanloop_afstand: float = 50  # mm voor aanlooppad
    
    # Tool specifiek
    tool_parameters: Dict[str, float] = field(default_factory=dict)
    
    @property
    def totale_tijd(self) -> float:
        """Totale geschatte tijd in seconden"""
        return sum(pad.geschatte_tijd() for pad in self.paden)
    
    def genereer_gcode(self) -> str:
        """Genereer G-code voor CNC/robot"""
        lines = [
            "; Gegenereerd door Ontmantelingsplan Systeem",
            f"; Zone: {self.zone_id}",
            f"; Robot: {self.robot_type.value}",
            "",
            "G21 ; Millimeters",
            "G90 ; Absolute positioning",
            f"G0 Z{self.veilige_hoogte} ; Naar veilige hoogte",
            ""
        ]
        
        for pad_idx, pad in enumerate(self.paden):
            lines.append(f"; Pad {pad_idx + 1}")
            
            if pad.posities:
                # Snel naar startpositie
                start = pad.posities[0]
                lines.append(f"G0 X{start.x:.2f} Y{start.y:.2f}")
                lines.append(f"G0 Z{start.z + self.aanloop_afstand:.2f}")
                
                # Tool aan
                if pad.tool_aan:
                    lines.append(f"M3 S{pad.tool_vermogen:.0f} ; Tool aan")
                
                # Beweging naar werkdiepte
                lines.append(f"G1 Z{start.z:.2f} F{pad.snelheid:.0f}")
                
                # Volg pad
                for pos in pad.posities[1:]:
                    lines.append(f"G1 X{pos.x:.2f} Y{pos.y:.2f} Z{pos.z:.2f}")
                
                # Tool uit
                if pad.tool_aan:
                    lines.append("M5 ; Tool uit")
                
                # Terug naar veilige hoogte
                lines.append(f"G0 Z{self.veilige_hoogte}")
            
            lines.append("")
        
        lines.extend([
            "G0 X0 Y0 ; Terug naar home",
            "M30 ; Programma einde"
        ])
        
        return "\n".join(lines)
    
    def genereer_rapid(self) -> str:
        """Genereer ABB RAPID code"""
        lines = [
            "MODULE BewerkinGModule",
            "",
            "  ! Gegenereerd door Ontmantelingsplan Systeem",
            f"  ! Zone: {self.zone_id}",
            f"  ! Robot: {self.robot_type.value}",
            "",
            "  PROC main()",
            f"    MoveJ [[0,0,{self.veilige_hoogte}],[0,0,0]], v1000, z50, tool0;",
            ""
        ]
        
        for pad_idx, pad in enumerate(self.paden):
            lines.append(f"    ! Pad {pad_idx + 1}")
            
            if pad.posities:
                start = pad.posities[0]
                lines.append(f"    MoveL {start.naar_rapid()}, v{pad.snelheid:.0f}, fine, tool0;")
                
                if pad.tool_aan:
                    lines.append("    SetDO doToolOn, 1;")
                
                for pos in pad.posities[1:]:
                    lines.append(f"    MoveL {pos.naar_rapid()}, v{pad.snelheid:.0f}, z10, tool0;")
                
                if pad.tool_aan:
                    lines.append("    SetDO doToolOn, 0;")
                
                lines.append(f"    MoveL [[{start.x},{start.y},{self.veilige_hoogte}],[0,0,0]], v500, z50, tool0;")
            
            lines.append("")
        
        lines.extend([
            "    MoveJ [[0,0,{self.veilige_hoogte}],[0,0,0]], v1000, z50, tool0;",
            "  ENDPROC",
            "",
            "ENDMODULE"
        ])
        
        return "\n".join(lines)


class RobotPadGenerator:
    """Genereer robot paden voor schoonmaakzones"""
    
    def __init__(self):
        # Robot configuratie per type
        self.robot_config = {
            RobotType.SNIJBRANDER: {
                "snelheid": 50,  # mm/s - langzaam voor snijden
                "tool_vermogen": 80,
                "overlap": 5,  # mm overlap tussen paden
                "z_offset": -2,  # mm onder oppervlak
            },
            RobotType.FREES: {
                "snelheid": 200,
                "tool_vermogen": 100,
                "overlap": 2,
                "z_offset": -1,
            },
            RobotType.SLIJPROBOT: {
                "snelheid": 150,
                "tool_vermogen": 90,
                "overlap": 10,
                "z_offset": 0,
            },
            RobotType.STRAALROBOT: {
                "snelheid": 300,
                "tool_vermogen": 100,
                "overlap": 20,
                "z_offset": 50,  # afstand tot oppervlak
            },
            RobotType.SPUITROBOT: {
                "snelheid": 400,
                "tool_vermogen": 70,
                "overlap": 30,
                "z_offset": 100,
            }
        }
    
    def bepaal_robot_type(self, bewerking: BewerkingType) -> RobotType:
        """Bepaal welke robot nodig is voor bewerking"""
        mapping = {
            BewerkingType.SNIJBRANDEN: RobotType.SNIJBRANDER,
            BewerkingType.FREZEN: RobotType.FREES,
            BewerkingType.SLIJPEN: RobotType.SLIJPROBOT,
            BewerkingType.STRALEN: RobotType.STRAALROBOT,
        }
        return mapping.get(bewerking, RobotType.SLIJPROBOT)
    
    def genereer_zigzag_pad(
        self,
        zone: SchoonmaakZone,
        robot_type: RobotType
    ) -> RobotPad:
        """Genereer zigzag pad over zone"""
        config = self.robot_config[robot_type]
        
        pad = RobotPad(
            snelheid=config["snelheid"],
            tool_vermogen=config["tool_vermogen"]
        )
        
        # Start positie
        x_start = zone.positie_start.x
        y_start = zone.positie_start.y
        z = zone.positie_start.z + config["z_offset"]
        
        # Zigzag over de zone
        overlap = config["overlap"]
        y = y_start
        richting = 1  # 1 = rechts, -1 = links
        
        while y <= y_start + zone.breedte:
            if richting == 1:
                pad.posities.append(RobotPositie(x=x_start, y=y, z=z))
                pad.posities.append(RobotPositie(x=x_start + zone.lengte, y=y, z=z))
            else:
                pad.posities.append(RobotPositie(x=x_start + zone.lengte, y=y, z=z))
                pad.posities.append(RobotPositie(x=x_start, y=y, z=z))
            
            y += overlap
            richting *= -1
        
        return pad
    
    def genereer_contour_pad(
        self,
        zone: SchoonmaakZone,
        robot_type: RobotType
    ) -> RobotPad:
        """Genereer contour pad rond zone (voor snijden)"""
        config = self.robot_config[robot_type]
        
        pad = RobotPad(
            snelheid=config["snelheid"],
            tool_vermogen=config["tool_vermogen"]
        )
        
        x = zone.positie_start.x
        y = zone.positie_start.y
        z = zone.positie_start.z + config["z_offset"]
        
        # Rechthoekig contour
        pad.posities = [
            RobotPositie(x=x, y=y, z=z),
            RobotPositie(x=x + zone.lengte, y=y, z=z),
            RobotPositie(x=x + zone.lengte, y=y + zone.breedte, z=z),
            RobotPositie(x=x, y=y + zone.breedte, z=z),
            RobotPositie(x=x, y=y, z=z),  # Terug naar start
        ]
        
        return pad
    
    def genereer_instructie(
        self,
        zone: SchoonmaakZone
    ) -> RobotInstructie:
        """Genereer complete robot instructie voor een zone"""
        robot_type = self.bepaal_robot_type(zone.bewerking)
        
        instructie = RobotInstructie(
            zone_id=zone.id,
            robot_type=robot_type
        )
        
        # Kies pad strategie
        if zone.bewerking == BewerkingType.SNIJBRANDEN:
            # Voor snijden: contour pad
            pad = self.genereer_contour_pad(zone, robot_type)
        else:
            # Voor andere bewerkingen: zigzag
            pad = self.genereer_zigzag_pad(zone, robot_type)
        
        instructie.paden.append(pad)
        
        return instructie
    
    def genereer_alle_instructies(
        self,
        plan: SchoonmaakPlan
    ) -> List[RobotInstructie]:
        """Genereer instructies voor alle zones in een plan"""
        instructies = []
        
        for zone in plan.zones:
            if zone.bewerking != BewerkingType.GEEN:
                instructie = self.genereer_instructie(zone)
                instructies.append(instructie)
        
        return instructies


def demo_robot_bewerkingen():
    """Demo van robot instructie generatie"""
    from modules.m02_gebouw_structuur.structuur import maak_voorbeeld_gebouw
    from modules.m06_schoonmaak_analyse.analyse import SchoonmaakAnalyse
    
    # Maak voorbeeld data
    gebouw = maak_voorbeeld_gebouw()
    analyse = SchoonmaakAnalyse()
    
    # Pak eerste element
    element = list(gebouw.elementen.values())[0]
    plan = analyse.analyseer_element(element)
    
    # Genereer robot instructies
    generator = RobotPadGenerator()
    instructies = generator.genereer_alle_instructies(plan)
    
    print("ROBOT INSTRUCTIES DEMO")
    print("="*60)
    print(f"Element: {element.naam}")
    print(f"Aantal zones: {len(plan.zones)}")
    print(f"Aantal instructies: {len(instructies)}")
    
    for idx, instructie in enumerate(instructies[:2]):  # Toon eerste 2
        print(f"\n{'='*60}")
        print(f"INSTRUCTIE {idx + 1}: {instructie.robot_type.value}")
        print(f"Zone: {instructie.zone_id}")
        print(f"Geschatte tijd: {instructie.totale_tijd:.1f} sec")
        
        print("\nG-Code:")
        print("-"*40)
        gcode = instructie.genereer_gcode()
        # Print eerste 20 regels
        for line in gcode.split("\n")[:20]:
            print(line)
        print("...")


if __name__ == "__main__":
    demo_robot_bewerkingen()
