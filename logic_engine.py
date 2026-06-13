import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator

class Seleccion(BaseModel):
    evento: str
    mercado: str
    cuota: float
    competicion: str

class BetSlip(BaseModel):
    cuota_total: float
    stake_euros: Optional[float]
    num_eventos: int
    selecciones: List[Seleccion]

    @field_validator('cuota_total')
    @classmethod
    def validate_cuota(cls, v: float) -> float:
        if v <= 1.0:
            raise ValueError("Total odds must be greater than 1.0.")
        return v

    @field_validator('stake_euros')
    @classmethod
    def validate_stake(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0.0:
            raise ValueError("Stake cannot be negative.")
        return v

class BetAuditor:
    def __init__(self, bet: BetSlip):
        self.bet = bet

    def audit(self) -> Dict[str, Any]:
        red_flags = []
        green_flags = []

        # Extract data for ease of use
        cuota_total = self.bet.cuota_total
        stake_euros = self.bet.stake_euros
        num_eventos = self.bet.num_eventos
        selecciones = self.bet.selecciones

        # 1. Probabilidad Implícita Total
        probabilidad_implicta = (1 / cuota_total * 100) if cuota_total > 0 else 0.0

        # Helper checks
        competiciones = [s.competicion.lower() for s in selecciones]
        unique_competitions = set(competiciones)
        eventos = [s.evento.lower() for s in selecciones]
        unique_events = set(eventos)

        # --- RED FLAGS ---

        # 1. Combinada Frankenstein: num_eventos >= 4 y competiciones distintas
        if num_eventos >= 4 and len(unique_competitions) > 1:
            red_flags.append({
                "titulo": "Frankenstein Accumulator",
                "mensaje": f"You have {num_eventos} events across {len(unique_competitions)} different competitions. This chaotic mix heavily increases variance."
            })

        # 2. Ruleta del Marcador Exacto: Algún mercado es "Marcador Exacto"
        has_marcador_exacto = any("marcador exacto" in s.mercado.lower() or "correct score" in s.mercado.lower() for s in selecciones)
        if has_marcador_exacto:
            red_flags.append({
                "titulo": "Correct Score Roulette",
                "mensaje": "Correct score markets carry an extremely high house edge. It is mathematically unprofitable in the long run."
            })

        # 3. Trampa del Visitante: Cuota individual entre 1.30 y 1.50 para el equipo visitante.
        has_visitante_trap = False
        for s in selecciones:
            merc = s.mercado.lower()
            if any(term in merc for term in ["visitante", "away", "2", "gana 2"]) and not any(term in merc for term in ["handicap", "hándicap", "asiático", "asian", "12", "doble oportunidad"]):
                if 1.30 <= s.cuota <= 1.50:
                    has_visitante_trap = True
                    break
        if has_visitante_trap:
            red_flags.append({
                "titulo": "Away Team Trap",
                "mensaje": "Misleading away odds (1.30 - 1.50). Playing away from home with low odds offers very poor value relative to the risk."
            })

        # 4. Micro-Eventos: Mercados de tarjetas, saques de banda o tiros.
        micro_events_terms = ["tarjeta", "saque", "tiro", "córner", "corner", "amartilla", "falta", "offsides", "fuera de juego", "amarilla", "roja", "banda", "asistencia", "remates"]
        has_micro_events = any(any(term in s.mercado.lower() for term in micro_events_terms) for s in selecciones)
        if has_micro_events:
            red_flags.append({
                "titulo": "Micro-Events Volatility",
                "mensaje": "Cards, throw-ins, and shot markets are highly volatile and heavily influenced by unpredictable variables."
            })

        # 5. Efecto Moonshot: cuota_total > 100.0.
        if cuota_total > 100.0:
            red_flags.append({
                "titulo": "Moonshot Effect",
                "mensaje": f"A total odd of {cuota_total:.2f} is a lottery ticket. You are betting on a miracle rather than finding mathematical value."
            })

        # 6. Suicidio de Bankroll: stake_euros > 50.0 y cuota_total > 20.0.
        if stake_euros is not None and stake_euros > 50.0 and cuota_total > 20.0:
            red_flags.append({
                "titulo": "Bankroll Suicide",
                "mensaje": f"Risking {stake_euros}€ on a {cuota_total:.2f} odd is unsustainable for healthy bankroll management."
            })

        # 7. Falsa Correlación: Múltiples selecciones en el mismo evento.
        if len(unique_events) < len(selecciones):
            red_flags.append({
                "titulo": "Correlated Selections",
                "mensaje": "You combined multiple selections on the same match. Bookmakers scale down correlated odds to protect their edge."
            })

        # 8. Apuesta a Remolque: num_eventos == 1 en viernes o lunes.
        # Viernes = 4, Lunes = 0
        current_day = datetime.datetime.now().weekday()
        if num_eventos == 1 and current_day in [0, 4]:
            day_name = "Monday" if current_day == 0 else "Friday"
            red_flags.append({
                "titulo": "Chasing Losses",
                "mensaje": f"Single bets placed on {day_name}s are often impulsive due to lack of major fixtures or trying to recover weekend losses."
            })

        # 9. Falacia de Cualquier Momento: Goleador en cualquier momento con cuota < 1.60.
        has_goleador_trap = False
        for s in selecciones:
            merc = s.mercado.lower()
            if any(term in merc for term in ["goleador", "anota", "anytime", "marca"]) and not any(term in merc for term in ["marcador", "ambos", "mitad"]):
                if s.cuota < 1.60:
                    has_goleador_trap = True
                    break
        if has_goleador_trap:
            red_flags.append({
                "titulo": "Anytime Goalscorer Fallacy",
                "mensaje": "Anytime scorer odds below 1.60 offer no value. The probability of injury, early substitution, or cold streaks is too high."
            })

        # 10. Condiciones Extremas: Mercados de "Ganador ambas mitades".
        has_condiciones_extremas = any("ambas mitades" in s.mercado.lower() or "ganar ambas" in s.mercado.lower() or "both halves" in s.mercado.lower() for s in selecciones)
        if has_condiciones_extremas:
            red_flags.append({
                "titulo": "Extreme Match Half Condition",
                "mensaje": "Betting on a team to win both halves requires absolute dominance. The risk far outweighs the reward."
            })

        # --- GREEN FLAGS ---

        # 1. Pureza Simple: num_eventos == 1.
        if num_eventos == 1:
            green_flags.append({
                "titulo": "Single Bet Purity",
                "mensaje": "Single bets minimize the bookmaker's mathematical edge and support a professional risk management approach."
            })

        # 2. Refugio Asiático: Mercado incluye la palabra "Asiático".
        has_asiatico = any("asiático" in s.mercado.lower() or "asiatico" in s.mercado.lower() or "asian" in s.mercado.lower() for s in selecciones)
        if has_asiatico:
            green_flags.append({
                "titulo": "Asian Handicap Safe Haven",
                "mensaje": "Asian handicaps and totals return part or all of your stake in case of specific draws. Outstanding risk control."
            })

        # 3. Zona de Valor: Cuota individual entre 1.80 y 2.20.
        has_zona_valor = any(1.80 <= s.cuota <= 2.20 for s in selecciones)
        if has_zona_valor:
            green_flags.append({
                "titulo": "Optimal Value Zone",
                "mensaje": "Your bet slip includes selections in the optimal range (1.80 - 2.20), where mathematical value is most commonly found."
            })

        # 4. Especialista: num_eventos > 1 pero una sola competición en todas las selecciones.
        if num_eventos > 1 and len(unique_competitions) == 1:
            green_flags.append({
                "titulo": "Competition Specialist",
                "mensaje": f"Combining events from the same competition ({list(unique_competitions)[0].upper()}) shows focus and specialized league knowledge."
            })

        # 5. Reducción de Varianza: Mercado "DNB" o "Doble Oportunidad".
        has_reduccion_varianza = any(any(term in s.mercado.lower() for term in ["dnb", "doble oportunidad", "empate no valida", "empate no válido", "draw no bet", "double chance"]) for s in selecciones)
        if has_reduccion_varianza:
            green_flags.append({
                "titulo": "Variance Mitigation",
                "mensaje": "Utilizing Double Chance or Draw No Bet (DNB) are smart hedging strategies to buffer late upsets."
            })

        # 6. Combinada Quirúrgica: num_eventos == 2, cuota_total entre 2.0 y 3.5, sin cuotas < 1.30.
        if num_eventos == 2 and (2.0 <= cuota_total <= 3.5) and all(s.cuota >= 1.30 for s in selecciones):
            green_flags.append({
                "titulo": "Surgical Double",
                "mensaje": "A surgical double accumulator with a strong combined price and no low-value fillers."
            })

        # 7. Desafío al Rebaño: Equipo local con cuota > 3.0.
        has_desafio_rebano = False
        for s in selecciones:
            merc = s.mercado.lower()
            if any(term in merc for term in ["local", "home", "1", "gana 1"]) and not any(term in merc for term in ["visitante", "away", "x", "empate", "dnb", "doble oportunidad"]):
                if s.cuota > 3.0:
                    has_desafio_rebano = True
                    break
        if has_desafio_rebano:
            green_flags.append({
                "titulo": "Fading the Crowd",
                "mensaje": "Backing a home underdog at odds > 3.0 often represents value when the crowd overestimates the visiting side."
            })

        # 8. Stake Profesional: stake_euros < 5.0 y cuota_total > 15.0.
        if stake_euros is not None and stake_euros < 5.0 and cuota_total > 15.0:
            green_flags.append({
                "titulo": "Professional Stake Management",
                "mensaje": f"Excellent discipline: keeping a very low stake ({stake_euros}€) for a high-risk price ({cuota_total:.2f})."
            })

        # 9. Mercados Líquidos: 1X2 o +/- Goles en ligas mayores.
        major_leagues = ["la liga", "laliga", "premier", "serie a", "bundesliga", "ligue 1", "champions", "europa league", "world cup", "eurocopa", "primera division"]
        has_mercados_liquidos = False
        for s in selecciones:
            merc = s.mercado.lower()
            comp = s.competicion.lower()
            is_liquid_market = any(term in merc for term in ["1x2", "resultado final", "ganador", "goles", "total de goles", "más de", "menos de", "over", "under", "ambos marcan"])
            is_major_league = any(league in comp for league in major_leagues)
            if is_liquid_market and is_major_league:
                has_mercados_liquidos = True
                break
        if has_mercados_liquidos:
            green_flags.append({
                "titulo": "Liquid Major Markets",
                "mensaje": "Betting on primary markets of major leagues. High liquidity limits and lower bookmaker margin."
            })

        # 10. Escudo del Perdedor: Uso de hándicap positivo (+1.5, +2.5).
        has_escudo_perdedor = any(any(term in s.mercado.lower() for term in ["+1.5", "+2.5", "+1.75", "+2.25", "+3.5", "+2.0", "+3.0"]) for s in selecciones)
        if has_escudo_perdedor:
            green_flags.append({
                "titulo": "Loser's Shield",
                "mensaje": "Using wide positive handicaps protects your bet even if your team loses the match by a tight margin."
            })

        # 4. Cálculo del "Toxicity Score"
        # Partiendo de 50, suma 10 puntos por cada Green Flag y resta 15 por cada Red Flag (limitado entre 0 y 100).
        score = 50 + (len(green_flags) * 10) - (len(red_flags) * 15)
        score = max(0, min(100, score))

        return {
            "cuota_total": cuota_total,
            "stake_euros": stake_euros,
            "num_eventos": num_eventos,
            "probabilidad_implicta": probabilidad_implicta,
            "toxicity_score": score,
            "red_flags": red_flags,
            "green_flags": green_flags
        }
