import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Tag, Facebook } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import AdminRoute from '@/components/auth/AdminRoute';

function AdminRastreamentoContent() {
  const [config, setConfig] = useState({ facebook_pixel_id: '', google_tag_manager_id: '' });
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const configs = await base44.entities.ConfiguracoesRastreamento.list();
        if (configs.length > 0) {
          setConfig({
            facebook_pixel_id: configs[0].facebook_pixel_id || '',
            google_tag_manager_id: configs[0].google_tag_manager_id || '',
          });
          setConfigId(configs[0].id);
        }
      } catch (e) {
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.ConfiguracoesRastreamento.update(configId, config);
      } else {
        const nova = await base44.entities.ConfiguracoesRastreamento.create(config);
        setConfigId(nova.id);
      }
      toast.success('Configurações salvas com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Admin')}>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Rastreamento & Analytics</h1>
              <p className="text-gray-400 text-sm">Gerencie os pixels e tags de rastreamento do site</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Facebook Pixel */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-400" />
              Facebook Pixel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm">
              Insira o ID do seu Pixel do Facebook para rastrear visitantes e conversões. Você encontra o ID no{' '}
              <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">
                Gerenciador de Eventos
              </a>{' '}
              do Facebook.
            </p>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">ID do Pixel</label>
              <Input
                value={config.facebook_pixel_id}
                onChange={(e) => setConfig({ ...config, facebook_pixel_id: e.target.value })}
                placeholder="Ex: 123456789012345"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white max-w-sm"
              />
              {config.facebook_pixel_id && (
                <p className="text-green-400 text-xs mt-2">✓ Pixel ativo: {config.facebook_pixel_id}</p>
              )}
              {!config.facebook_pixel_id && (
                <p className="text-gray-500 text-xs mt-2">Nenhum pixel configurado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Tag Manager */}
        <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-400" />
              Google Tag Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400 text-sm">
              Insira o ID do seu container do Google Tag Manager. Você encontra o ID no{' '}
              <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] underline">
                Google Tag Manager
              </a>
              .
            </p>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">ID do Container GTM</label>
              <Input
                value={config.google_tag_manager_id}
                onChange={(e) => setConfig({ ...config, google_tag_manager_id: e.target.value })}
                placeholder="Ex: GTM-XXXXXXX"
                className="bg-[#0a0a0a] border-[#2a2a2a] text-white max-w-sm"
              />
              {config.google_tag_manager_id && (
                <p className="text-green-400 text-xs mt-2">✓ GTM ativo: {config.google_tag_manager_id}</p>
              )}
              {!config.google_tag_manager_id && (
                <p className="text-gray-500 text-xs mt-2">Nenhum GTM configurado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#D4AF37] hover:bg-[#B8973D] text-black font-semibold px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminRastreamento() {
  return (
    <AdminRoute>
      <AdminRastreamentoContent />
    </AdminRoute>
  );
}