
import React, { useState, useEffect } from 'react';
import { CompanyProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Building2, Briefcase, FileText, X } from 'lucide-react';

interface CompanySetupModalProps {
  isOpen: boolean;
  onSave: (profile: Partial<CompanyProfile>) => void;
  initialData?: CompanyProfile | null;
  isNew?: boolean;
  onCancel?: () => void;
}

const CompanySetupModal: React.FC<CompanySetupModalProps> = ({ isOpen, onSave, initialData, isNew = false, onCancel }) => {
  const [name, setName] = useState('');
  const [cui, setCui] = useState('');
  const [regCom, setRegCom] = useState('');
  const [activity, setActivity] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData && !isNew) {
        setName(initialData.name);
        setCui(initialData.cui);
        setRegCom(initialData.regCom || '');
        setActivity(initialData.activity || '');
      } else {
        // Reset for new company
        setName('');
        setCui('');
        setRegCom('');
        setActivity('');
      }
    }
  }, [isOpen, initialData, isNew]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name && cui) {
      onSave({ name, cui, regCom, activity });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <Card className="w-full max-w-md bg-[#09090b] border-zinc-800 shadow-2xl relative">
        
        {onCancel && (
          <button onClick={onCancel} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        )}

        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4 border border-blue-500/30 text-blue-500">
            <Building2 size={24} />
          </div>
          <CardTitle className="text-xl text-white">
            {isNew ? 'Adaugă Firmă Nouă' : 'Editare Firmă'}
          </CardTitle>
          <p className="text-zinc-400 text-xs mt-1">
            {isNew ? 'Configurează un nou dosar contabil.' : 'Actualizează datele societății.'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Nume Societate (S.R.L. / S.A.)</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 text-zinc-500 h-4 w-4" />
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tech Solutions SRL"
                className="pl-9 bg-zinc-900/50 border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">CUI / CIF</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 text-zinc-500 h-4 w-4" />
                <Input 
                  value={cui}
                  onChange={(e) => setCui(e.target.value)}
                  placeholder="RO123456"
                  className="pl-9 bg-zinc-900/50 border-zinc-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nr. Reg. Com.</label>
              <Input 
                value={regCom}
                onChange={(e) => setRegCom(e.target.value)}
                placeholder="J40/..."
                className="bg-zinc-900/50 border-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Activitate Principală (CAEN/Descriere)</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 text-zinc-500 h-4 w-4" />
              <Input 
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="Ex: Dezvoltare Software, Comerț..."
                className="pl-9 bg-zinc-900/50 border-zinc-700"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          {onCancel && (
             <Button variant="ghost" onClick={onCancel} className="flex-1">Renunță</Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!name || !cui}
            className={`bg-blue-600 hover:bg-blue-500 text-white ${onCancel ? 'flex-1' : 'w-full'}`}
          >
            Salvează
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CompanySetupModal;
