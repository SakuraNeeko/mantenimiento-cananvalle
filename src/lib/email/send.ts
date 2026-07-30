import { Resend } from 'resend';

/**
 * Primer punto de uso real de `RESEND_API_KEY`/`EMAIL_FROM` (declaradas en
 * `.env.example` desde la Fase 1, sin usar hasta ahora). Si no están
 * configuradas, se registra un error controlado en vez de tronar — mismo
 * criterio que `subirDocumento()` con `BLOB_READ_WRITE_TOKEN` (Fase 3).
 */
export async function enviarEmail(args: { destinatarios: string[]; asunto: string; cuerpo: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error('[enviarEmail] RESEND_API_KEY o EMAIL_FROM no están configurados.');
    return { ok: false, error: 'El envío de correo no está configurado en este entorno.' };
  }
  if (args.destinatarios.length === 0) return { ok: false, error: 'No hay destinatarios.' };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: args.destinatarios,
      subject: args.asunto,
      text: args.cuerpo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    console.error('[enviarEmail]', error);
    return { ok: false, error: 'No se pudo enviar el correo.' };
  }
}
