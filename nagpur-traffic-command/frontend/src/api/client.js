/**
 * API client for the Nagpur Traffic Command backend.
 * All functions throw on non-ok responses with a descriptive error message.
 */

const API_BASE_URL = "http://localhost:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (err) {
    throw new Error(
      `Network error: could not reach the backend at ${API_BASE_URL}. ` +
        `Is the server running? (${err.message})`
    );
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // response body wasn't JSON — fall through with statusText
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Exported API functions                                            */
/* ------------------------------------------------------------------ */

export function getLocations() {
  return request("/locations");
}

export function getLocationDetail(junctionId) {
  return request(`/locations/${encodeURIComponent(junctionId)}`);
}

export function getIncidents() {
  return request("/incidents");
}

export function postIncident(payload) {
  return request("/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getCurrentDeployment() {
  return request("/deployment/current");
}

export function getDeploymentRecommendation(availableOfficers = 10) {
  return request(
    `/deployment/recommendation?available_officers=${encodeURIComponent(availableOfficers)}`
  );
}

export function getDeploymentMoves(availableOfficers = 10) {
  return request(
    `/deployment/moves?available_officers=${encodeURIComponent(availableOfficers)}`
  );
}

export function postOverride(payload) {
  return request("/deployment/override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function resetDeployment() {
  return request("/deployment/reset", {
    method: "POST",
  });
}

export function applyAllRecommendations(availableOfficers) {
  return request("/deployment/apply-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ available_officers: availableOfficers }),
  });
}

export function getReservePool() {
  return request("/deployment/reserve");
}

export function dispatchEmergency(payload) {
  return request("/deployment/emergency", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
