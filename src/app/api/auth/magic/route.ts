import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'El acceso por correo electrónico fue deshabilitado. Ingresa únicamente con WhatsApp (Olimpus).',
    },
    { status: 410 }
  );
}
