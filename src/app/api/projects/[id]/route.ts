import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/projects/[id] — actualiza campos del proyecto (ej: limpiar mensajes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Solo permitimos actualizar el campo `messages` por ahora
  if (!("messages" in body)) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    const project = await prisma.project.update({
      where: {
        id,
        userId: session.userId, // Garantiza que solo el dueño puede modificarlo
      },
      data: {
        messages: JSON.stringify(body.messages),
      },
    });

    return NextResponse.json({ id: project.id });
  } catch {
    // Si el proyecto no existe o no pertenece al usuario, Prisma lanza un error
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
}
