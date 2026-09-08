/**
 * Produccion / AWS. Generado por infra/aws/gateway.ps1.
 * El scope es el del API (api://<CLIENT_ID>/access_as_user), el mismo audience
 * que validan el API Gateway y los servicios.
 */
export const environment = {
  production: true,
  apiUrl: 'https://85v8hc0ry6.execute-api.us-east-1.amazonaws.com',
  auth: {
    mode: 'msal' as 'dev' | 'msal',
    msal: {
      clientId: '44f417b1-ff99-4463-974a-56bb29cb66dd',
      tenantId: '74c11418-e5f3-4253-9755-b665d755321c',
      redirectUri: 'http://54.84.179.128',
      apiScope: 'api://44f417b1-ff99-4463-974a-56bb29cb66dd/access_as_user',
    },
  },
};
