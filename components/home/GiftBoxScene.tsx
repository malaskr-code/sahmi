"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

type GiftBoxSceneProps = {
  dark: boolean;
  reducedMotion?: boolean;
  active?: boolean;
};

const GOLD = "#c9a227";
const LID_OPEN_ANGLE = -0.82;
const OPEN_SECONDS = 0.62;
const HOLD_SECONDS = 2;
const CYCLE_SECONDS = OPEN_SECONDS * 2 + HOLD_SECONDS;

function smoothStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function GiftBoxModel({
  dark,
  reducedMotion,
}: {
  dark: boolean;
  reducedMotion: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const lidHinge = useRef<THREE.Group>(null);
  const sprout = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const autoTimer = useRef(0);
  const clock = useRef(0);

  const startSequence = () => {
    if (!reducedMotion) elapsed.current = 0.0001;
  };

  useFrame((_, delta) => {
    if (!root.current || !lidHinge.current || !sprout.current) return;
    if (reducedMotion) {
      root.current.position.y = 0;
      root.current.rotation.y = -0.18;
      lidHinge.current.rotation.x = 0;
      sprout.current.scale.y = 0;
      return;
    }

    const step = Math.min(delta, 0.05);
    clock.current += step;
    autoTimer.current += step;
    if (autoTimer.current >= 6) {
      autoTimer.current %= 6;
      elapsed.current = 0.0001;
    }

    let opening = 0;
    if (elapsed.current > 0) {
      elapsed.current += step;
      const closeStart = OPEN_SECONDS + HOLD_SECONDS;
      if (elapsed.current <= OPEN_SECONDS) {
        opening = smoothStep(elapsed.current / OPEN_SECONDS);
      } else if (elapsed.current < closeStart) {
        opening = 1;
      } else if (elapsed.current < CYCLE_SECONDS) {
        opening = 1 - smoothStep((elapsed.current - closeStart) / OPEN_SECONDS);
      } else {
        elapsed.current = 0;
      }
    }

    root.current.position.y = Math.sin(clock.current * 1.3) * 0.045;
    root.current.rotation.y = -0.18 + Math.sin(clock.current * 0.32) * 0.14;
    lidHinge.current.rotation.x = LID_OPEN_ANGLE * opening;
    sprout.current.scale.y = opening;
  });

  const bodyColor = dark ? "#17263a" : "#f3eee2";
  const lidColor = dark ? "#203149" : "#fbf8ef";
  const goldMaterial = { color: GOLD, metalness: 0.72, roughness: 0.28 };

  return (
    <group ref={root} onPointerEnter={startSequence}>
      {/* Main wrapped parcel */}
      <RoundedBox position={[0, 0.77, 0]} args={[2.35, 1.48, 1.72]} radius={0.09} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={bodyColor} roughness={0.39} metalness={0.02} />
      </RoundedBox>

      {/* Ribbon bands wrap the front, back, and sides of the box */}
      <mesh position={[0, 0.78, 0.866]} castShadow>
        <boxGeometry args={[0.25, 1.5, 0.025]} />
        <meshStandardMaterial {...goldMaterial} />
      </mesh>
      <mesh position={[0, 0.78, -0.866]} castShadow>
        <boxGeometry args={[0.25, 1.5, 0.025]} />
        <meshStandardMaterial {...goldMaterial} />
      </mesh>
      <mesh position={[1.185, 0.78, 0]} castShadow>
        <boxGeometry args={[0.025, 1.5, 0.25]} />
        <meshStandardMaterial {...goldMaterial} />
      </mesh>
      <mesh position={[-1.185, 0.78, 0]} castShadow>
        <boxGeometry args={[0.025, 1.5, 0.25]} />
        <meshStandardMaterial {...goldMaterial} />
      </mesh>
      <mesh position={[0, 1.525, 0]} castShadow>
        <boxGeometry args={[2.37, 0.025, 0.25]} />
        <meshStandardMaterial {...goldMaterial} />
      </mesh>

      {/* Lid pivots from its back edge so the gift opens as one piece */}
      <group ref={lidHinge} position={[0, 1.49, -0.79]}>
        <RoundedBox position={[0, 0.095, 0.81]} args={[2.5, 0.22, 1.78]} radius={0.075} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color={lidColor} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.212, 0.81]} castShadow>
          <boxGeometry args={[2.47, 0.018, 0.24]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[0, 0.212, 0.81]} castShadow>
          <boxGeometry args={[0.24, 0.018, 1.76]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>

        {/* Soft sculpted bow loops, knot, and short ribbon tails */}
        <mesh position={[-0.23, 0.34, 0.82]} rotation={[0.25, -0.3, -0.52]} scale={[1.08, 0.78, 0.56]} castShadow>
          <torusGeometry args={[0.25, 0.065, 12, 36]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[0.23, 0.34, 0.82]} rotation={[-0.18, 0.28, 0.52]} scale={[1.08, 0.78, 0.56]} castShadow>
          <torusGeometry args={[0.25, 0.065, 12, 36]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[0, 0.35, 0.82]} scale={[0.16, 0.12, 0.13]} castShadow>
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[-0.18, 0.25, 0.83]} rotation={[0, 0, -0.35]} castShadow>
          <boxGeometry args={[0.18, 0.3, 0.07]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[0.18, 0.25, 0.83]} rotation={[0, 0, 0.35]} castShadow>
          <boxGeometry args={[0.18, 0.3, 0.07]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
      </group>

      {/* A tiny rising keepsake: stem and three ascending bar-shaped leaves */}
      <group ref={sprout} position={[0, 1.55, 0]} scale={[1, 0, 1]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.026, 0.04, 0.72, 12]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[-0.13, 0.29, 0]} rotation={[0, 0, -0.57]} castShadow>
          <boxGeometry args={[0.1, 0.25, 0.09]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[0.13, 0.52, 0]} rotation={[0, 0, 0.57]} castShadow>
          <boxGeometry args={[0.1, 0.28, 0.09]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
        <mesh position={[-0.1, 0.76, 0]} rotation={[0, 0, -0.45]} castShadow>
          <boxGeometry args={[0.09, 0.23, 0.08]} />
          <meshStandardMaterial {...goldMaterial} />
        </mesh>
      </group>
    </group>
  );
}

export default function GiftBoxScene({
  dark,
  reducedMotion = false,
  active = true,
}: GiftBoxSceneProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
        cursor: reducedMotion ? "default" : "pointer",
      }}
    >
      <Canvas
        frameloop={active && !reducedMotion ? "always" : "never"}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [4.2, 3.25, 5.2], fov: 35, near: 0.1, far: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <ambientLight intensity={dark ? 0.85 : 0.72} />
        <hemisphereLight args={["#fff6dc", dark ? "#26344a" : "#d9cfb8", 1.15]} />
        <directionalLight
          position={[-4.5, 7, 5]}
          intensity={dark ? 2.3 : 2.7}
          color="#fff1cf"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-4}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[4, 3, -4]} intensity={dark ? 0.55 : 0.35} color="#e9c96c" />
        <GiftBoxModel
          dark={dark}
          reducedMotion={reducedMotion}
        />
        <mesh position={[0, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={dark ? 0.28 : 0.19} />
        </mesh>
      </Canvas>
    </div>
  );
}
