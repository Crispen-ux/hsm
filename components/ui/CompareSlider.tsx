"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { BeforeAfterImages } from "@/lib/site-config";

const KEY_STEP = 5;

export function CompareSlider({ images }: { images: BeforeAfterImages }) {
  const [position, setPosition] = useState(50);
  const container = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromPointer = useCallback((clientX: number) => {
    const box = container.current?.getBoundingClientRect();
    if (!box || box.width === 0) {
      return;
    }
    const next = ((clientX - box.left) / box.width) * 100;
    setPosition(Math.min(100, Math.max(0, Math.round(next))));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) {
      updateFromPointer(event.clientX);
    }
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setPosition((current) => Math.max(0, current - KEY_STEP));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setPosition((current) => Math.min(100, current + KEY_STEP));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(100);
    }
  };

  return (
    <div
      ref={container}
      className="chamfer-2 relative w-full touch-pan-y select-none overflow-hidden bg-hawk-obsidian-card"
      style={{ aspectRatio: `${images.width} / ${images.height}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Image src={images.beforeSrc} alt={images.beforeAlt} width={images.width} height={images.height} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <Image src={images.afterSrc} alt={images.afterAlt} width={images.width} height={images.height} className="h-full w-full object-cover" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
        aria-valuetext={`${position}% coated`}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 flex w-12 -translate-x-1/2 cursor-ew-resize items-center justify-center"
        style={{ left: `${position}%` }}
      >
        <span className="h-full w-px bg-hawk-crimson" />
        <span className="chamfer absolute h-10 w-10 bg-hawk-crimson" />
      </div>
    </div>
  );
}
