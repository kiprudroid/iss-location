export type IssCoordinates = {
  latitude: string;
  longitude: string;
};

export async function fetchIssCoordinates(): Promise<IssCoordinates> {
  // Call your local proxy route instead of an external proxy
  const response = await fetch("/api/iss-now", {
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

  // Prevent snapping to 0,0 if the API returns an unexpected payload structure
  if (!data.iss_position?.latitude || !data.iss_position?.longitude) {
    throw new Error("Malformed data structure received from API");
  }

  return {
    latitude: data.iss_position.latitude,
    longitude: data.iss_position.longitude,
  };
}