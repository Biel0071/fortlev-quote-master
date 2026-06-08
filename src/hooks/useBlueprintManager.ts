import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useBlueprintManager = () => {
  const [loading, setLoading] = useState(false);

  const saveStoreAsBlueprint = async (storeId: string, label: string) => {
    setLoading(true);
    try {
      // Capture snapshot
      const { data: snapshot, error: snapError } = await supabase
        .rpc('capture_store_snapshot', { p_store_id: storeId });
      
      if (snapError) throw snapError;

      // Find or create blueprint record
      let { data: blueprint, error: bpError } = await supabase
        .from('store_blueprints')
        .select('id')
        .eq('name', `Blueprint ${storeId}`)
        .single();
      
      if (!blueprint) {
        const { data: newBp, error: newBpErr } = await supabase
          .from('store_blueprints')
          .insert({ name: `Blueprint ${storeId}`, description: 'Snapshot automático' })
          .select()
          .single();
        if (newBpErr) throw newBpErr;
        blueprint = newBp;
      }

      // Save version
      const { error: verError } = await supabase
        .from('blueprint_versions')
        .insert({
          blueprint_id: blueprint.id,
          version_number: Date.now(),
          version_label: label,
          config: snapshot
        });
      
      if (verError) throw verError;
      toast.success('Blueprint criado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar blueprint');
    } finally {
      setLoading(false);
    }
  };

  return { saveStoreAsBlueprint, loading };
};
