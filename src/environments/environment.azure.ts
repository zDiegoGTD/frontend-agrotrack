// Lo genera infra/local/azure-local.ps1 con tu TENANT_ID y CLIENT_ID.
// Esta version es solo para que el proyecto compile sin haberlo corrido.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  auth: {
    mode: 'msal' as 'dev' | 'msal',
    msal: {
      clientId: 'REEMPLAZAR_CLIENT_ID',
      tenantId: 'REEMPLAZAR_TENANT_ID',
      redirectUri: 'http://localhost:4200',
      apiScope: 'api://REEMPLAZAR_CLIENT_ID/access_as_user',
    },
  },
};
