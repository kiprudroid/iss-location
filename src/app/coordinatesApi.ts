export type IssCoordinates = {
  latitude: string;
  longitude: string;
};

export async function fetchIssCoordinates(): Promise<IssCoordinates> {
  const response = await fetch("http://api.open-notify.org/iss-now.json", {
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

  return {
    latitude: data.iss_position?.latitude ?? "0.0000",
    longitude: data.iss_position?.longitude ?? "0.0000",
  };
}
