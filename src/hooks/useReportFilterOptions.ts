import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
}

export function useReportFilterOptions() {
  const [clients, setClients] = useState<FilterOption[]>([]);
  const [payees, setPayees] = useState<FilterOption[]>([]);
  const [workers, setWorkers] = useState<FilterOption[]>([]);
  const [projects, setProjects] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoading(true);
      try {
        // Load distinct clients
        const { data: clientsData } = await supabase
          .from('projects')
          .select('client_name, category')
          .not('client_name', 'is', null)
          .eq('category', 'construction');

        if (clientsData) {
          const uniqueClients = Array.from(
            new Set(clientsData.map(p => p.client_name).filter(Boolean))
          ).map(name => ({ id: name, label: name, value: name }));
          setClients(uniqueClients.sort((a, b) => a.label.localeCompare(b.label)));
        }

        // Load all active payees/vendors
        const { data: payeesData } = await supabase
          .from('payees')
          .select('id, payee_name')
          .eq('is_active', true)
          .order('payee_name');

        if (payeesData) {
          setPayees(payeesData.map(p => ({ id: p.id, label: p.payee_name, value: p.payee_name })));
        }

        // Load internal workers (for time entries)
        const { data: workersData } = await supabase
          .from('payees')
          .select('id, payee_name')
          .eq('is_internal', true)
          .eq('provides_labor', true)
          .eq('is_active', true)
          .order('payee_name');

        if (workersData) {
          setWorkers(workersData.map(w => ({ id: w.id, label: w.payee_name, value: w.payee_name })));
        }

        // Load projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, project_number, project_name, category')
          .eq('category', 'construction')
          .order('project_number', { ascending: false });

        if (projectsData) {
          setProjects(
            projectsData.map(p => ({
              id: p.id,
              label: `${p.project_number} - ${p.project_name}`,
              value: p.project_number
            }))
          );
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, []);

  return {
    clients,
    payees,
    workers,
    projects,
    isLoading
  };
}

