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
7. Para PRs de Franco o futuros colaboradores: review de un CODEOWNER +
   CI verde + checklist tildado => merge. Para PRs de Ivan (bypass en
   `develop`): CI verde + checklist tildado alcanzan; el review queda como
   buena practica pero no es bloqueante.
8. Preferimos **squash merge** para mantener el historial lineal en `develop`.

## Releases

- Al cerrar un sprint o un bloque de features listo para demo / entrega de
  avance de tesis, se arma `release/<version>` desde `develop`.
- En la rama de release se corrigen bugs finales. Cuando esta estable se
  mergea a `main` con merge commit (no squash) y se tagea:
  `git tag -a v0.2.0 -m "Release 0.2.0" && git push --tags`.
- Luego se mergea `main` de vuelta a `develop` para mantener los fixes.

## Proteccion de ramas (configurada via Rulesets)

Las ramas `main` y `develop` estan protegidas por dos rulesets activos en
`Settings -> Rules -> Rulesets`. La proteccion comparte el grueso de las
reglas y se diferencia en quien puede bypassearlas.

### Reglas comunes a `main` y `develop`

- Requerir PR antes de mergear (no se permite push directo).
- Requerir CI verde en los tres jobs: `Lint + typecheck`, `Unit tests`,
  `Build web + api`.
- Requerir 1 aprobacion (PRs no se pueden auto-aprobar).
- Requerir review de un Code Owner (segun `.github/CODEOWNERS`).
- Requerir resolucion de todas las conversaciones del PR.
- Requerir que la rama este al dia con la base antes de mergear.
- Requerir historial lineal (squash o rebase, no merge commits).
- Bloquear force-push y deletions.
- Solo se permiten merge methods: `Squash` y `Rebase` (no `Merge commit`).

### Diferencia: bypass list

- **`main` no admite bypass.** Para mergear a `main` se necesita SI O SI
  CI verde + aprobacion del otro integrante. Refleja que `main` es la
  rama de release y la aprobacion conjunta queda como evidencia de
  auditoria para la tesis.
- **`develop` admite bypass para `@ivishooo` (Ivan).** Como product owner
  y responsable principal del codebase, los PRs de Ivan a `develop`
  pueden mergearse con CI verde sin esperar aprobacion adicional. Los
  PRs de cualquier otro integrante (Franco, futuros colaboradores)
  siguen el flujo estandar y requieren aprobacion. Esta asimetria
  refleja la division real de responsabilidades del equipo y evita
  que el proceso entorpezca el ritmo de desarrollo.

## Convenciones extra

- Un PR, una intencion. Si estas resolviendo dos temas distintos, son dos PRs.
- Si el PR modifica `packages/shared` o `packages/tokens`, aclararlo en la
  descripcion: esos cambios impactan web + mobile + api.
- Si el cambio toma una decision arquitectonica no trivial, va acompanado de
  un ADR nuevo en `docs/adr/`.
- Los commits generados por Claude Code incluyen `Co-Authored-By:` cuando
  corresponda, para mantener trazabilidad en la tesis.
