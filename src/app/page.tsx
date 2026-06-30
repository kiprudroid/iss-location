"use client";

import { useEffect, useRef, useState } from "react";
import { fetchIssCoordinates } from "./coordinatesApi";

const MAP_IMAGE_WIDTH = 1280;
const MAP_IMAGE_HEIGHT = 817;
const MAP_ASPECT_RATIO = MAP_IMAGE_WIDTH / MAP_IMAGE_HEIGHT;

type MapPoint = {
  x: number;
  y: number;
};

const coordinateMapper = (
  latitude: string,
  longitude: string,
  mapWidth: number,
  mapHeight: number,
  offsetX: number,
  offsetY: number,
): MapPoint => {
  const parsedLatitude = Number.parseFloat(latitude);
  const parsedLongitude = Number.parseFloat(longitude);

  const normalizedLongitude = (parsedLongitude + 180) / 360;
  const latitudeRadians = (parsedLatitude * Math.PI) / 180;
  
  // Gall-Peters projection formula
  const normalizedLatitude = 0.5 - 0.5 * Math.sin(latitudeRadians);

  return {
    x: offsetX + normalizedLongitude * mapWidth,
    y: offsetY + normalizedLatitude * mapHeight,
  };
};

export default function CanvasComponent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const [issCoordinates, setIssCoordinates] = useState({
    latitude: "0.0000",
    longitude: "0.0000",
  });

  // Preload the map image cleanly in the client
  useEffect(() => {
    const img = new Image();
    img.src = "/gall-peters-projection.png";
    img.onload = () => {
      mapImageRef.current = img;
    };

    let isMounted = true;
    const loadCoordinates = async () => {
      try {
        const nextCoordinates = await fetchIssCoordinates();
        if (isMounted) setIssCoordinates(nextCoordinates);
      } catch {
        if (isMounted) setIssCoordinates({ latitude: "0.0000", longitude: "0.0000" });
      }
    };

    loadCoordinates();
    const intervalId = window.setInterval(loadCoordinates, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawFrame = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Calculate perfect aspect ratio fitting (contain)
      const mapWidthCandidate = width;
      const mapHeightCandidate = mapWidthCandidate / MAP_ASPECT_RATIO;
      const mapWidth = mapHeightCandidate > height ? height * MAP_ASPECT_RATIO : mapWidthCandidate;
      const mapHeight = mapHeightCandidate > height ? height : mapHeightCandidate;
      const offsetX = (width - mapWidth) / 2;
      const offsetY = (height - mapHeight) / 2;

      // 1. Draw the map image directly on the canvas background
      if (mapImageRef.current) {
        ctx.drawImage(mapImageRef.current, offsetX, offsetY, mapWidth, mapHeight);
      }

      // 2. Map coordinates relative to the exact drawn image bounds
      const point = coordinateMapper(
        issCoordinates.latitude,
        issCoordinates.longitude,
        mapWidth,
        mapHeight,
        offsetX,
        offsetY
      );

      // 3. Draw the ISS tracking dot
      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
    };

    drawFrame();
    window.addEventListener("resize", drawFrame);

    return () => {
      window.removeEventListener("resize", drawFrame);
    };
  }, [issCoordinates]);

  return (
    // Removed the Tailwind background utilities here
    <div className="relative min-h-screen w-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute bottom-4 left-4 rounded-md bg-black/55 px-3 py-2 text-sm text-white backdrop-blur-sm">
        <div>Latitude: {issCoordinates.latitude}</div>
        <div>Longitude: {issCoordinates.longitude}</div>
      </div>
    </div>
  );
}