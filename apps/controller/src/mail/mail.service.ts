import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = this.configService.get<number>('SMTP_PORT', 1025);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        host !== 'localhost'
          ? {
              user: this.configService.get<string>('SMTP_USER', ''),
              pass: this.configService.get<string>('SMTP_PASS', ''),
            }
          : undefined,
    });

    this.logger.log(`Mail configured: ${host}:${port}`);
  }

  async sendPasswordReset(email: string, nombre: string, link: string) {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      '"Portal Clientes" <no-reply@finet.cl>';

    const html = this.resetTemplate(nombre, link);

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Recuperación de contraseña - Portal Clientes',
      html,
    });

    this.logger.log('Password reset email sent');
  }

  async sendPasswordChanged(email: string, nombre: string) {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      '"Portal Clientes" <no-reply@finet.cl>';

    const html = this.changedTemplate(nombre);

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Contraseña actualizada - Portal Clientes',
      html,
    });

    this.logger.log('Password changed email sent');
  }

  /**
   * CU-53: envía el comprobante de pago adjunto en PDF. El llamador
   * (`PagosService`) es responsable del reintento — este método solo hace
   * un intento de envío y deja que el error se propague.
   */
  async sendComprobantePago(
    email: string,
    nombre: string,
    pdfBuffer: Buffer,
    nombreArchivo: string,
  ) {
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      '"Portal Clientes" <no-reply@finet.cl>';

    const html = this.comprobanteTemplate(nombre);

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Comprobante de pago - Portal Clientes',
      html,
      attachments: [{ filename: nombreArchivo, content: pdfBuffer }],
    });

    this.logger.log('Comprobante de pago email sent');
  }

  private resetTemplate(nombre: string, link: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #1a56db;">Portal Clientes</h2>
    <p>Hola ${nombre},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
    <p style="text-align: center;">
      <a href="${link}" style="display: inline-block; background: #1a56db; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Restablecer contraseña</a>
    </p>
    <p style="font-size: 12px; color: #666;">Este enlace expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
  </div>
</body>
</html>`;
  }

  private changedTemplate(nombre: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #1a56db;">Portal Clientes</h2>
    <p>Hola ${nombre},</p>
    <p>Tu contraseña ha sido actualizada exitosamente.</p>
    <p style="font-size: 12px; color: #666;">Si no realizaste este cambio, contacta a soporte de inmediato.</p>
  </div>
</body>
</html>`;
  }

  private comprobanteTemplate(nombre: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #1a56db;">Portal Clientes</h2>
    <p>Hola ${nombre},</p>
    <p>Adjuntamos el comprobante de tu pago.</p>
    <p style="font-size: 12px; color: #666;">Este es un mensaje automático, no responder.</p>
  </div>
</body>
</html>`;
  }
}
