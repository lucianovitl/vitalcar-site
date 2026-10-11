// src/components/ui/BMW3D.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Sparkles } from "@react-three/drei";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Mesh, Group } from "three";
import { Suspense } from "react";
import * as THREE from "three";

interface BMW3DProps {
  modelPath?: string;
  autoRotate?: boolean;
  scale?: number;
  position?: [number, number, number];
}

function BMWModel({ modelPath = "/models/bmw-m3.glb", scale = 1, position = [0, 0, 0] }: BMW3DProps) {
  const groupRef = useRef<Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const { actions } = useAnimations(animations as any, groupRef);

  useEffect(() => {
    if (actions) {
      Object.values(actions).forEach((action) => (action as any)?.play());
    }
    scene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, actions]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}

export function BMW3D({
  modelPath = "/models/bmw-m3.glb",
  autoRotate = true,
  scale = 1,
  position = [0, 0, 0],
}: BMW3DProps) {
  return (
    <div className="w-full h-full">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-vitalcar-red border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-vitalcar-text text-sm">Carregando BMW M3 Competition...</p>
          </div>
        </div>
      }>
        <Canvas
          camera={{ position: [2.5, 1.5, 2.5], fov: 45 }}
          style={{ background: "linear-gradient(to bottom, #0d0b0a, #162C6D)" }}
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-5, 5, -5]} intensity={0.4} color="#3B82F6" />
          <spotLight position={[5, 8, 5]} angle={0.4} penumbra={1} intensity={0.6} color="#F59E0B" castShadow />

          {/* 3D Model */}
          <BMWModel modelPath={modelPath} scale={scale} position={position} />

          {/* Environment */}
          <Environment preset="sunset" />

          {/* Glowing dust particles */}
          <Sparkles count={120} scale={[15, 10, 15]} size={2.5} speed={0.3} />

          {/* Ground shadow */}
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.6}
            scale={20}
            blur={2}
            far={10}
            resolution={256}
            color="#000000"
          />

          {/* Controls */}
          {autoRotate && (
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 3}
              maxDistance={8}
              minDistance={3}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  );
}

// Loader fallback with CSS-only 3D placeholder
export function BMW3DFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-vitalcar-bg to-vitalcar-bg2 relative overflow-hidden">
      {/* Animated car silhouette CSS */}
      <div className="relative w-48 h-24 opacity-30">
        {/* Car body */}
        <div className="absolute inset-x-0 bottom-6 h-8 bg-gradient-to-t from-vitalcar-text3 to-vitalcar-text2 rounded-t-lg blur-sm" />
        {/* Cabin */}
        <div className="absolute inset-x-8 bottom-14 h-7 bg-gradient-to-t from-vitalcar-text3 to-vitalcar-text2 rounded-t-lg blur-sm" />
        {/* Wheels */}
        <div className="absolute -left-2 bottom-2 w-6 h-6 bg-vitalcar-text3 rounded-full blur-md" />
        <div className="absolute -left-2 bottom-2 w-6 h-6 bg-black/80 rounded-full" />
        <div className="absolute -right-2 bottom-2 w-6 h-6 bg-vitalcar-text3 rounded-full blur-md" />
        <div className="absolute -right-2 bottom-2 w-6 h-6 bg-black/80 rounded-full" />
        {/* Fog lights */}
        <div className="absolute left-4 bottom-2 w-2 h-2 bg-vitalcar-yellow rounded-full shadow-[0_0_10px_2px_rgba(245,197,24,0.8)] animate-pulse" />
        <div className="absolute right-4 bottom-2 w-2 h-2 bg-vitalcar-yellow rounded-full shadow-[0_0_10px_2px_rgba(245,197,24,0.8)] animate-pulse" />
        {/* M3 badge */}
        <div className="absolute top-1/4 right-1/4 text-vitalcar-red text-[10px] font-bold tracking-wider drop-shadow-md">
          M3
        </div>
      </div>
      
      {/* Text overlay */}
      <div className="absolute bottom-8 text-center px-4">
        <h3 className="text-vitalcar-text text-2xl font-bold mb-2">BMW M3 Competition</h3>
        <p className="text-vitalcar-text2 text-sm">Performance. Precisão. <span className="vitalcar-text-gradient">Distinção.</span></p>
      </div>
    </div>
  );
}
