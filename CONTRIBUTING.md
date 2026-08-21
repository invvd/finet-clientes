# Contribuir a finet-clientes

Este documento describe cómo se trabaja con git en este repo — es una convención **observada en la práctica** (reconstruida del historial de commits y ramas), no un proceso escrito de antemano. Si algo aquí no refleja cómo el equipo quiere trabajar, actualizar este archivo.

## Ramas

- **`main`** — rama de producción/release.
- **`dev`** — rama de integración. El trabajo terminado se acumula acá antes de pasar a `main`.
- **`review/<tema>`** o rama de feature — trabajo en curso. Se cierra mergeándola a `dev` (o abriendo PR hacia `dev`) cuando el trabajo está listo, y luego se borra (local + remota).

`main` y `dev` pueden divergir (cada una con commits propios que la otra no tiene) — **no asumas que una es ancestro de la otra sin comprobarlo**:

```bash
git log dev..main --oneline    # commits en main que dev no tiene
git log main..dev --oneline    # commits en dev que main no tiene
```

Antes de cerrar una rama de feature, confirmá cuál es su verdadera base comparando conteos de commits contra cada candidata (`dev`, `main`) — la que tenga **0 commits propios que la rama de feature no tenga** es la base real, aunque `git branch --show-current`/`@{upstream}` no lo diga directamente.

### Integrar `dev` → `main`

Se hace vía Pull Request (`gh pr create --base main --head dev`), no merge directo — permite revisión antes del release.

### Cerrar una rama de feature/review hacia `dev`

Si `dev` resulta ser ancestro de la rama (fast-forward posible), mergear directo es más simple que un PR:

```bash
git checkout dev
git merge <rama> --ff-only
git push origin dev
git branch -d <rama>
git push origin --delete <rama>
```

Si no es fast-forward, o el trabajo necesita revisión antes de integrarse, usar PR (`gh pr create --base dev --head <rama>`) en vez de forzar el merge.

## Commits — contextual commits

El subject sigue [Conventional Commits](https://www.conventionalcommits.org/) tal cual (`feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`). El body además puede llevar **action lines** tipadas que capturan el *por qué*, no el *qué* (eso ya lo muestra el diff):

```
feat(deuda): detalle del plan, botón de pago y excepciones CU-41

intent(deuda): mostrar el plan contratado y un botón de pago en la consulta pública y el portal
decision(deuda-pago): botón "Pagar ahora" sin acción por ahora — la pasarela de pago es CU-42+
constraint(deuda-cu41): no se modela el "ciclo de facturación activo" — se siguen devolviendo todas las facturas
learned(deuda-tests): los mocks de DeudaLookupForm.test estaban desactualizados
```

Tipos disponibles: `intent`, `decision`, `rejected`, `constraint`, `learned`. El más valioso es `rejected` — evita que alguien vuelva a proponer algo que ya se descartó, siempre con la razón.

No es obligatorio en cada commit — un fix trivial no necesita action lines, el subject alcanza. La guía completa está en [`.claude/skills/contextual-commit/SKILL.md`](.claude/skills/contextual-commit/SKILL.md).

Para reconstruir contexto rápido al retomar trabajo o cambiar de rama, usar el historial con estas action lines (`git log <base>..HEAD --format="%H%n%s%n%b"`) — es la fuente más confiable de decisiones y restricciones del proyecto, más que cualquier doc estático.

## Casos de uso (CU-XX / RF-XX)

Los commits y la documentación de API referencian números de caso de uso (`CU-41`) y requisito funcional (`RF-09`). El glosario reconstruido de qué es cada uno está en [`docs/CASOS-DE-USO.md`](docs/CASOS-DE-USO.md) — actualizarlo cuando se implemente un CU nuevo o se identifique uno de los que faltan.

## Antes de mergear a `main`

- `pnpm -r lint` y `pnpm -r build` sin errores (mínimo).
- `pnpm -r test` — y si se agrega una página/componente sin tests, agregarlos antes de pedir review, no después.
- Revisar que no haya commits "WIP" o auto-generados por herramientas del editor coladas en la rama — pasó al menos una vez (ver historial de `main`) y no se detecta con `git status`, solo comparando `git log <rama> -1` contra lo que realmente se quiso commitear.
