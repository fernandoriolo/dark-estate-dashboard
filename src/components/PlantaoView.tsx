import { useEffect, useMemo, useState } from "react";
import { Calendar, Copy, RefreshCw, ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUserProfile } from "@/hooks/useUserProfile";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Normaliza tempo vindo do banco (ex.: '09:00:00') para 'HH:MM'
const toHHMM = (t: any): string => {
  if (!t || typeof t !== 'string') return '';
  const parts = t.split(':');
  if (parts.length >= 2) return `${pad2(parseInt(parts[0] || '0', 10))}:${pad2(parseInt(parts[1] || '0', 10))}`;
  return t;
};

// Ajusta minutos para 00 ou 30 para o seletor atual
const toHalfHour = (hhmm: string): string => {
  const [hStr, mStr] = (hhmm || '').split(':');
  const h = Math.min(23, Math.max(0, parseInt(hStr || '0', 10) || 0));
  const mRaw = Math.min(59, Math.max(0, parseInt(mStr || '0', 10) || 0));
  const m = mRaw < 30 ? 0 : 30;
  return `${pad2(h)}:${pad2(m)}`;
};

function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  // opções de 08:00 até 19:30, a cada 30 minutos
  const times: string[] = [];
  for (let h = 8; h <= 19; h++) {
    for (const m of [0, 30]) {
      times.push(`${pad2(h)}:${pad2(m)}`);
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`bg-gray-800 border-gray-700 text-white h-9 ${disabled ? 'opacity-60' : ''}`}>
        <SelectValue placeholder="—:—" />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border border-gray-800 text-white max-h-64">
        {times.map((t) => (
          <SelectItem key={t} value={t} className="text-white font-mono">
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const PlantaoView = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [calendars, setCalendars] = useState<Array<{
    name: string;
    id: string;
    timeZone: string;
    accessRole: string;
    color: string;
    primary: string;
    defaultReminders?: string;
    conferenceAllowed?: string;
  }>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'calendarios' | 'escala'>("calendarios");
  const [isAddAgendaOpen, setIsAddAgendaOpen] = useState(false);
  const [newAgendaName, setNewAgendaName] = useState("");
  const [addingAgenda, setAddingAgenda] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [deletingAgenda, setDeletingAgenda] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configCalendarId, setConfigCalendarId] = useState<string | null>(null);
  const [assignedUserLocal, setAssignedUserLocal] = useState<string>("");
  const [companyUsers, setCompanyUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const { profile, isManager, getCompanyUsers } = useUserProfile();
  const [expandedCalendars, setExpandedCalendars] = useState<Record<string, boolean>>({});
  const [dirtyCalendars, setDirtyCalendars] = useState<Record<string, boolean>>({});
  const [savingCalendars, setSavingCalendars] = useState<Record<string, boolean>>({});
  type EscalaSlot = { dia: string; inicio: string; fim: string };
  const [escalas, setEscalas] = useState<Record<string, { calendarName: string; assignedUserId?: string; slots: EscalaSlot[] }>>({});

  const formatTimeZoneLabel = (tz?: string) => {
    if (!tz) return "-";
    const parts = tz.split("/");
    const last = parts[parts.length - 1] || tz;
    const pretty = last
      .replace(/_/g, " ")
      .replace(/Sao/gi, "São")
      .replace(/Paulo/gi, "Paulo");
    return pretty;
  };

  const puxarAgendas = async (mode: "auto" | "manual" = "manual") => {
    try {
      setLoading(true);
      setStatus(mode === "auto" ? "Sincronizando agendas automaticamente..." : "Buscando agendas...");

      // Enviar body com funcao: leitura
      const resp = await fetch("https://webhooklabz.n8nlabz.com.br/webhook/id_agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funcao: "leitura" }),
      });

      if (!resp.ok) {
        throw new Error(`Erro na API: ${resp.status} - ${resp.statusText}`);
      }

      const data = await resp.json();
      let list: any[] = [];
      if (Array.isArray(data)) {
        // Caso 1: já é lista de calendários
        // Caso 2: lista de wrappers com chave "Calendars" ou "calendars"
        if (data.length > 0 && (Array.isArray((data[0] as any)?.Calendars) || Array.isArray((data[0] as any)?.calendars))) {
          list = (data as any[]).flatMap((item: any) => item.Calendars || item.calendars || []);
        } else {
          list = data;
        }
      } else if (Array.isArray((data as any)?.Calendars) || Array.isArray((data as any)?.calendars)) {
        list = (data as any).Calendars || (data as any).calendars;
      } else if (Array.isArray((data as any)?.events)) {
        list = (data as any).events;
      } else {
        list = [];
      }

      const normalized = list.map((item: any) => ({
        name: item?.["Calendar Name"] ?? item?.name ?? "Sem nome",
        id: item?.["Calendar ID"] ?? item?.id ?? "",
        timeZone: item?.["Time Zone"] ?? item?.timeZone ?? "",
        accessRole: item?.["Access Role"] ?? item?.accessRole ?? "",
        color: item?.["Color"] ?? item?.color ?? "#6b7280",
        primary: item?.["Primary Calendar"] ?? item?.primary ?? "No",
        defaultReminders: item?.["Default Reminders"],
        conferenceAllowed: item?.["Conference Allowed"],
      }));

      setCalendars(normalized);
      setLastCount(normalized.length);
      setLastUpdated(new Date());
      setStatus(
        normalized.length > 0
          ? `Agendas sincronizadas com sucesso (${normalized.length} calendários)`
          : "Nenhum calendário encontrado"
      );
    } catch (e: any) {
      setStatus(e?.message || "Falha ao puxar agendas");
    } finally {
      setLoading(false);
    }
  };

  // Disparar automaticamente quando a aba Calendários estiver ativa
  useEffect(() => {
    if (activeTab === 'calendarios') {
      puxarAgendas("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Corretores só podem ver a aba "Escala" (sem acesso a "Calendários")
  useEffect(() => {
    if (!isManager && activeTab !== 'escala') {
      setActiveTab('escala');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager]);

  // Ações Calendários
  const handleAddAgenda = async () => {
    setIsAddAgendaOpen(true);
  };

  const submitAddAgenda = async () => {
    const name = newAgendaName.trim();
    if (!name) {
      toast({ description: 'Informe o nome da agenda' });
      return;
    }
    try {
      setAddingAgenda(true);
      const resp = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/id_agendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ funcao: 'adicionar', nome: name }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast({ description: 'Agenda adicionada com sucesso' });
      setIsAddAgendaOpen(false);
      setNewAgendaName("");
      // Recarregar lista
      await puxarAgendas('manual');
    } catch (e) {
      console.error(e);
      toast({ description: 'Falha ao adicionar agenda' });
    } finally {
      setAddingAgenda(false);
    }
  };

  const handleDeleteCalendar = (calendarId: string, calendarName?: string) => {
    setDeleteTargetId(calendarId);
    setDeleteTargetName(calendarName || "");
    setIsDeleteOpen(true);
  };

  const confirmDeleteCalendar = async () => {
    try {
      setDeletingAgenda(true);
      const resp = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/id_agendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcao: 'apagar', id: deleteTargetId }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast({ description: 'Agenda removida com sucesso' });
      setIsDeleteOpen(false);
      setDeleteTargetId("");
      setDeleteTargetName("");
      await puxarAgendas('manual');
    } catch (e) {
      console.error(e);
      toast({ description: 'Falha ao remover agenda' });
    } finally {
      setDeletingAgenda(false);
    }
  };

  const filteredCalendars = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return calendars.filter((c) => {
      return term === "" || c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);
    });
  }, [calendars, searchTerm]);

  // Removido localStorage; manter apenas estado em memória e banco
  const persistEscalas = (data: typeof escalas) => {
    setEscalas(data);
  };

  const dias = [
    'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
  ];

  const diaCurto: Record<string, string> = {
    'Segunda': 'Seg',
    'Terça': 'Ter',
    'Quarta': 'Qua',
    'Quinta': 'Qui',
    'Sexta': 'Sex',
    'Sábado': 'Sáb',
    'Domingo': 'Dom',
  };

  const buildScheduleSummary = (cfg: { slots: EscalaSlot[] }): string => {
    const map: Record<string, { works: boolean; start: string | null; end: string | null }> = {
      'Segunda': { works: false, start: null, end: null },
      'Terça': { works: false, start: null, end: null },
      'Quarta': { works: false, start: null, end: null },
      'Quinta': { works: false, start: null, end: null },
      'Sexta': { works: false, start: null, end: null },
      'Sábado': { works: false, start: null, end: null },
      'Domingo': { works: false, start: null, end: null },
    };
    for (const s of cfg.slots) {
      if (map[s.dia]) map[s.dia] = { works: true, start: s.inicio, end: s.fim };
    }
    const groups: { startIdx: number; endIdx: number; works: boolean; start?: string | null; end?: string | null }[] = [];
    let i = 0;
    while (i < dias.length) {
      const cur = map[dias[i]];
      let j = i;
      while (
        j + 1 < dias.length &&
        map[dias[j + 1]].works === cur.works &&
        map[dias[j + 1]].start === cur.start &&
        map[dias[j + 1]].end === cur.end
      ) {
        j++;
      }
      groups.push({ startIdx: i, endIdx: j, works: cur.works, start: cur.start, end: cur.end });
      i = j + 1;
    }
    // Map groups to string
    const parts = groups.map(g => {
      const rangeLabel = g.startIdx === g.endIdx
        ? diaCurto[dias[g.startIdx]]
        : `${diaCurto[dias[g.startIdx]]}–${diaCurto[dias[g.endIdx]]}`;
      if (g.works) {
        return `${rangeLabel} ${g.start}–${g.end}`;
      }
      return `${rangeLabel} não trabalha`;
    });
    const allOff = groups.every(g => !g.works);
    if (allOff) return 'Não trabalha em nenhum dia';
    return parts.join('; ');
  };

  const toggleExpanded = (calendarId: string, calendarName?: string) => {
    const isOpen = !!expandedCalendars[calendarId];
    const willOpen = !isOpen;
    if (willOpen && !escalas[calendarId]) {
      // Carregar escala do banco ao expandir pela primeira vez
      loadSchedule(calendarId, calendarName || calendars.find(x => x.id === calendarId)?.name || '');
    }
    setExpandedCalendars(prev => ({ ...prev, [calendarId]: willOpen }));
  };

  const getDayMapFromSlots = (slots: EscalaSlot[]) => {
    const map: Record<string, { works: boolean; start: string | null; end: string | null }> = {
      'Segunda': { works: false, start: null, end: null },
      'Terça': { works: false, start: null, end: null },
      'Quarta': { works: false, start: null, end: null },
      'Quinta': { works: false, start: null, end: null },
      'Sexta': { works: false, start: null, end: null },
      'Sábado': { works: false, start: null, end: null },
      'Domingo': { works: false, start: null, end: null },
    };
    for (const s of slots) {
      if (map[s.dia]) map[s.dia] = { works: true, start: s.inicio, end: s.fim };
    }
    return map;
  };

  const setDayWorking = (calendarId: string, dia: string, works: boolean) => {
    const current = escalas[calendarId];
    if (!current) return;
    let nextSlots = [...current.slots];
    const idx = nextSlots.findIndex(s => s.dia === dia);
    if (works) {
      if (idx === -1) {
        nextSlots.push({ dia, inicio: '09:00', fim: '18:00' });
      }
    } else {
      if (idx !== -1) {
        nextSlots.splice(idx, 1);
      }
    }
    persistEscalas({ ...escalas, [calendarId]: { ...current, slots: nextSlots } });
    setDirtyCalendars(prev => ({ ...prev, [calendarId]: true }));
  };

  const setDayTime = (calendarId: string, dia: string, field: 'inicio' | 'fim', value: string) => {
    const current = escalas[calendarId];
    if (!current) return;
    let nextSlots = [...current.slots];
    const idx = nextSlots.findIndex(s => s.dia === dia);
    // util: validação de horários (inicio < fim)
    const toMinutes = (t: string) => {
      const [hh, mm] = (t || '00:00').split(':');
      const h = parseInt(hh || '0', 10);
      const m = parseInt(mm || '0', 10);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };

    const currentInicio = idx === -1 ? '09:00' : nextSlots[idx].inicio;
    const currentFim = idx === -1 ? '18:00' : nextSlots[idx].fim;
    const candidateInicio = field === 'inicio' ? value : currentInicio;
    const candidateFim = field === 'fim' ? value : currentFim;

    if (toMinutes(candidateInicio) >= toMinutes(candidateFim)) {
      toast({ description: 'Horário inválido: o início deve ser antes do fim.' });
      return; // não persiste alteração inválida
    }

    if (idx === -1) {
      nextSlots.push({ dia, inicio: candidateInicio, fim: candidateFim });
    } else {
      nextSlots[idx] = { ...nextSlots[idx], inicio: candidateInicio, fim: candidateFim } as EscalaSlot;
    }
    persistEscalas({ ...escalas, [calendarId]: { ...current, slots: nextSlots } });
    setDirtyCalendars(prev => ({ ...prev, [calendarId]: true }));
  };

  // (Removido) copiar/colar horários — simplificado conforme solicitação

  // (Removido) presets de dias e limpar tudo — a pedido do usuário

  const loadSchedule = async (calendarId: string, calendarName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Buscar primeiro por assigned_user_id (quando o calendário foi vinculado pelo gestor)
      let { data, error } = await supabase
        .from('oncall_schedules')
        .select('*')
        .eq('assigned_user_id', user.id)
        .eq('calendar_id', calendarId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      // Se não houver linha por assigned_user_id, tentar pelo owner (user_id)
      if (!data) {
        const res2 = await supabase
          .from('oncall_schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('calendar_id', calendarId)
          .maybeSingle();
        data = res2.data as any;
      }

      if (data) {
        const slots = [
          (data as any).mon_works ? { dia: 'Segunda', inicio: toHalfHour(toHHMM((data as any).mon_start)), fim: toHalfHour(toHHMM((data as any).mon_end)) } : null,
          (data as any).tue_works ? { dia: 'Terça', inicio: toHalfHour(toHHMM((data as any).tue_start)), fim: toHalfHour(toHHMM((data as any).tue_end)) } : null,
          (data as any).wed_works ? { dia: 'Quarta', inicio: toHalfHour(toHHMM((data as any).wed_start)), fim: toHalfHour(toHHMM((data as any).wed_end)) } : null,
          (data as any).thu_works ? { dia: 'Quinta', inicio: toHalfHour(toHHMM((data as any).thu_start)), fim: toHalfHour(toHHMM((data as any).thu_end)) } : null,
          (data as any).fri_works ? { dia: 'Sexta', inicio: toHalfHour(toHHMM((data as any).fri_start)), fim: toHalfHour(toHHMM((data as any).fri_end)) } : null,
          (data as any).sat_works ? { dia: 'Sábado', inicio: toHalfHour(toHHMM((data as any).sat_start)), fim: toHalfHour(toHHMM((data as any).sat_end)) } : null,
          (data as any).sun_works ? { dia: 'Domingo', inicio: toHalfHour(toHHMM((data as any).sun_start)), fim: toHalfHour(toHHMM((data as any).sun_end)) } : null,
        ].filter(Boolean) as EscalaSlot[];
        persistEscalas({ ...escalas, [calendarId]: { calendarName, assignedUserId: (data as any).assigned_user_id || undefined, slots } });
      } else {
        persistEscalas({ ...escalas, [calendarId]: { calendarName, assignedUserId: undefined, slots: [] } });
      }
    } catch (e) {
      console.error('Falha ao carregar escala:', e);
      persistEscalas({ ...escalas, [calendarId]: { calendarName, assignedUserId: undefined, slots: [] } });
    }
  };

  // Carrega todas as escalas do usuário para os calendários atuais
  const loadAllSchedules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (!calendars || calendars.length === 0) return;
      const calendarIds = calendars.map(c => c.id);
      // Buscar linhas onde o usuário é owner OU assigned_user
      const { data, error } = await supabase
        .from('oncall_schedules')
        .select('*')
        .in('calendar_id', calendarIds)
        .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
      if (error) throw error;

      const next: typeof escalas = { ...escalas };
      // Inicializa todas as agendas conhecidas com slots vazios caso não haja registro
      for (const c of calendars) {
        if (!next[c.id]) {
          next[c.id] = { calendarName: c.name, assignedUserId: undefined, slots: [] };
        }
      }
      // Preenche com as escalas vindas do banco
      for (const row of (data || [])) {
        const calendarId = (row as any).calendar_id as string;
        const calendarName = calendars.find(x => x.id === calendarId)?.name || (row as any).calendar_name || '';
        const slots: EscalaSlot[] = [
          (row as any).mon_works ? { dia: 'Segunda', inicio: toHalfHour(toHHMM((row as any).mon_start)), fim: toHalfHour(toHHMM((row as any).mon_end)) } : null,
          (row as any).tue_works ? { dia: 'Terça', inicio: toHalfHour(toHHMM((row as any).tue_start)), fim: toHalfHour(toHHMM((row as any).tue_end)) } : null,
          (row as any).wed_works ? { dia: 'Quarta', inicio: toHalfHour(toHHMM((row as any).wed_start)), fim: toHalfHour(toHHMM((row as any).wed_end)) } : null,
          (row as any).thu_works ? { dia: 'Quinta', inicio: toHalfHour(toHHMM((row as any).thu_start)), fim: toHalfHour(toHHMM((row as any).thu_end)) } : null,
          (row as any).fri_works ? { dia: 'Sexta', inicio: toHalfHour(toHHMM((row as any).fri_start)), fim: toHalfHour(toHHMM((row as any).fri_end)) } : null,
          (row as any).sat_works ? { dia: 'Sábado', inicio: toHalfHour(toHHMM((row as any).sat_start)), fim: toHalfHour(toHHMM((row as any).sat_end)) } : null,
          (row as any).sun_works ? { dia: 'Domingo', inicio: toHalfHour(toHHMM((row as any).sun_start)), fim: toHalfHour(toHHMM((row as any).sun_end)) } : null,
        ].filter(Boolean) as EscalaSlot[];
        next[calendarId] = {
          calendarName,
          assignedUserId: (row as any).assigned_user_id || undefined,
          slots,
        };
      }
      persistEscalas(next);
    } catch (e) {
      console.error('Falha ao carregar escalas:', e);
    }
  };

  const addCalendario = () => {
    if (!selectedCalendarId) return;
    const cal = calendars.find(c => c.id === selectedCalendarId);
    if (!cal) return;
    if (escalas[selectedCalendarId]) return;
    loadSchedule(selectedCalendarId, cal.name);
    setSelectedCalendarId("");
  };

  const addSlot = (calendarId: string) => {
    const current = escalas[calendarId];
    if (!current) return;
    const nextSlots = [...current.slots, { dia: 'Segunda', inicio: '09:00', fim: '18:00' }];
    persistEscalas({ ...escalas, [calendarId]: { ...current, slots: nextSlots } });
    // salvar imediatamente no banco
    salvarCalendario(calendarId);
  };

  const updateSlot = (
    calendarId: string,
    index: number,
    field: keyof EscalaSlot,
    value: string
  ) => {
    const current = escalas[calendarId];
    if (!current) return;
    const nextSlots = current.slots.map((s, i) => i === index ? { ...s, [field]: value } : s);
    persistEscalas({ ...escalas, [calendarId]: { ...current, slots: nextSlots } });
    salvarCalendario(calendarId);
  };

  const removeSlot = (calendarId: string, index: number) => {
    const current = escalas[calendarId];
    if (!current) return;
    const nextSlots = current.slots.filter((_, i) => i !== index);
    persistEscalas({ ...escalas, [calendarId]: { ...current, slots: nextSlots } });
    salvarCalendario(calendarId);
  };

  const removeCalendario = (calendarId: string) => {
    const next = { ...escalas };
    delete next[calendarId];
    persistEscalas(next);
    // Limpar no banco (setar todos dias como não trabalha)
    const cfg = { calendarName: '', slots: [] } as { calendarName: string; slots: EscalaSlot[] };
    escalas[calendarId] = cfg;
    salvarCalendario(calendarId);
  };

  const salvarCalendario = (calendarId: string, assignedOverride?: string) => {
    // Persist já acontece a cada alteração local, aqui iremos consolidar e enviar ao Supabase
    const cfg = escalas[calendarId];
    if (!cfg) return;
    // Montar payload diário: dias ausentes vão como não trabalha
    const dayMap: Record<string, { works: boolean; start: string | null; end: string | null }> = {
      Segunda: { works: false, start: null, end: null },
      Terça: { works: false, start: null, end: null },
      Quarta: { works: false, start: null, end: null },
      Quinta: { works: false, start: null, end: null },
      Sexta: { works: false, start: null, end: null },
      Sábado: { works: false, start: null, end: null },
      Domingo: { works: false, start: null, end: null },
    };
    for (const slot of cfg.slots) {
      if (dayMap[slot.dia]) {
        dayMap[slot.dia] = { works: true, start: slot.inicio, end: slot.fim };
      }
    }
    // Chamada Supabase
    (async () => {
      try {
        setSavingCalendars(prev => ({ ...prev, [calendarId]: true }));
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');
        // Buscar company_id do perfil
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        const company_id = (profile as any)?.company_id || null;
        if (!company_id) {
          // fallback: permitir null em ambiente MVP
          console.warn('company_id não encontrado; gravando com company_id nulo (MVP)');
        }
        const effectiveAssigned = (assignedOverride ?? cfg.assignedUserId) || null;
        const rowUserId = effectiveAssigned || user.id;
        const payload = {
          calendar_id: calendarId,
          calendar_name: cfg.calendarName,
          user_id: rowUserId,
          company_id,
          assigned_user_id: effectiveAssigned,
          mon_works: dayMap['Segunda'].works, mon_start: dayMap['Segunda'].start, mon_end: dayMap['Segunda'].end,
          tue_works: dayMap['Terça'].works, tue_start: dayMap['Terça'].start, tue_end: dayMap['Terça'].end,
          wed_works: dayMap['Quarta'].works, wed_start: dayMap['Quarta'].start, wed_end: dayMap['Quarta'].end,
          thu_works: dayMap['Quinta'].works, thu_start: dayMap['Quinta'].start, thu_end: dayMap['Quinta'].end,
          fri_works: dayMap['Sexta'].works, fri_start: dayMap['Sexta'].start, fri_end: dayMap['Sexta'].end,
          sat_works: dayMap['Sábado'].works, sat_start: dayMap['Sábado'].start, sat_end: dayMap['Sábado'].end,
          sun_works: dayMap['Domingo'].works, sun_start: dayMap['Domingo'].start, sun_end: dayMap['Domingo'].end,
        } as any;
        // upsert por (calendar_id, assigned_user_id) quando houver assignation; senão por (user_id, calendar_id)
        const onConflictKeys = effectiveAssigned ? 'calendar_id,assigned_user_id' : 'user_id,calendar_id';
        const { error } = await supabase
          .from('oncall_schedules')
          .upsert(payload, { onConflict: onConflictKeys });
        if (error) throw error;
        toast({ description: 'Escala salva no banco de dados' });
        setDirtyCalendars(prev => ({ ...prev, [calendarId]: false }));
        // Recarregar do banco para garantir consistência visual
        await loadSchedule(calendarId, cfg.calendarName);
      } catch (e: any) {
        console.error(e);
        toast({ description: 'Falha ao salvar escala', });
      } finally {
        setSavingCalendars(prev => ({ ...prev, [calendarId]: false }));
      }
    })();
  };

  // Carregar usuários da empresa para o seletor de proprietário da agenda
  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (isManager) {
          const users = await getCompanyUsers();
          setCompanyUsers(users.map(u => ({ id: u.id, full_name: (u as any).full_name, email: (u as any).email })));
        } else if (profile) {
          setCompanyUsers([{ id: profile.id, full_name: profile.full_name, email: profile.email }]);
        }
      } catch (e) {
        console.error('Falha ao carregar usuários da empresa:', e);
      }
    };
    loadUsers();
  }, [isManager, profile, getCompanyUsers]);

  // Ao entrar na aba Escala, garantir carregamento das agendas e escalas do banco
  useEffect(() => {
    const ensureData = async () => {
      if (activeTab !== 'escala') return;
      if (calendars.length === 0) {
        await puxarAgendas('auto');
      }
      await loadAllSchedules();
    };
    ensureData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Quando a lista de calendários mudar e a aba Escala estiver ativa, recarregar escalas
  useEffect(() => {
    if (activeTab === 'escala' && calendars.length > 0) {
      loadAllSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendars]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-blue-400" />
        <h2 className="text-2xl font-semibold">Plantão</h2>
      </div>


      {/* Abas Plantão */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'calendarios' | 'escala')} className="w-full">
        <TabsList className="bg-gray-800 border border-gray-700">
          {isManager && (<TabsTrigger value="calendarios">Calendários</TabsTrigger>)}
          <TabsTrigger value="escala">Escala do Plantão</TabsTrigger>
        </TabsList>

        {isManager && (
        <TabsContent value="calendarios" className="mt-4">
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-white">Calendários</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Última atualização em: {lastUpdated ? lastUpdated.toLocaleString('pt-BR') : '—'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white bg-transparent border-0 shadow-none"
                    onClick={() => puxarAgendas('manual')}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Atualizando...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" /> Atualizar
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white bg-transparent border-0 shadow-none"
                    onClick={handleAddAgenda}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar agenda
                  </Button>
                </div>
              </div>

              {/* Modal Adicionar Agenda */}
              <Dialog open={isAddAgendaOpen} onOpenChange={setIsAddAgendaOpen}>
                <DialogContent className="bg-gray-900 border border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Adicionar nova agenda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400">Nome da agenda</label>
                      <Input
                        value={newAgendaName}
                        onChange={(e) => setNewAgendaName(e.target.value)}
                        placeholder="Ex.: Corretor João"
                        className="bg-gray-800 border-gray-700 text-white mt-1"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white bg-transparent border-0 shadow-none"
                        onClick={() => setIsAddAgendaOpen(false)}
                        disabled={addingAgenda}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white bg-transparent border-0 shadow-none"
                        onClick={submitAddAgenda}
                        disabled={addingAgenda}
                      >
                        {addingAgenda ? 'Adicionando...' : 'Adicionar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Modal Confirmar Exclusão */}
              <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="bg-gray-900 border border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle>Remover agenda</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">Tem certeza que deseja remover esta agenda?</p>
                    {deleteTargetName && (
                      <p className="text-xs text-gray-400">Agenda: <span className="text-gray-200">{deleteTargetName}</span></p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white bg-transparent border-0 shadow-none"
                        onClick={() => setIsDeleteOpen(false)}
                        disabled={deletingAgenda}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-300 bg-transparent border-0 shadow-none"
                        onClick={confirmDeleteCalendar}
                        disabled={deletingAgenda}
                      >
                        {deletingAgenda ? 'Removendo...' : 'Remover'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por nome ou ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-5 w-48" />
                      </div>
                      <Skeleton className="mt-3 h-4 w-full" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCalendars.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum calendário para exibir.</p>
              ) : (
                <TooltipProvider>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredCalendars.map((cal) => (
                      <div
                        key={`${cal.id}-${cal.name}`}
                        className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1.5 hover:border-blue-800/50 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cal.color || '#64748b' }} />
                            <h3 className="text-[13px] font-medium text-white truncate max-w-[220px]">{cal.name}</h3>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="px-2 h-7 text-blue-300 hover:text-blue-200"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(cal.id);
                                    toast({ description: 'Calendar ID copiado' });
                                  }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Copia o ID da agenda</span>
                              </TooltipContent>
                            </Tooltip>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 h-7 text-red-300 hover:text-red-200"
                              onClick={() => handleDeleteCalendar(cal.id, cal.name)}
                              aria-label="Deletar agenda"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="escala" className="mt-4">
          <Card className="border-gray-800 bg-gray-900">
            <CardHeader>
              <CardTitle className="text-white">Escala do Plantão</CardTitle>
              <CardDescription className="text-xs mt-1">Configure horários de plantão por calendário</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Listagem de todas as agendas conhecidas */}
              <div className="space-y-6">
                {calendars.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma agenda encontrada.</p>
                ) : (
                  (isManager ? calendars : calendars.filter((c) => (escalas[c.id]?.assignedUserId) === profile?.id)).map((c) => {
                    const cfg = escalas[c.id] || { calendarName: c.name, slots: [] };
                    const canEdit = isManager || (cfg.assignedUserId === profile?.id);
                    const resumo = buildScheduleSummary(cfg);
                    const dayMap = getDayMapFromSlots(cfg.slots);
                    const ownerName = cfg.assignedUserId ? (companyUsers.find(u => u.id === cfg.assignedUserId)?.full_name || companyUsers.find(u => u.id === cfg.assignedUserId)?.email || 'Usuário') : 'Não vinculado';
                    const isOpen = !!expandedCalendars[c.id];
                    return (
                      <div key={c.id} className="rounded-xl border border-gray-800 p-4 bg-gradient-to-br from-gray-900 to-gray-950 hover:border-blue-800/40 hover:shadow-xl transition-all">
                        <div className="flex items-start justify-between gap-3 cursor-pointer select-none" onClick={() => toggleExpanded(c.id, c.name)} role="button" aria-expanded={isOpen}>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                              <h3 className="text-white font-semibold truncate">{c.name}</h3>
                            </div>
                            {/* resumo removido por solicitação */}
                            <p className="text-xs text-gray-400 mt-1">Usuário: <span className="text-gray-200">{ownerName}</span></p>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {isManager && (
                            <Dialog open={isConfigOpen && configCalendarId === c.id} onOpenChange={(v) => { setIsConfigOpen(v); if (!v) setConfigCalendarId(null); }}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" className="text-white hover:bg-transparent" onClick={() => { setConfigCalendarId(c.id); setAssignedUserLocal(escalas[c.id]?.assignedUserId || ""); }}>Configurar</Button>
                              </DialogTrigger>
                              <DialogContent className="bg-gray-900 border border-gray-800 text-white">
                                <DialogHeader>
                                  <DialogTitle>Configurar agenda</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs text-gray-400">Vincular a usuário</label>
                                    <Select value={assignedUserLocal} onValueChange={setAssignedUserLocal}>
                                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                        <SelectValue placeholder="Selecione o usuário" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                        {companyUsers.map(u => (
                                          <SelectItem key={u.id} value={u.id} className="text-white">
                                            {u.full_name || u.email}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => { setIsConfigOpen(false); setConfigCalendarId(null); }}>Cancelar</Button>
                                    <Button
                                      variant="ghost"
                                      className="text-white hover:bg-transparent"
                                      onClick={() => { persistEscalas({ ...escalas, [c.id]: { ...escalas[c.id], assignedUserId: assignedUserLocal } }); setDirtyCalendars(prev => ({ ...prev, [c.id]: true })); salvarCalendario(c.id, assignedUserLocal); setIsConfigOpen(false); setConfigCalendarId(null); }}
                                    >
                                      Salvar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                             </Dialog>
                            )}
                            {(canEdit) && (
                              <Button
                                variant="ghost"
                                className={`hover:bg-transparent ${dirtyCalendars[c.id] ? 'text-emerald-300' : 'text-white/70'}`}
                                disabled={!!savingCalendars[c.id]}
                                onClick={() => salvarCalendario(c.id)}
                              >
                                {savingCalendars[c.id] ? 'Salvando...' : (dirtyCalendars[c.id] ? 'Salvar alterações' : 'Salvar')}
                              </Button>
                            )}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" onClick={(e) => e.stopPropagation()}>
                            {dias.map((d) => {
                              const info = dayMap[d];
                              const active = info?.works;
                              return (
                                <div
                                  key={d}
                                  className={`rounded-lg border p-3 ${active ? 'border-emerald-600/30 bg-emerald-900/10' : 'border-gray-800 bg-gray-900'}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-white">{d}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-gray-400">{active ? 'Trabalha' : 'Não trabalha'}</span>
                                      <Switch checked={!!active} disabled={!canEdit} onCheckedChange={(v) => { if (canEdit) setDayWorking(c.id, d, v); }} />
                                    </div>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-400">Início</label>
                                       <TimePicker
                                         value={(info?.start as string) || '09:00'}
                                         disabled={!canEdit || !active}
                                         onChange={(val) => { if (canEdit) setDayTime(c.id, d, 'inicio', val); }}
                                       />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400">Fim</label>
                                       <TimePicker
                                         value={(info?.end as string) || '18:00'}
                                         disabled={!canEdit || !active}
                                         onChange={(val) => { if (canEdit) setDayTime(c.id, d, 'fim', val); }}
                                       />
                                    </div>
                                  </div>
                                  
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


export default PlantaoView;