import { describe, expect, it } from 'vitest';
import { PRUEBAS_ACCESO, estadoEsperado, resumirToken } from './token';

const AHORA = Date.parse('2026-09-16T12:00:00Z');
const seg = (iso: string) => Date.parse(iso) / 1000;

describe('resumen del access token de Azure', () => {
  const claims = {
    iss: 'https://login.microsoftonline.com/74c1/v2.0',
    aud: '44f417b1',
    ver: '2.0',
    tid: '74c1',
    oid: 'u-1',
    name: 'Admin AgroTrack',
    preferred_username: 'admin@mish.cl',
    roles: ['ADMIN'],
    scp: 'access_as_user User.Read',
    iat: seg('2026-09-16T11:30:00Z'),
    exp: seg('2026-09-16T12:45:30Z'),
  };

  it('separa los scopes, que Azure manda en un solo string', () => {
    expect(resumirToken(claims, AHORA).scopes).toEqual(['access_as_user', 'User.Read']);
  });

  it('lee emisor, audiencia, versión, roles y usuario', () => {
    const r = resumirToken(claims, AHORA);
    expect(r).toMatchObject({ emisor: claims.iss, audiencia: '44f417b1', version: '2.0', roles: ['ADMIN'], usuario: 'admin@mish.cl', oid: 'u-1' });
  });

  it('calcula los minutos que le quedan y si ya venció', () => {
    expect(resumirToken(claims, AHORA)).toMatchObject({ minutosRestantes: 45, vencido: false });
    expect(resumirToken({ ...claims, exp: seg('2026-09-16T11:59:00Z') }, AHORA)).toMatchObject({ minutosRestantes: 0, vencido: true });
  });

  it('un token sin roles ni scopes (el de desarrollo) no rompe nada', () => {
    const r = resumirToken({ sub: 'x', aud: ['a', 'b'] }, AHORA);
    expect(r).toMatchObject({ roles: [], scopes: [], audiencia: 'a, b', oid: 'x', vence: null, vencido: false });
  });
});

describe('resultado esperado de cada prueba de acceso', () => {
  const kpis = PRUEBAS_ACCESO.find((p) => p.ruta.startsWith('/api/report'))!;
  const auditoria = PRUEBAS_ACCESO.find((p) => p.ruta.startsWith('/api/audit'))!;

  it('reportería: 200 para ADMIN y 403 para el resto', () => {
    expect(estadoEsperado(['ADMIN'], kpis)).toBe(200);
    expect(estadoEsperado(['AUDITOR'], kpis)).toBe(403);
    expect(estadoEsperado([], kpis)).toBe(403);
  });

  it('basta con que uno de los roles del token calce', () => {
    expect(estadoEsperado(['CLIENTE', 'AUDITOR'], auditoria)).toBe(200);
  });
});
