import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Mail, Lock, User, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAppState } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/';
  const initialMode = queryParams.get('mode') === 'reset' ? 'reset' : 'login';

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot' | 'reset'
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');

  useEffect(() => {
    if (queryParams.get('mode') === 'reset' || (location.hash && location.hash.includes('type=recovery'))) {
      setMode('reset');
    }
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
      }
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos.');
        }
        throw error;
      }

      toast.success('Login realizado com sucesso!');
      if (checkAppState) await checkAppState();

      // Redireciona para onde o usuário queria ir
      setTimeout(() => {
        navigate(redirectUrl);
      }, 300);
    } catch (err) {
      console.error('Erro de login:', err);
      toast.error(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password || !nome) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: nome.trim(),
            phone: telefone.trim()
          }
        }
      });

      if (error) throw error;

      // Cria ou atualiza o registro na tabela cliente
      const { error: clienteErr } = await supabase.from('cliente').upsert({
        nome: nome.trim(),
        email: cleanEmail,
        telefone: telefone.trim() || '',
        tem_canal: true
      }, { onConflict: 'email' });

      if (clienteErr) {
        console.warn('Registro de cliente criado com aviso:', clienteErr.message);
      }

      toast.success('Conta criada com sucesso!');
      if (checkAppState) await checkAppState();

      setTimeout(() => {
        navigate(redirectUrl);
      }, 500);
    } catch (err) {
      console.error('Erro de cadastro:', err);
      toast.error(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Informe seu e-mail para recuperação.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/Login?mode=reset`
      });
      if (error) throw error;
      toast.success('Instruções de recuperação enviadas para o seu e-mail.');
      setMode('login');
    } catch (err) {
      toast.error(err.message || 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Informe sua nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;

      toast.success('Senha atualizada com sucesso! Você já está conectado.');
      if (checkAppState) await checkAppState();
      setTimeout(() => {
        navigate(redirectUrl);
      }, 500);
    } catch (err) {
      console.error('Erro ao redefinir senha:', err);
      toast.error(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0a0a0a] text-white flex flex-col justify-center items-center px-4 py-12 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] relative overflow-x-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-black to-black opacity-60 pointer-events-none" />

      {/* Voltar para Home */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors z-20 pt-[env(safe-area-inset-top)]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Voltar para o site</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#161616] border border-[#D4AF37]/40 mb-4 shadow-lg shadow-[#D4AF37]/5">
            <Scissors className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">
            BARBEARIA <span className="text-[#D4AF37]">DEMATTOS</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'signup' && 'Crie sua conta para acessar seus agendamentos'}
            {mode === 'login' && 'Acesse seu painel com e-mail e senha'}
            {mode === 'forgot' && 'Recupere o acesso à sua conta'}
            {mode === 'reset' && 'Crie sua nova senha de acesso'}
          </p>
        </div>

        {/* Card de Autenticação */}
        <Card className="bg-[#121212]/90 border border-white/10 backdrop-blur-xl shadow-2xl text-white">
          <CardHeader className="pb-4">
            {/* Alternador de Modo: Entrar / Criar Conta */}
            {mode !== 'forgot' && mode !== 'reset' && (
              <div className="flex rounded-lg bg-black/40 p-1 border border-white/5 mb-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'login'
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'signup'
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Criar Conta
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <CardTitle className="text-xl text-center text-[#D4AF37]">
                Recuperar Senha
              </CardTitle>
            )}
          </CardHeader>

          <CardContent>
            {/* Formulário de Login */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-gray-400">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-[#D4AF37] hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-6 transition-all duration-300 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Entrando...
                    </>
                  ) : (
                    'ENTRAR NO CANAL'
                  )}
                </Button>
              </form>
            )}

            {/* Formulário de Cadastro */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="text"
                      required
                      placeholder="Seu nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="tel"
                      placeholder="(31) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Senha (mínimo 6 caracteres)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-6 transition-all duration-300 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Criando conta...
                    </>
                  ) : (
                    'CRIAR MINHA CONTA'
                  )}
                </Button>
              </form>
            )}

            {/* Recuperação de Senha */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Informe o e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-6"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-sm text-gray-400 hover:text-white underline"
                  >
                    Voltar para o login
                  </button>
                </div>
              </form>
            )}

            {/* Redefinição de Nova Senha */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Crie sua nova senha segura para acessar sua conta na Barbearia DeMattos.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Nova Senha (mínimo 6 caracteres)</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-gray-400">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 bg-black/50 border-white/10 text-white placeholder:text-gray-600 focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold py-6 transition-all duration-300 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Atualizando senha...
                    </>
                  ) : (
                    'SALVAR NOVA SENHA'
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-sm text-gray-400 hover:text-white underline"
                  >
                    Voltar para o login
                  </button>
                </div>
              </form>
            )}

            {/* Link Acesso Profissional */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center">
              <Link 
                to="/AgendaProfissional" 
                className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors"
              >
                É profissional da barbearia? Acessar Agenda do Profissional
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
