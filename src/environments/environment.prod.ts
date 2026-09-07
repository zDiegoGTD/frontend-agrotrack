/**
 * Produccion / AWS: login corporativo con Azure AD via MSAL.
 * Los valores se completan con el App Registration "AgroTrack"
 * (docs/04-checklist-entorno.md, paso 3). El scope es el del API
 * (api://<API_CLIENT_ID>/access_as_user) y tiene que coincidir con el
 * audience que validan el API Gateway y los servicios.
 */
export const environment = {
  production: true,
  apiUrl: 'https://REEMPLAZAR-API-GATEWAY.execute-api.us-east-1.amazonaws.com',
  auth: {
    mode: 'msal' as 'dev' | 'msal',
    msal: {
      clientId: 'REEMPLAZAR_CLIENT_ID',
      tenantId: 'REEMPLAZAR_TENANT_ID',
      redirectUri: 'https://REEMPLAZAR-FRONTEND',
      apiScope: 'api://REEMPLAZAR_API_CLIENT_ID/access_as_user',
    },
  },
};
