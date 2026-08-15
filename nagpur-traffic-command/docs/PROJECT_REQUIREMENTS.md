# Project: AI-Based Traffic Risk Heatmap and Police Deployment Decision Support — Nagpur City

## Problem
Nagpur Traffic Police have limited personnel but must monitor many junctions.
Risk changes throughout the day due to congestion, accidents, violations, illegal
parking, obstructions, weather, roadwork, and events. There is no system that
tells them: which locations are high-risk right now, which are unmanned despite
being high-risk, and where limited officers should be deployed, with reasons.

## Data
All data is SIMULATED / SYNTHETIC for this prototype. No real police or CCTV data
is used. This must be clearly labeled in the UI and docs at all times.

## Core outputs required
1. Risk score (0-100) per junction, with levels: Low(0-30) Medium(31-60) High(61-80) Critical(81-100)
2. Interactive Nagpur map showing risk levels, police, incidents, unmanned high-risk spots
3. Ranked list of high-risk locations
4. Police deployment recommendation given a limited number of available officers
   (produced by a rule-based/greedy allocation algorithm, NOT the ML model)
5. Dynamic recalculation when a new incident is injected (risk, ranking, deployment all update)
6. Explicit flagging of high-risk + zero-police locations
7. Explainability: every risk score shows the top contributing factors
8. Manual override: operator can Accept / Modify / Reject any recommendation
9. Current vs AI-recommended deployment comparison view

## Explicit separation
- ML model = predicts risk score only
- Deployment algorithm = separate rule-based/greedy logic, takes risk scores as input
These must never be presented as the same system to avoid misleading claims.
