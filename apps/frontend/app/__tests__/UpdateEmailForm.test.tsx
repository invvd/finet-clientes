import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/app/utils/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import UpdateEmailForm from '@/app/components/UpdateEmailForm';
import { api } from '@/app/utils/api';

describe('UpdateEmailForm (CU-09)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza campos de contraseña actual y nuevo email', () => {
    render(<UpdateEmailForm currentEmail="viejo@test.cl" />);
    expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nuevo correo electrónico/i)).toBeInTheDocument();
  });

  it('llama a PATCH /auth/perfil/email', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    (api.patch as jest.Mock).mockResolvedValueOnce({ id_cliente: 1, email: 'nuevo@test.cl' });

    render(<UpdateEmailForm currentEmail="viejo@test.cl" onUpdate={onUpdate} />);

    await user.type(screen.getByLabelText(/contraseña actual/i), 'TestPass1');
    await user.type(screen.getByLabelText(/nuevo correo electrónico/i), 'nuevo@test.cl');
    await user.click(screen.getByRole('button', { name: /actualizar correo/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/perfil/email', expect.any(Object));
      expect(onUpdate).toHaveBeenCalledWith('nuevo@test.cl');
    });
  });

  it('rechaza si el nuevo email es igual al actual', async () => {
    const user = userEvent.setup();
    render(<UpdateEmailForm currentEmail="mismo@test.cl" />);

    await user.type(screen.getByLabelText(/contraseña actual/i), 'TestPass1');
    await user.type(screen.getByLabelText(/nuevo correo electrónico/i), 'mismo@test.cl');
    await user.click(screen.getByRole('button', { name: /actualizar correo/i }));

    await waitFor(() => {
      expect(screen.getByText(/no puede ser igual al actual/i)).toBeInTheDocument();
    });
  });
});
