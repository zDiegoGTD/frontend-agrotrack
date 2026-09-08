// Generado por infra/local/azure-local.ps1 â€” login real de Azure contra el backend local.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  auth: {
    mode: 'msal' as 'dev' | 'msal',
    msal: {
      clientId: '44f417b1-ff99-4463-974a-56bb29cb66dd',
      tenantId: '74c11418-e5f3-4253-9755-b665d755321c',
      redirectUri: 'http://localhost:4200',
      apiScope: 'api://44f417b1-ff99-4463-974a-56bb29cb66dd/access_as_user',
    },
  },
};
