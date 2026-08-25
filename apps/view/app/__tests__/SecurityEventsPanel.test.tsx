import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SecurityEventsPanel from "@/app/_components/admin/SecurityEventsPanel";

async function entrar(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("heading", { name: "Acceso administrativo" });
  await user.type(screen.getByLabelText("Clave interna"), "clave-prueba");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("SecurityEventsPanel (CU-06)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    global.fetch = jest.fn();
  });

  it("muestra estado vacío cuando no existen bloqueos", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
    });

    render(<SecurityEventsPanel />);
    await entrar(user);

    expect(
      await screen.findByText("Sin registros de bloqueo"),
    ).toBeInTheDocument();
  });

  it("muestra IP, fecha, hora e intentos y permite desbloquear", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                ip: "192.168.1.10",
                total_intentos: 5,
                bloqueos_activos: 1,
                ultimo_intento: "2026-08-24T10:30:00.000Z",
                bloqueado: true,
                bloqueado_hasta: "2026-08-24T10:45:00.000Z",
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ desbloqueado: true, registros_afectados: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0, page: 1, limit: 20 }),
      });

    render(<SecurityEventsPanel />);
    await entrar(user);

    expect(await screen.findByText("192.168.1.10")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desbloquear" }));

    expect(
      await screen.findByText("La IP 192.168.1.10 fue desbloqueada."),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:4000/api/admin/intentos-fallidos/desbloquear-ip",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ip: "192.168.1.10" }),
      }),
    );
  });

  it("vuelve al acceso cuando la clave no es válida", async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "Invalid API key" }),
    });

    render(<SecurityEventsPanel />);
    await entrar(user);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Acceso administrativo" }),
      ).toBeInTheDocument();
    });
  });
});
