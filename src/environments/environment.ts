/**
 * Desarrollo local. Sin Azure: el token se emite con
 *   node infra/local/jwt/mint.mjs OPERADOR
 * y se pega en la pantalla de login. Mismo formato que el de Azure AD,
 * asi que el resto de la app no distingue.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  auth: {
    mode: 'dev' as 'dev' | 'msal',
    msal: {
      clientId: '',
      tenantId: '',
      redirectUri: 'http://localhost:4200',
      apiScope: 'api://agrotrack-local/access_as_user',
    },
  },
};
