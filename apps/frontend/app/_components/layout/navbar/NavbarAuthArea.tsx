"use client";

import { useAuth } from "../../../_lib/auth";
import PortalClienteButton from "./PortalClienteButton";
import UserMenu from "./UserMenu";

export default function NavbarAuthArea() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated ? <UserMenu /> : <PortalClienteButton />;
}
