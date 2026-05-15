"use client";

import { Trash2 } from "lucide-react";
import { useChat } from "@/lib/contexts/chat-context";

// Header del panel de chat con título y botón para limpiar el historial
export function ChatHeader() {
  const { messages, clearMessages } = useChat();

  const handleClear = async () => {
    // Pedimos confirmación antes de borrar para evitar pérdida accidental
    if (!window.confirm("¿Limpiar el historial del chat? Esta acción no se puede deshacer.")) return;
    await clearMessages();
  };

  return (
    <div className="h-14 flex items-center justify-between px-6 border-b border-neutral-200/60">
      <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">
        React Component Generator
      </h1>

      {/* Botón de limpiar chat — deshabilitado cuando no hay mensajes */}
      <button
        onClick={handleClear}
        disabled={messages.length === 0}
        title="Limpiar chat"
        className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-400 disabled:hover:bg-transparent transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
