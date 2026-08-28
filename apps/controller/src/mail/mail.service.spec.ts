import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

const sendMailMock = jest
  .fn<() => Promise<void>>()
  .mockResolvedValue(undefined);
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

jest.unstable_mockModule('nodemailer', () => ({
  default: { createTransport: createTransportMock },
  createTransport: createTransportMock,
}));

const { MailService } = await import('./mail.service.js');

function buildConfigService(overrides: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string, def?: unknown) =>
      key in overrides ? overrides[key] : def,
    ),
  };
}

describe('MailService', () => {
  let service: InstanceType<typeof MailService>;

  beforeEach(async () => {
    sendMailMock.mockClear();
    createTransportMock.mockClear();

    const module = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: buildConfigService() },
      ],
    }).compile();

    service = module.get(MailService);
  });

  describe('sendComprobantePago (CU-53)', () => {
    it('envía el correo con el PDF adjunto al destinatario correcto', async () => {
      const buffer = Buffer.from('%PDF-fake');

      await service.sendComprobantePago(
        'juan@test.cl',
        'Juan Perez',
        buffer,
        'comprobante-pago-1.pdf',
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'juan@test.cl',
          subject: 'Comprobante de pago - Portal Clientes',
          attachments: [
            { filename: 'comprobante-pago-1.pdf', content: buffer },
          ],
        }),
      );
    });

    it('el HTML incluye el nombre del cliente', async () => {
      await service.sendComprobantePago(
        'juan@test.cl',
        'Juan Perez',
        Buffer.from('x'),
        'a.pdf',
      );

      const opciones = sendMailMock.mock.calls[0][0] as { html: string };
      expect(opciones.html).toContain('Juan Perez');
    });

    it('usa el remitente por defecto si MAIL_FROM no está configurada', async () => {
      await service.sendComprobantePago(
        'juan@test.cl',
        'Juan Perez',
        Buffer.from('x'),
        'a.pdf',
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Portal Clientes" <no-reply@finet.cl>',
        }),
      );
    });

    it('usa MAIL_FROM de la configuración cuando está definida', async () => {
      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: buildConfigService({
              MAIL_FROM: '"Finet" <no-reply@finet.cl>',
            }),
          },
        ],
      }).compile();
      const otroService = module.get(MailService);

      await otroService.sendComprobantePago(
        'juan@test.cl',
        'Juan Perez',
        Buffer.from('x'),
        'a.pdf',
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ from: '"Finet" <no-reply@finet.cl>' }),
      );
    });

    it('propaga el error si el transporte de correo falla (el reintento lo maneja PagosService)', async () => {
      sendMailMock.mockRejectedValueOnce(new Error('smtp down'));

      await expect(
        service.sendComprobantePago(
          'juan@test.cl',
          'Juan Perez',
          Buffer.from('x'),
          'a.pdf',
        ),
      ).rejects.toThrow('smtp down');
    });
  });
});
