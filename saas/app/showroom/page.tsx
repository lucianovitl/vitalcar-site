// src/app/showroom/page.tsx
"use client";

import { BMW3D } from "@/components/ui/BMW3D";

export default function ShowroomPage() {
  return (
    <div className="min-h-screen bg-vitalcar-bg">
      <div className="w-full h-screen">
        <BMW3D 
          modelPath="/models/bmw-m3-competition.glb"
          autoRotate={true}
          scale={1}
          position={[0, 0, 0]}
        />
      </div>
    </div>
  );
}
