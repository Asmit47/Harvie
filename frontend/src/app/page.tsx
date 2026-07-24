'use client';

import React from 'react';
import { NexusProvider } from '../context/NexusContext';
import { AgentCore } from '../components/AgentCore';
import { CommandBar } from '../components/CommandBar';
import { ContextZones } from '../components/ContextZones';
import { GhostSidebar } from '../components/GhostSidebar';
import { EphemeralReply } from '../components/EphemeralReply';
import { Modals } from '../components/Modals';

export default function Home() {
  return (
    <NexusProvider>
      {/* Full-Screen Relative Container (AppShell Layout Canvas) */}
      <main className="relative w-screen h-screen overflow-hidden bg-[#09090B] text-[#F4F4F5] antialiased select-none font-sans">
        {/* Layer 0: Deep Space Radial Vignette Background */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#111114_0%,_#09090B_100%)] opacity-80" />

        {/* Ambient Subtle Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Layer 1: The Ghost Rail (Sidebar) */}
        <GhostSidebar />

        {/* Layer 2: The Nucleus & Central Command Input */}
        <AgentCore />
        <EphemeralReply />
        <CommandBar />

        {/* Layer 3: Zonal Cards (Left: Time & Context, Right: Actions & Tasks) */}
        <ContextZones />

        {/* Layer 4: Interactive Modals (Memory Log, Settings, MCP Integrations) */}
        <Modals />
      </main>
    </NexusProvider>
  );
}
