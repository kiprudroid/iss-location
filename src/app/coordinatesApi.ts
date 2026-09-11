export type IssCoordinates = {
  latitude: string;
  longitude: string;
};

export async function fetchIssCoordinates(): Promise<IssCoordinates> {
  // 1. Detect if running on localhost
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // 2. On localhost, call the direct HTTP API. On Vercel, call your vercel.json rewrite proxy.
  const url = isLocalhost
    ? `http://api.open-notify.org/iss-now.json?_=${Date.now()}`
    : "/api/iss-now";

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch ISS coordinates");
  }

  const data = (await response.json()) as {
    iss_position?: {
      latitude?: string;
      longitude?: string;
    };
  };

  if (!data.iss_position?.latitude || !data.iss_position?.longitude) {
    throw new Error("Malformed data structure");
  }

  return {
    latitude: data.iss_position.latitude,
    longitude: data.iss_position.longitude,
  };
}
