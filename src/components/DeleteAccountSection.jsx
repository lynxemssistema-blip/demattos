import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountSection({ clienteEmail, onDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }

    setDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteUserAccount', {
        cliente_email: clienteEmail
      });

      if (response.data.success) {
        toast.success('Conta excluída com sucesso');
        // Logout after short delay
        setTimeout(() => {
          base44.auth.logout('/');
        }, 1500);
        if (onDeleted) onDeleted();
      } else {
        toast.error(response.data.error || 'Erro ao excluir conta');
      }
    } catch (error) {
      toast.error('Erro ao excluir conta');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-t border-red-500/30 pt-6 mt-6">
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-500 font-semibold text-sm">Excluir minha conta</h4>
            <p className="text-red-400/80 text-xs mt-1">
              Esta ação é permanente e não pode ser desfeita. Todos os seus dados, 
              agendamentos futuros, depoimentos, conversas e créditos serão removidos.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-red-400 mb-1 block">
              Digite <span className="font-bold">EXCLUIR</span> para confirmar
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="bg-[#0a0a0a] border-red-500/30 text-white"
            />
          </div>
          <Button
            onClick={handleDelete}
            disabled={confirmText !== 'EXCLUIR' || deleting}
            className="w-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Excluindo...' : 'Excluir Minha Conta Permanentemente'}
          </Button>
        </div>
      </div>
    </div>
  );
}