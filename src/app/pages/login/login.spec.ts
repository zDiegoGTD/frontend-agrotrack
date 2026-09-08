import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { Usuario } from '../../core/models';
import { Login } from './login';

/**
 * Al volver de Microsoft, MSAL deja al usuario en la pagina que inicio el
 * login: /login. Si esta pantalla no reacciona a que ya hay sesion, el
 * usuario entra correctamente y se queda mirando el boton, convencido de
 * que el login no funciona. Paso de verdad en AWS.
 */
describe('Login: salida hacia el panel', () => {
  const usuario = signal<Usuario | null>(null);
  const navigate = vi.fn();

  class AuthFalso {
    readonly user = usuario.asReadonly();
    init = vi.fn(async () => {});
    getToken = vi.fn(async () => null);
    login = vi.fn(async () => {});
    logout = vi.fn(async () => {});
    hasRole = () => true;
  }

  beforeEach(() => {
    usuario.set(null);
    navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useClass: AuthFalso },
        { provide: Router, useValue: { navigate } },
      ],
    });
  });

  it('sin sesión se queda en la pantalla de login', () => {
    TestBed.createComponent(Login).detectChanges();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('en cuanto hay sesión navega al panel', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    usuario.set({ userId: 'u1', nombre: 'Diego', roles: ['ADMIN'] });
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/dashboard'], { replaceUrl: true });
  });

  it('reemplaza la entrada del historial: el botón Atrás no vuelve al login', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    usuario.set({ userId: 'u1', nombre: 'Diego', roles: ['CLIENTE'] });
    fixture.detectChanges();

    expect(navigate.mock.calls[0][1]).toEqual({ replaceUrl: true });
  });
});
