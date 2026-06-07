import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DebtStatusSection from '@/app/_components/portal/DebtStatusSection';
import type { Balance } from '@/app/portal/_lib/portal-api';

describe('DebtStatusSection', () => {
  it('muestra "Todo al día" cuando no hay deuda y saldo_confirmado es true (CU-27)', () => {
    const balance: Balance = {
      tiene_deuda: false,
      saldo_total: 0,
      saldo_confirmado: true,
      facturas_pendientes: [],
    };

    render(<DebtStatusSection balance={balance} />);

    expect(screen.getByText(/todo al día/i)).toBeInTheDocument();
    expect(screen.getByText(/no tienes pagos pendientes/i)).toBeInTheDocument();
  });

  it('muestra saldo pendiente cuando tiene_deuda es true (CU-28)', () => {
    const balance: Balance = {
      tiene_deuda: true,
      saldo_total: 59880,
      saldo_confirmado: true,
      facturas_pendientes: [
        {
          id_factura: 1,
          periodo: 'Mayo 2026',
          monto: 29990,
          fecha_limite_pago: '2026-05-15',
          estado: 'vencida',
          dias_vencida: 22,
        },
        {
          id_factura: 2,
          periodo: 'Junio 2026',
          monto: 29890,
          fecha_limite_pago: '2026-06-15',
          estado: 'pendiente',
          dias_vencida: null,
        },
      ],
    };

    render(<DebtStatusSection balance={balance} />);

    expect(screen.getByText(/facturas pendiente/i)).toBeInTheDocument();
  });

  it('muestra mensaje de saldo no disponible cuando saldo_confirmado es false (CU-27 Excepción 3)', () => {
    const balance: Balance = {
      tiene_deuda: false,
      saldo_total: 0,
      saldo_confirmado: false,
      facturas_pendientes: [],
    };

    render(<DebtStatusSection balance={balance} />);

    expect(
      screen.getByText(/no se pudo determinar tu estado de cuenta/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/inconsistencias/i)).toBeInTheDocument();
  });
});
