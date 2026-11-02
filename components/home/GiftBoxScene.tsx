"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

type GiftBoxSceneProps = {
  dark: boolean;
  reducedMotion?: boolean;
  active?: boolean;
};

const GOLD = "#C9A227";
const OPEN_ANGLE = -THREE.MathUtils.degToRad(35);
const OPEN_SECONDS = 0.62;
const HOLD_SECONDS = 2;
const CYCLE_SECONDS = OPEN_SECONDS * 2 + HOLD_SECONDS;
const GOLD_MATERIAL = { color: GOLD, metalness: 1, roughness: 0.28 };

function smoothStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function CameraAim() {
  const camera = useThree(state => state.camera);
  useLayoutEffect(() => {
    camera.lookAt(0, 0.08, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Sprout({ groupRef }: { groupRef: RefObject<THREE.Group | null> }) {
  const stemGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.035, 0.16, 0),
      new THREE.Vector3(0.025, 0.32, 0),
      new THREE.Vector3(0.075, 0.48, 0),
    ]);
    return new THREE.TubeGeometry(curve, 16, 0.018, 8, false);
  }, []);

  return (
    <group ref={groupRef} position={[0, 1.02, 0]} scale={[1, 0, 1]}>
      <mesh geometry={stemGeometry} castShadow>
        <meshStandardMaterial {...GOLD_MATERIAL} />
      </mesh>
      <RoundedBox position={[-0.11, 0.21, 0]} args={[0.09, 0.14, 0.07]} radius={0.035} smoothness={3} rotation={[0, 0, -0.42]} castShadow>
        <meshStandardMaterial {...GOLD_MATERIAL} />
      </RoundedBox>
      <RoundedBox position={[0.015, 0.34, 0]} args={[0.09, 0.19, 0.07]} radius={0.035} smoothness={3} rotation={[0, 0, 0.13]} castShadow>
        <meshStandardMaterial {...GOLD_MATERIAL} />
      </RoundedBox>
      <RoundedBox position={[0.12, 0.48, 0]} args={[0.09, 0.25, 0.07]} radius={0.035} smoothness={3} rotation={[0, 0, 0.4]} castShadow>
        <meshStandardMaterial {...GOLD_MATERIAL} />
      </RoundedBox>
    </group>
  );
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
      root.current.rotation.y = -0.2;
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

    root.current.position.y = Math.sin(clock.current * 1.1) * 0.035;
    root.current.rotation.y = -0.2 + Math.sin(clock.current * 0.28) * 0.12;
    lidHinge.current.rotation.x = OPEN_ANGLE * opening;
    sprout.current.scale.y = opening;
  });

  const boxColor = dark ? "#1B2A44" : "#F3EEE3";
  const boxMaterial = {
    color: boxColor,
    roughness: 0.55,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  };

  return (
    <group position={[0, -0.84, 0]}>
      <group ref={root} onPointerEnter={startSequence}>
        {/* The base is 1.4 × 1 × 1.4, with all ribbon surfaces offset 0.005. */}
        <RoundedBox position={[0, 0.5, 0]} args={[1.4, 1, 1.4]} radius={0.06} smoothness={5} castShadow receiveShadow>
          <meshPhysicalMaterial {...boxMaterial} />
        </RoundedBox>

        {/* Crossed bands wrap the four base faces and continue over the lid. */}
        <mesh position={[0, 0.5, 0.705]} castShadow>
          <boxGeometry args={[0.16, 1, 0.01]} />
          <meshStandardMaterial {...GOLD_MATERIAL} />
        </mesh>
        <mesh position={[0, 0.5, -0.705]} castShadow>
          <boxGeometry args={[0.16, 1, 0.01]} />
          <meshStandardMaterial {...GOLD_MATERIAL} />
        </mesh>
        <mesh position={[0.705, 0.5, 0]} castShadow>
          <boxGeometry args={[0.01, 1, 0.16]} />
          <meshStandardMaterial {...GOLD_MATERIAL} />
        </mesh>
        <mesh position={[-0.705, 0.5, 0]} castShadow>
          <boxGeometry args={[0.01, 1, 0.16]} />
          <meshStandardMaterial {...GOLD_MATERIAL} />
        </mesh>

        {/* Hinge pivot sits on the back edge; the open angle is limited to 35°. */}
        <group ref={lidHinge} position={[0, 1.11, -0.74]}>
          <RoundedBox position={[0, 0, 0.74]} args={[1.48, 0.22, 1.48]} radius={0.06} smoothness={5} castShadow receiveShadow>
            <meshPhysicalMaterial {...boxMaterial} />
          </RoundedBox>
          <mesh position={[0, 0.115, 0.74]} castShadow>
            <boxGeometry args={[1.48, 0.01, 0.16]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0, 0.115, 0.74]} castShadow>
            <boxGeometry args={[0.16, 0.01, 1.48]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0, 0, 1.485]} castShadow>
            <boxGeometry args={[0.16, 0.22, 0.01]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0, 0, 0.005]} castShadow>
            <boxGeometry args={[0.16, 0.22, 0.01]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0.745, 0, 0.74]} castShadow>
            <boxGeometry args={[0.01, 0.22, 0.16]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[-0.745, 0, 0.74]} castShadow>
            <boxGeometry args={[0.01, 0.22, 0.16]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>

          {/* Bow loops, tilted outward, with a small central knot. */}
          <mesh position={[-0.14, 0.27, 0.74]} rotation={[0.15, -0.2, -0.52]} scale={[1, 0.82, 0.72]} castShadow>
            <torusGeometry args={[0.16, 0.045, 12, 32]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0.14, 0.27, 0.74]} rotation={[-0.12, 0.2, 0.52]} scale={[1, 0.82, 0.72]} castShadow>
            <torusGeometry args={[0.16, 0.045, 12, 32]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
          <mesh position={[0, 0.28, 0.76]} scale={[0.105, 0.08, 0.09]} castShadow>
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial {...GOLD_MATERIAL} />
          </mesh>
        </group>

        <Sprout groupRef={sprout} />
      </group>

      <ContactShadows position={[0, 0, 0]} scale={3.4} opacity={0.35} blur={2.5} far={1.5} />
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
        minHeight: 0,
        position: "relative",
        overflow: "visible",
        touchAction: "pan-y",
        cursor: reducedMotion ? "default" : "pointer",
      }}
    >
      <Canvas
        frameloop={active && !reducedMotion ? "always" : "never"}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [3, 2.5, 3.95], fov: 30, near: 0.1, far: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
        style={{ width: "100%", height: "100%", overflow: "visible", background: "transparent" }}
      >
        <CameraAim />
        <ambientLight intensity={dark ? 0.55 : 0.7} />
        <directionalLight position={[-4, 6, 4]} intensity={dark ? 1.5 : 1.8} color="#fff1d5" />
        <directionalLight position={[4, 3, 2]} intensity={0.7} color="#fffaf0" />
        <directionalLight position={[0, 4, -5]} intensity={1} color="#f2dcaa" />

        <Environment resolution={256} background={false} frames={1}>
          <Lightformer form="rect" intensity={3.8} color="#fff0d0" position={[-3, 5, 4]} rotation={[0.1, 0.45, 0]} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={1.8} color="#fffaf2" position={[4, 2.5, 1]} rotation={[0, -0.8, 0]} scale={[3, 4, 1]} />
          <Lightformer form="rect" intensity={2.4} color="#f3d58a" position={[0, 4, -4]} rotation={[0, Math.PI, 0]} scale={[4, 2.5, 1]} />
        </Environment>

        <GiftBoxModel dark={dark} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
