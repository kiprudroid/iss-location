export type IssCoordinates = {
  latitude: string;
  longitude: string;
};

export async function fetchIssCoordinates(): Promise<IssCoordinates> {
  // 1. Using a more reliable proxy
  // 2. Appending a timestamp (&_=${Date.now()}) to force fresh data every single second
  const targetUrl = encodeURIComponent(`http://api.open-notify.org/iss-now.json?_=${Date.now()}`);
  const url = `https://corsproxy.io/?url=${targetUrl}`;

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

  return {
    latitude: data.iss_position?.latitude ?? "0.0000",
    longitude: data.iss_position?.longitude ?? "0.0000",
  };
}