import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LogIn, Mail, Lock, User, Phone, CreditCard, Camera, Check, MapPin } from 'lucide-react';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { fetchProvinces, fetchMunicipalities } from '@/services/supabase/supabaseService';
import { Province, Municipality } from '@/types/index';

export const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const { syncUserWithProfile, setIsAuthenticating } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignUp) {
      fetchProvinces().then(setProvinces);
    }
  }, [isSignUp]);

  useEffect(() => {
    if (provinceId) {
      fetchMunicipalities(provinceId).then(setMunicipalities);
    } else {
      setMunicipalities([]);
    }
  }, [provinceId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsAuthenticating(isSignUp ? 'cadastrando' : 'entrando');
    try {
      if (isSignUp) {
        // ... (existing signup logic)
        const generatedPublicId = `USR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              name: fullName,
              whatsapp_number: whatsapp,
              id_number: idNumber,
              public_id: generatedPublicId,
              province_id: provinceId,
              municipality_id: municipalityId,
              email: email
            }
          }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Falha ao criar conta.');

        let photoUrl = '';
        if (profilePhoto) {
          const fileName = `${authData.user.id}/profile-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(fileName, profilePhoto, { contentType: 'image/jpeg' });
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(fileName);
            photoUrl = publicUrl;
          }
        }

        await syncUserWithProfile(authData.user, {
          full_name: fullName,
          name: fullName,
          whatsapp_number: whatsapp,
          id_number: idNumber,
          photo_url: photoUrl,
          public_id: generatedPublicId,
          province_id: provinceId,
          municipality_id: municipalityId
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await syncUserWithProfile(data.user);
      }
      navigate('/');
    } catch (error: any) {
      console.error('Authentication error:', error);
      alert(error.message || 'Ocorreu um erro durante a autenticação');
    } finally {
      setLoading(false);
      setIsAuthenticating(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center font-bold text-3xl text-black mx-auto mb-4 shadow-[0_0_30px_rgba(242,78,30,0.4)]">A</div>
          <h1 className="text-2xl font-bold">{isSignUp ? 'Criar Conta' : 'Bem-vindo de volta'}</h1>
          <p className="text-slate-400">O Marketplace Social AngObuy</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <>
              {/* Profile Photo Capture */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-orange-500/30 overflow-hidden group">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <User size={40} />
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="text-white w-6 h-6" />
                  </button>
                </div>
                <p className="text-xs text-slate-400">Foto de perfil (opcional, mas recomendada)</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="João Paulo"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Número do WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="+244 9XX XXX XXX"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Número do BI (Bilhete de Identidade)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    placeholder="00XXXXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Província</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <select
                      value={provinceId}
                      onChange={(e) => setProvinceId(e.target.value)}
                      className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all appearance-none"
                      required
                    >
                      <option value="">Província</option>
                      {provinces.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Município</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <select
                      value={municipalityId}
                      onChange={(e) => setMunicipalityId(e.target.value)}
                      className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all appearance-none"
                      disabled={!provinceId}
                      required
                    >
                      <option value="">Município</option>
                      {municipalities.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                placeholder="nome@exemplo.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={loading}>
            {isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : "Não tem uma conta? Cadastrar"}
          </button>
        </div>
      </Card>

      {showCamera && (
        <CameraCapture 
          onCapture={(blob) => {
            setProfilePhoto(blob);
            setPhotoPreview(URL.createObjectURL(blob));
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};
