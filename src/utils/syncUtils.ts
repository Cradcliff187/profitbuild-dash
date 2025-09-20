import { supabase } from "@/integrations/supabase/client";

export const markPayeeAsSynced = async (payeeId: string) => {
  const { error } = await supabase
    .from('payees')
    .update({
      sync_status: 'success',
      last_synced_at: new Date().toISOString()
    })
    .eq('id', payeeId);
  
  return { error };
};



export const markProjectAsSynced = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .update({
      sync_status: 'success',
      last_synced_at: new Date().toISOString()
    })
    .eq('id', projectId);
  
  return { error };
};

export const resetPayeeSyncStatus = async (payeeId: string) => {
  const { error } = await supabase
    .from('payees')
    .update({
      sync_status: null,
      last_synced_at: null
    })
    .eq('id', payeeId);
  
  return { error };
};



export const resetProjectSyncStatus = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .update({
      sync_status: null,
      last_synced_at: null
    })
    .eq('id', projectId);
  
  return { error };
};