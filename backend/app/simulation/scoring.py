"""Official 2026 F1 Fantasy scoring rules."""

# Driver qualifying points (grid penalties do NOT affect qualifying pts)
QUALI_POINTS = {1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1}
QUALI_NC_DSQ_PENALTY = -5

# Sprint qualifying points (half of qualifying, rounded down)
SPRINT_QUALI_POINTS = {1: 5, 2: 4, 3: 4, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1, 10: 0}

# Driver race finish points (standard F1 points)
RACE_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}

# Sprint finish points (P1-P8 only)
SPRINT_POINTS = {1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}

# Bonus points
FASTEST_LAP_PTS = 10          # Race only, driver must finish in points (P1-P10)
DRIVER_OF_THE_DAY_PTS = 10

# Positions gained/lost: +2 per position gained, -2 per position lost
# (based on grid start position vs race finish)
POSITIONS_CHANGE_MULTIPLIER = 2

# Overtakes: +1 per overtake made during the race
OVERTAKE_PTS = 1

# Beat teammate: +2 if you finish ahead of teammate (race/sprint/quali)
BEAT_TEAMMATE_PTS = 2

# DNF penalties
RACE_DNF_PENALTY = -20
SPRINT_DNF_PENALTY = -10

# Constructor qualifying progression
Q2_CUTOFF = 15
Q3_CUTOFF = 10


def score_qualifying_driver(position: int) -> int:
    return QUALI_POINTS.get(position, 0)


def score_sprint_qualifying_driver(position: int) -> int:
    """Sprint qualifying points are half of normal qualifying, rounded down."""
    return SPRINT_QUALI_POINTS.get(position, 0)


def score_race_position(position: int) -> int:
    return RACE_POINTS.get(position, 0)


def score_sprint_position(position: int) -> int:
    return SPRINT_POINTS.get(position, 0)


def score_positions_changed(grid_pos: int, finish_pos: int) -> int:
    """Score positions gained/lost from grid start to race finish.
    +2 per position gained, -2 per position lost."""
    return (grid_pos - finish_pos) * POSITIONS_CHANGE_MULTIPLIER


def score_constructor_qualifying_progression(pos1: int, pos2: int) -> int:
    """Official 2026 constructor qualifying progression scoring."""
    in_q3_1 = pos1 <= Q3_CUTOFF
    in_q3_2 = pos2 <= Q3_CUTOFF
    in_q2_1 = pos1 <= Q2_CUTOFF
    in_q2_2 = pos2 <= Q2_CUTOFF

    if in_q3_1 and in_q3_2:
        return 10
    if in_q2_1 and in_q2_2:
        return 5
    # Both eliminated in Q1
    return 2


def score_pitstop_time(time_seconds: float) -> int:
    """Official 2026 constructor pitstop scoring."""
    if time_seconds < 2.0:
        return 10  # Sub-2s
    if time_seconds < 2.2:
        return 10  # 2.0-2.19s
    if time_seconds < 2.5:
        return 5   # 2.2-2.49s
    if time_seconds < 3.0:
        return 3   # 2.5-2.99s
    if time_seconds < 5.0:
        return 2   # 3.0-4.99s
    return 0        # 5.0s+


# Bonus: fastest pitstop of the race = +5
FASTEST_PITSTOP_BONUS = 5
