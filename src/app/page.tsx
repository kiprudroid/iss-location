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
  canvasWidth: number,
  canvasHeight: number,
): MapPoint => {
  const parsedLatitude = Number.parseFloat(latitude);
  const parsedLongitude = Number.parseFloat(longitude);

  const mapWidthCandidate = canvasWidth;
  const mapHeightCandidate = mapWidthCandidate / MAP_ASPECT_RATIO;
  const mapWidth = mapHeightCandidate > canvasHeight ? canvasHeight * MAP_ASPECT_RATIO : mapWidthCandidate;
  const mapHeight = mapHeightCandidate > canvasHeight ? canvasHeight : mapHeightCandidate;
  const offsetX = (canvasWidth - mapWidth) / 2;
  const offsetY = (canvasHeight - mapHeight) / 2;

  const normalizedLongitude = (parsedLongitude + 180) / 360;
  const latitudeRadians = (parsedLatitude * Math.PI) / 180;
  const normalizedLatitude = 0.5 - 0.5 * Math.sin(latitudeRadians);

  return {
    x: offsetX + normalizedLongitude * mapWidth,
    y: offsetY + normalizedLatitude * mapHeight,
  };
};


export default function CanvasComponent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [issCoordinates, setIssCoordinates] = useState({
    latitude: "0.0000",
    longitude: "0.0000",
  });

  useEffect(() => {
    let isMounted = true;

    const loadCoordinates = async () => {
      try {
        const nextCoordinates = await fetchIssCoordinates();
        if (isMounted) {
          setIssCoordinates(nextCoordinates);
        }
      } catch {
        if (isMounted) {
          setIssCoordinates({ latitude: "0.0000", longitude: "0.0000" });
        }
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

      const point = coordinateMapper(
        issCoordinates.latitude,
        issCoordinates.longitude,
        width,
        height,
      );

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
    <div className="relative min-h-screen w-screen overflow-hidden bg-black bg-[url('/gall-peters-projection.png')] bg-contain bg-center bg-no-repeat">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="absolute bottom-4 left-4 rounded-md bg-black/55 px-3 py-2 text-sm text-white backdrop-blur-sm">
        <div>Latitude: {issCoordinates.latitude}</div>
        <div>Longitude: {issCoordinates.longitude}</div>
      </div>
    </div>
  );
}
