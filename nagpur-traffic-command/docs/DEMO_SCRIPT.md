# Demo Script: Nagpur Traffic Command

This script outlines the sequence for demonstrating the Nagpur Traffic Command and Decision Support prototype.

## 1. Dashboard
- Open Dashboard
- *Narrate:* Explain the high-level KPIs and point out the top-5 high-risk locations list.

## 2. Risk Heatmap
- Open Heatmap
- *Narrate:* Explain the color-coding of the markers and the spatial distribution of risk. Click on one of the markers to show the popup.

## 3. Location Detail
- Click into a specific Location Detail (either from the Heatmap popup or Dashboard list).
- *Narrate:* Walk through the explainability bar chart ("Why this score?"), showing how the AI model weights different real-time factors to arrive at the risk score.

## 4. Inject Incident
- Go to Active Incidents.
- *Narrate:* Explain the live feed. Then, use the form to inject one high-severity incident at a specific named junction. 
- *Narrate:* Wait for the toast notification and highlight the "before -> after" risk score shift in the injection log.

## 5. View Dashboard Impact
- Return to Dashboard and hit **Refresh Data**.
- *Narrate:* Point out how the KPIs and the Top 5 rankings have updated immediately to reflect the new incident.

## 6. View Heatmap Impact
- Go to Risk Heatmap and hit **Refresh Data**.
- *Narrate:* Point out the specific marker that changed color/status due to the injected incident.

## 7. Generate Recommendations
- Go to AI Recommendations.
- *Narrate:* Click "Generate Recommendation". Point out the row corresponding to the junction where the incident was injected, noting the highlighted discrepancy between Current and Recommended officers.
- *Narrate:* Point at the "Suggested Moves" panel to show how the deployment engine recommends pulling officers to cover the new hotspot.

## 8. Human-in-the-Loop Override
- While still on Recommendations, act on the suggestions.
- *Narrate:* **Accept** one recommendation. Then, **Reject** or **Modify** another to demonstrate the human-in-the-loop override capability.

## 9. Conclusion
- *Narrate:* Close the demo by reiterating the core takeaways:
  1. This is running on simulated data.
  2. The system utilizes two separate algorithms: an ML risk prediction engine and a heuristic deployment optimization engine.
  3. A human override is always available, keeping the operator in control.
