# AgroTrack — frontend

Aplicación Angular de **AgroTrack**, la plataforma de acopio y despacho de
producción agrícola del caso semestral de *Desarrollo Cloud Native I (DSY1107)*.

El backend (microservicios Spring Boot, infraestructura y documentación) vive en
[agrotrack-backend](https://github.com/zDiegoGTD/agrotrack-backend).

## Qué hace

| Pantalla | Ruta | Roles | Contenido |
|---|---|---|---|
| Inicio | `/dashboard` | todos | Indicadores, capacidad de bodegas, flujo de lotes y entregas recientes |
| Entregas | `/deliveries` | ADMIN, OPERADOR, CLIENTE | Registrar lotes y avanzarlos por la máquina de estados |
| Catálogo | `/catalog` | ADMIN, OPERADOR | Bodegas con semáforo de capacidad y productos (solo ADMIN edita) |
| Reportería | `/reports` | ADMIN | KPIs calculados desde los eventos de Kafka |
| Auditoría | `/audit` | ADMIN, AUDITOR | Línea de tiempo inmutable de cada lote |
| Mi sesión | `/sesion` | todos | Claims del token (roles, scopes, emisor, audiencia, vencimiento) y prueba en vivo de la autorización |

## Identidad: Azure AD con MSAL

- **Login y logout** con `@azure/msal-angular` por redirección (`loginRedirect`).
- **Token hacia el backend:** el `MsalInterceptor` oficial agrega el Bearer a
  toda llamada a `…/api/*`, pidiendo el scope `api://<clientId>/access_as_user`.
- **Guardas:** `authGuard` exige sesión y `roleGuard(...)` exige rol.
  Son un espejo de la matriz del BFF: la autorización real la hace el backend.
- **Roles desde el token:** el menú, las guardas y los botones leen el claim
  `roles` del access token. `/sesion` los muestra junto a los scopes (`scp`).

Flujo: navegador → **API Gateway** (valida el JWT) → **BFF** (vuelve a
validarlo y autoriza por rol) → microservicio.

## Estructura

```
src/app/
  core/
    auth/       MSAL, token de desarrollo, guardas e interceptor
    api/        ApiService: todas las llamadas al BFF y traducción de errores
    estados.ts  espejo de la máquina de estados, semáforo de capacidad
    token.ts    lectura de claims y matriz de pruebas de acceso
  shared/       insignia de estado, barra de capacidad, flujo de estados, modal
  shell/        barra lateral y superior
  pages/        una carpeta por pantalla
public/img/     logo, iconos y mascota
```

## Correr en local

Requisitos: Node 24 y el backend local levantado (ver el README de
agrotrack-backend).

```bash
npm ci
npm start                # http://localhost:4200, modo desarrollo
```

En **modo desarrollo** no se usa Azure: se pega un token emitido con
`node infra/local/jwt/mint.mjs ADMIN` (o `OPERADOR`, `CLIENTE`, `AUDITOR`) desde
el repo del backend.

Para probar el login real de Azure contra el backend local:

```bash
npm run start:azure
```

## Pruebas y build

```bash
npx ng test --watch=false
npx ng build             # configuración production
```

## Configuración por entorno

| Archivo | Uso |
|---|---|
| `src/environments/environment.ts` | Desarrollo: token pegado a mano, API en `localhost:8081` |
| `src/environments/environment.azure.ts` | MSAL real contra el backend local |
| `src/environments/environment.prod.ts` | AWS: MSAL y API por el API Gateway (HTTPS) |

## Despliegue

La imagen se construye con el `Dockerfile` (build de Node y luego nginx con
`try_files` para las rutas de Angular). En AWS la construye y levanta el stack
`apps` desde el repo del backend (`infra/aws/subir.ps1`), y el API Gateway la
sirve por HTTPS en la misma dirección que el API.
