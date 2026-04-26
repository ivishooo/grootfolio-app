# GrootFolio - Flujo de Git

Este documento fija como trabajamos con Git en el monorepo. La idea es tener un
historial limpio para defender en la tesis y para onboardear colaboradores
nuevos (o a Claude Code) sin ambiguedad.

## Ramas de larga vida

- **`main`**: rama estable. Todo lo que esta aca tiene que poder desplegarse.
  Se actualiza solo por merge desde `develop` o `release/*`. Requiere PR
  aprobado y CI verde.
- **`develop`**: rama de integracion del equipo. Todas las features se mergean
  aca primero. Puede tener bugs menores, pero `pnpm typecheck` y `pnpm lint`
  siempre deben pasar.

## Ramas de corta vida

- **`feature/<slug>`**: desarrollo de una nueva funcionalidad.
  Ej: `feature/add-asset-form`, `feature/risk-quiz`.
- **`fix/<slug>`**: correccion de bug en funcionalidad ya mergeada.
  Ej: `fix/dashboard-chart-null`.
- **`chore/<slug>`**: tareas que no son ni feature ni bugfix (tooling, deps,
  infra, docs). Ej: `chore/setup-eslint`, `chore/bump-expo`.
- **`release/<version>`**: rama de estabilizacion previa al merge a `main`.
  Ej: `release/0.2.0`. Solo acepta bugfixes, no features nuevas.
- **`hotfix/<slug>`**: correccion urgente que se saca directo desde `main` y
  luego se backportea a `develop`.

Todas parten desde `develop` salvo `hotfix/*` que parte desde `main`.

## Conventional commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/). El tipo
va en minuscula y el alcance es opcional pero recomendado:

```
feat(web): agrega vista de holdings
fix(api): corrige parsing de precios de CoinGecko
refactor(shared): unifica formateo de moneda
docs(tesis): agrega ADR-0002 sobre cache de precios
chore(deps): bump adonis a 6.14
test(api): cubre calculo de promedio ponderado
```

Tipos permitidos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`,
`style`, `build`, `ci`, `revert`. Breaking changes se marcan con `!` o con
nota `BREAKING CHANGE:` en el cuerpo.

## Ciclo de trabajo

1. `git checkout develop && git pull`
2. `git checkout -b feature/mi-feature`
3. Commits chicos y descriptivos siguiendo la convencion.
4. `pnpm typecheck && pnpm lint && pnpm test` antes de pushear.
5. `git push -u origin feature/mi-feature`
6. Abrir PR hacia `develop` usando el template del repo.
7. Al menos un review de un CODEOWNER + CI verde + checklist tildado => merge.
8. Preferimos **squash merge** para mantener el historial lineal en `develop`.

## Releases

- Al cerrar un sprint o un bloque de features listo para demo / entrega de
  avance de tesis, se arma `release/<version>` desde `develop`.
- En la rama de release se corrigen bugs finales. Cuando esta estable se
  mergea a `main` con merge commit (no squash) y se tagea:
  `git tag -a v0.2.0 -m "Release 0.2.0" && git push --tags`.
- Luego se mergea `main` de vuelta a `develop` para mantener los fixes.

## Proteccion de ramas (recomendado al subir a GitHub)

Para `main` y `develop`:

- Requerir PR antes de mergear.
- Requerir CI verde (`lint-typecheck`, `test`, `build`).
- Requerir al menos 1 aprobacion.
- Requerir que la rama este al dia con la base.
- Prohibir push directo (incluido admins).
- Prohibir force-push.

## Convenciones extra

- Un PR, una intencion. Si estas resolviendo dos temas distintos, son dos PRs.
- Si el PR modifica `packages/shared` o `packages/tokens`, aclararlo en la
  descripcion: esos cambios impactan web + mobile + api.
- Si el cambio toma una decision arquitectonica no trivial, va acompanado de
  un ADR nuevo en `docs/adr/`.
- Los commits generados por Claude Code incluyen `Co-Authored-By:` cuando
  corresponda, para mantener trazabilidad en la tesis.
