/**
 * Produccion / AWS. Generado por infra/aws/gateway-frontend.ps1.
 *
 * La aplicacion y el API viven en el MISMO origen: el API Gateway sirve la
 * SPA en / y el API en /api. Eso da HTTPS (que Azure exige para los redirect
 * URI de una SPA) y elimina el CORS.
 */
export const environment = {
  production: true,
  apiUrl: 'https://85v8hc0ry6.execute-api.us-east-1.amazonaws.com',
  auth: {
    mode: 'msal' as 'dev' | 'msal',
    msal: {
      clientId: '44f417b1-ff99-4463-974a-56bb29cb66dd',
      tenantId: '74c11418-e5f3-4253-9755-b665d755321c',
      redirectUri: 'https://85v8hc0ry6.execute-api.us-east-1.amazonaws.com',
      apiScope: 'api://44f417b1-ff99-4463-974a-56bb29cb66dd/access_as_user',
    },
  },
};
