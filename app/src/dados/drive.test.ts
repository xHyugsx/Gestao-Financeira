import { describe, expect, it } from 'vitest';
import { corpoMultipart, enderecoDeRetorno, ESCOPO, lerResposta, muitoMaisPequena, nomeNoDrive, urlDeAutorizacao } from './drive';

describe('Google Drive: autorização', () => {
  it('pede só o acesso aos ficheiros da app (drive.file), com o estado e a conta conhecida', () => {
    const u = new URL(urlDeAutorizacao({ clientId: 'abc.apps.googleusercontent.com', retorno: 'https://exemplo.github.io/app/', estado: 'e1', conta: 'a@b.pt' }));
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      client_id: 'abc.apps.googleusercontent.com', redirect_uri: 'https://exemplo.github.io/app/', response_type: 'token', scope: ESCOPO,
      include_granted_scopes: 'true', state: 'e1', login_hint: 'a@b.pt',
    });
    expect(urlDeAutorizacao({ clientId: 'x', retorno: 'r', estado: 'e', escolherConta: true })).toContain('prompt=select_account');
  });

  it('só aceita a resposta do pedido feito pela app (mesmo estado)', () => {
    expect(lerResposta('#access_token=T&expires_in=3600&state=e1', 'e1', 1000)).toEqual({ token: 'T', expira: 1000 + 3600000 });
    expect(lerResposta('#access_token=T&state=outro', 'e1')).toBeNull();
    expect(lerResposta('#error=access_denied&state=e1', 'e1')).toEqual({ erro: 'access_denied' });
  });

  it('endereço de retorno: a pasta da app', () => {
    expect(enderecoDeRetorno('https://exemplo.github.io/Gestao-Financeira/index.html?acao=despesa')).toBe('https://exemplo.github.io/Gestao-Financeira/');
  });
});

describe('Google Drive: envio', () => {
  it('corpo multipart com os metadados e o conteúdo', () => {
    const { tipo, corpo } = corpoMultipart({ name: 'a.json' }, '{"x":1}', 'F');
    expect(tipo).toBe('multipart/related; boundary=F');
    expect(corpo).toBe('--F\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.json"}\r\n--F\r\nContent-Type: application/json\r\n\r\n{"x":1}\r\n--F--');
  });

  it('nome do ficheiro com o nome do telemóvel', () => {
    expect(nomeNoDrive('Telemóvel A')).toBe('Finanças - backup protegido (Telemóvel A).json');
  });

  it('avisa antes de substituir por uma cópia com menos de metade dos movimentos', () => {
    expect(muitoMaisPequena(40, 100)).toBe(true);
    expect(muitoMaisPequena(60, 100)).toBe(false);
    expect(muitoMaisPequena(2, 10)).toBe(false);
    expect(muitoMaisPequena(5, undefined)).toBe(false);
  });
});
