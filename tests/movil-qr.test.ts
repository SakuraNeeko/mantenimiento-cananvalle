import { describe, expect, it } from 'vitest';
import { extraerIdActivoDeQr } from '@/lib/movil/qr';

describe('extraerIdActivoDeQr', () => {
  it('extrae el id de una URL completa como la que genera qr-button.tsx', () => {
    expect(extraerIdActivoDeQr('https://mantenimiento-cananvalle.vercel.app/activos/6aa14215-ad2b-427b-967b-b382ccb02f2e')).toBe(
      '6aa14215-ad2b-427b-967b-b382ccb02f2e',
    );
  });

  it('extrae el id aunque venga sin protocolo (algunos lectores de QR lo omiten)', () => {
    expect(extraerIdActivoDeQr('localhost:3000/activos/6aa14215-ad2b-427b-967b-b382ccb02f2e')).toBe('6aa14215-ad2b-427b-967b-b382ccb02f2e');
  });

  it('devuelve null si el QR no es de un activo de este sistema', () => {
    expect(extraerIdActivoDeQr('https://otra-app.com/lo-que-sea')).toBeNull();
  });

  it('devuelve null ante texto arbitrario (un QR de WiFi, por ejemplo)', () => {
    expect(extraerIdActivoDeQr('WIFI:S:MiRed;T:WPA;P:clave123;;')).toBeNull();
  });
});
