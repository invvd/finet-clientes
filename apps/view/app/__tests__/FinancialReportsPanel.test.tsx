import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FinancialReportsPanel from "@/app/_components/admin/FinancialReportsPanel";

const reporte = {
  periodo: { desde: "2026-08-01", hasta: "2026-08-31" },
  generado_en: "2026-08-24T12:00:00.000Z",
  resumen: {
    total_ingresos: 25000,
    total_deudas: 12000,
    cantidad_pagos: 1,
    cantidad_facturas_pendientes: 1,
  },
  ingresos: [
    {
      id_pago: 1,
      fecha_pago: "2026-08-10T12:00:00.000Z",
      monto: 25000,
      pasarela: "webpay",
      cliente: "Juan Pérez",
    },
  ],
  deudas: [
    {
      id_factura: 9,
      periodo: "08-2026",
      fecha_emision: "2026-08-01T00:00:00.000Z",
      fecha_limite_pago: "2026-08-15T00:00:00.000Z",
      monto: 12000,
      estado: "pendiente",
      cliente: "Ana Pérez",
    },
  ],
};

async function entrar(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Acceso administrativo" });
  await user.type(screen.getByLabelText("Clave interna"), "clave-prueba");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

async function seleccionarPeriodo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Fecha inicial"), "2026-08-01");
  await user.type(screen.getByLabelText("Fecha final"), "2026-08-31");
}

describe("FinancialReportsPanel (CU-57/CU-58)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    global.fetch = jest.fn();
    URL.createObjectURL = jest.fn(() => "blob:reporte");
    URL.revokeObjectURL = jest.fn();
  });

  it("valida que el rango no esté invertido", async () => {
    const user = userEvent.setup();
    render(<FinancialReportsPanel />);
    await entrar(user);

    await user.type(screen.getByLabelText("Fecha inicial"), "2026-09-01");
    await user.type(screen.getByLabelText("Fecha final"), "2026-08-31");
    await user.click(screen.getByRole("button", { name: "Generar reporte" }));

    expect(
      screen.getByText(
        "La fecha inicial no puede ser posterior a la fecha final.",
      ),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("genera y visualiza el reporte consolidado", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(reporte),
    });

    render(<FinancialReportsPanel />);
    await entrar(user);
    await seleccionarPeriodo(user);
    await user.click(screen.getByRole("button", { name: "Generar reporte" }));

    expect(await screen.findByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getAllByText("$25.000")).toHaveLength(2);
    expect(screen.getAllByText("$12.000")).toHaveLength(2);
  });

  it("descarga el CSV del reporte generado", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reporte),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          "Content-Disposition":
            'attachment; filename="reporte-financiero.csv"',
        }),
        blob: () => Promise.resolve(new Blob(["csv"])),
      });

    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<FinancialReportsPanel />);
    await entrar(user);
    await seleccionarPeriodo(user);
    await user.click(screen.getByRole("button", { name: "Generar reporte" }));
    await user.click(
      await screen.findByRole("button", { name: "Descargar CSV" }),
    );

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(URL.createObjectURL).toHaveBeenCalled();
    click.mockRestore();
  });

  it("informa cuando el período no contiene datos", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () =>
        Promise.resolve({
          message: "No existen datos financieros para el periodo seleccionado",
        }),
    });

    render(<FinancialReportsPanel />);
    await entrar(user);
    await seleccionarPeriodo(user);
    await user.click(screen.getByRole("button", { name: "Generar reporte" }));

    expect(
      await screen.findByText(/no existen datos financieros/i),
    ).toBeInTheDocument();
  });
});
