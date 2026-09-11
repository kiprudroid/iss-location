"use client";

import { useEffect, useRef, useState } from "react";
import { fetchIssCoordinates } from "./coordinatesApi";

const MAP_IMAGE_WIDTH = 1280;
const MAP_IMAGE_HEIGHT = 817;
const MAP_ASPECT_RATIO = MAP_IMAGE_WIDTH / MAP_IMAGE_HEIGHT;

// Lucide Satellite SVG path (24x24 viewBox, we'll scale it)
const SATELLITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
  fill="none" stroke="%2300ff41" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 7L9 3 5 7l4 4"/>
  <path d="m17 11 4 4-4 4-4-4"/>
  <path d="m8 12 4 4 6-6-4-4Z"/>
  <path d="m16 8 3-3"/>
  <path d="M9 21a6 6 0 0 0-6-6"/>
</svg>`;

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
  const satelliteImageRef = useRef<HTMLImageElement | null>(null);
  const [issCoordinates, setIssCoordinates] = useState({
    latitude: "0.0000",
    longitude: "0.0000",
  });

  const coordinatesRef = useRef(issCoordinates);
  coordinatesRef.current = issCoordinates;

  // Preload the map image and satellite icon
  useEffect(() => {
    const mapImg = new Image();
    mapImg.src = "/gall-peters-projection.png";
    mapImg.onload = () => {
      mapImageRef.current = mapImg;
    };

    // Create satellite icon from SVG data URI
    const satImg = new Image();
    satImg.src = `data:image/svg+xml,${SATELLITE_SVG}`;
    satImg.onload = () => {
      satelliteImageRef.current = satImg;
    };
  }, []);

  // Poll ISS coordinates every second
  useEffect(() => {
    let isMounted = true;

    const loadCoordinates = async () => {
      try {
        const nextCoordinates = await fetchIssCoordinates();
        if (isMounted) setIssCoordinates(nextCoordinates);
      } catch {
        if (isMounted)
          setIssCoordinates({ latitude: "0.0000", longitude: "0.0000" });
      }
    };

    loadCoordinates();
    const intervalId = window.setInterval(loadCoordinates, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  // Render loop using requestAnimationFrame for continuous accurate rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;

    const drawFrame = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const scale = window.devicePixelRatio || 1;

      const needsResize =
        canvas.width !== Math.floor(width * scale) ||
        canvas.height !== Math.floor(height * scale);

      if (needsResize) {
        canvas.width = Math.floor(width * scale);
        canvas.height = Math.floor(height * scale);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Calculate perfect aspect ratio fitting (contain)
      const mapWidthCandidate = width;
      const mapHeightCandidate = mapWidthCandidate / MAP_ASPECT_RATIO;
      const mapWidth =
        mapHeightCandidate > height
          ? height * MAP_ASPECT_RATIO
          : mapWidthCandidate;
      const mapHeight =
        mapHeightCandidate > height ? height : mapHeightCandidate;
      const offsetX = (width - mapWidth) / 2;
      const offsetY = (height - mapHeight) / 2;

      // 1. Draw the map image directly on the canvas background
      if (mapImageRef.current) {
        ctx.drawImage(
          mapImageRef.current,
          offsetX,
          offsetY,
          mapWidth,
          mapHeight,
        );
      }

      // 2. Map coordinates relative to the exact drawn image bounds
      const coords = coordinatesRef.current;
      const point = coordinateMapper(
        coords.latitude,
        coords.longitude,
        mapWidth,
        mapHeight,
        offsetX,
        offsetY,
      );

      // 3. Draw satellite icon centered on ISS position
      const iconSize = Math.max(20, Math.min(36, Math.round(width / 30)));
      if (satelliteImageRef.current) {
        ctx.drawImage(
          satelliteImageRef.current,
          point.x - iconSize / 2,
          point.y - iconSize / 2,
          iconSize,
          iconSize,
        );
      } else {
        // Fallback: green dot while icon loads
        const dotRadius = Math.max(4, Math.min(8, Math.round(width / 200)));
        ctx.beginPath();
        ctx.fillStyle = "#00ff41";
        ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    animationId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="terminal-scanlines relative absolute bottom-4 left-4 rounded border border-[#00ff41]/30 bg-black/70 px-4 py-3 font-mono text-xs tracking-widest backdrop-blur-sm sm:text-sm">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-[#00ff41]/60 sm:text-xs">
          {"// ISS TELEMETRY"}
        </div>
        <div className="terminal-glow flex items-center gap-2 text-[#00ff41]">
          <span className="text-[#00ff41]/50">LAT</span>
          <span className="tabular-nums">{issCoordinates.latitude}</span>
        </div>
        <div className="terminal-glow flex items-center gap-2 text-[#00ff41]">
          <span className="text-[#00ff41]/50">LON</span>
          <span className="tabular-nums">{issCoordinates.longitude}</span>
        </div>
        <div className="mt-1 h-px w-full bg-[#00ff41]/10" />
        <div className="terminal-blink mt-1 text-[10px] text-[#00ff41]/40">
          STATUS: TRACKING
        </div>
      </div>
    </div>
  );
}
