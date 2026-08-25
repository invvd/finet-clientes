import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SoportePanel from "@/app/_components/soporte/SoportePanel";

const ticket = {
  id_ticket: 12,
  codigo_seguimiento: "FIN-2026-000012",
  estado: "en_progreso",
  prioridad: "media",
  descripcion: "La conexión se interrumpe",
  fecha_creacion: "2026-08-24T10:00:00.000Z",
  fecha_cierre: null,
  categoria: "Conectividad",
  cliente: "Juan Pérez",
};

async function ingresar(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Acceso a soporte" });
  await user.type(screen.getByLabelText("Clave interna"), "clave-prueba");
  await user.type(screen.getByLabelText("ID del técnico"), "7");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("SoportePanel (CU-78)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    global.fetch = jest.fn();
  });

  it("muestra un estado vacío cuando no hay tickets asignados", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ total: 0, tiene_tickets: false, tickets: [] }),
    });

    render(<SoportePanel />);
    await ingresar(user);

    expect(
      await screen.findByText("Sin tickets asignados"),
    ).toBeInTheDocument();
  });

  it("muestra descripción, categoría e historial del ticket seleccionado", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ total: 1, tiene_tickets: true, tickets: [ticket] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...ticket,
            historial: [
              {
                id_log: "1",
                accion: "ACTUALIZAR_TICKET_SOPORTE",
                detalle: "Se contactó al cliente",
                estado_anterior: "abierto",
                estado_nuevo: "en_progreso",
                fecha_hora: "2026-08-24T10:30:00.000Z",
                tecnico: "Ana Técnica",
              },
            ],
          }),
      });

    render(<SoportePanel />);
    await ingresar(user);
    await user.click(await screen.findByText("FIN-2026-000012"));

    expect(
      await screen.findByText("La conexión se interrumpe"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Conectividad").length).toBeGreaterThan(0);
    expect(screen.getByText("Se contactó al cliente")).toBeInTheDocument();
  });

  it("impide cerrar sin ingresar la resolución", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ total: 1, tiene_tickets: true, tickets: [ticket] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...ticket, historial: [] }),
      });

    render(<SoportePanel />);
    await ingresar(user);
    await user.click(await screen.findByText("FIN-2026-000012"));
    await user.selectOptions(screen.getByLabelText("Estado"), "cerrado");
    await user.click(
      screen.getByRole("button", { name: /confirmar resolución y cerrar/i }),
    );

    expect(
      screen.getByText("Ingresa el detalle de la resolución antes de cerrar."),
    ).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });
});
