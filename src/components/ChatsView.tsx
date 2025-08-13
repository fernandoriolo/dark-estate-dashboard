import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Calendar as CalendarIcon, Home as HomeIcon, Target, Star, TrendingUp, AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type ChatMessageType = 'human' | 'AI' | string;

interface ImobiproMessage {
  id: string;
  session_id?: string;
  sessionId?: string;
  message: any; // Estrutura flexível: deve conter { type: 'human' | 'AI', text?: string }
  created_at?: string;
  createdAt?: string;
}

interface SessionPreview {
  sessionId: string;
  lastMessageText: string;
  lastAt: string;
}

interface LeadInfo {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  stage?: string | null;
}

export function ChatsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<ImobiproMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  // Scroll inteligente
  const chatAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevSessionRef = useRef<string | null>(null);
  const [leadsById, setLeadsById] = useState<Record<string, LeadInfo>>({});
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryJson, setSummaryJson] = useState<any>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);

  // Estágios canônicos (Title Case) — devem refletir o pipeline oficial
  const STAGE_OPTIONS = useMemo(() => [
    'Novo Lead',
    'Qualificado',
    'Visita Agendada',
    'Em Negociação',
    'Documentação',
    'Contrato',
    'Fechamento',
  ], []);

  // Normaliza qualquer entrada para o canônico (compara sem case/acentos)
  const toCanonicalStage = (value?: string | null): string => {
    if (!value) return '';
    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
    const nv = normalize(value);
    const map: Record<string, string> = Object.fromEntries(STAGE_OPTIONS.map(v => [normalize(v), v]));
    return map[nv] || value; // se não encontrar, retorna original
  };

  // Carrega um lote de mensagens recentes para montar a lista de conversas
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1ª tentativa: ordenar por coluna `data` (schema informado)
        let { data, error } = await supabase
          .from<any>('imobipro_messages')
          .select('id, session_id, message, data')
          .order('data', { ascending: false })
          .limit(1000);

        // Fallback: sem order por `data`
        if (error) {
          const res2 = await supabase
            .from<any>('imobipro_messages')
            .select('id, session_id, message, data')
            .limit(1000);
          data = res2.data;
          error = res2.error as any;
        }

        if (error) throw error;
        const normalized = (data || []).map((row: any) => {
          let msg = row.message;
          if (typeof msg === 'string') {
            try {
              msg = JSON.parse(msg);
            } catch {
              // mantém como string
            }
          }
          return {
            id: row.id,
            session_id: row.session_id,
            sessionId: row.sessionId,
            message: msg,
            created_at: String(row.data ?? ''),
            createdAt: undefined,
          } as ImobiproMessage;
        });
        setAllMessages(normalized);
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar mensagens');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Realtime: escutar novas mensagens inseridas em imobipro_messages
  useEffect(() => {
    const channel = supabase
      .channel('imobipro_messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'imobipro_messages' }, (payload: any) => {
        try {
          const row = payload?.new || payload?.record || {};
          // Debug
          console.debug('[Realtime][INSERT][imobipro_messages]', row);
          let msg = row.message;
          if (typeof msg === 'string') {
            try { msg = JSON.parse(msg); } catch {}
          }
          const normalized: ImobiproMessage = {
            id: row.id,
            session_id: row.session_id,
            sessionId: row.sessionId,
            message: msg,
            created_at: String(row.data ?? ''),
            createdAt: undefined,
          };
          setAllMessages(prev => {
            // evita duplicatas
            if (prev.some(m => m.id === normalized.id)) return prev;
            return [normalized, ...prev];
          });
          // Segurança: se a conversa aberta for a mesma, forçar leve refresh de ordenação
          if (selectedSession && (row.session_id === selectedSession || row.sessionId === selectedSession)) {
            setAllMessages(prev => [...prev]);
          }
        } catch (e) {
          // no-op
        }
      })
      .subscribe((status) => {
        console.debug('[Realtime][channel status] imobipro_messages_changes:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime específico da sessão selecionada (melhora atualização do chat aberto)
  useEffect(() => {
    if (!selectedSession) return;
    const channel = supabase
      .channel(`imobipro_messages_session_${selectedSession}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'imobipro_messages',
        filter: `session_id=eq.${selectedSession}`
      }, (payload: any) => {
        try {
          const row = payload?.new || payload?.record || {};
          console.debug('[Realtime][INSERT][session]', row);
          let msg = row.message;
          if (typeof msg === 'string') {
            try { msg = JSON.parse(msg); } catch {}
          }
          const normalized: ImobiproMessage = {
            id: row.id,
            session_id: row.session_id,
            sessionId: row.sessionId,
            message: msg,
            created_at: String(row.data ?? ''),
            createdAt: undefined,
          };
          setAllMessages(prev => {
            if (prev.some(m => m.id === normalized.id)) return prev;
            return [...prev, normalized];
          });
        } catch {}
      })
      .subscribe((status) => {
        console.debug('[Realtime][channel status] session channel:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession]);

  // Fallback: polling leve para garantir atualização mesmo se Realtime falhar (ex.: 5s)
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from<any>('imobipro_messages')
          .select('id, session_id, message, data')
          .order('data', { ascending: false })
          .limit(100);
        if (error || !data) return;
        const incoming: ImobiproMessage[] = data.map((row: any) => {
          let msg = row.message;
          if (typeof msg === 'string') {
            try { msg = JSON.parse(msg); } catch {}
          }
           return {
             id: row.id,
             session_id: row.session_id,
             sessionId: row.sessionId,
             message: msg,
             created_at: String(row.data ?? ''),
             createdAt: undefined,
           } as ImobiproMessage;
        });
        if (cancelled) return;
        setAllMessages(prev => {
          const byId = new Map<string, ImobiproMessage>();
          [...incoming, ...prev].forEach(m => {
            if (!byId.has(String(m.id))) byId.set(String(m.id), m);
          });
          return Array.from(byId.values());
        });
      } catch {}
    };
    const interval = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Lista de conversas (uma por session_id) com última mensagem (sempre por data, sem timezone)
  const sessions: SessionPreview[] = useMemo(() => {
    // Ordena localmente por data DESC, usando a string original
    const sorted = [...allMessages].sort((a, b) => {
      const atA = String(a.created_at || a.createdAt || '');
      const atB = String(b.created_at || b.createdAt || '');
      return atB.localeCompare(atA);
    });
    const seen = new Set<string>();
    const previews: SessionPreview[] = [];
    for (const m of sorted) {
      const sid = m.session_id || m.sessionId || '';
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      const at = String(m.created_at || m.createdAt || '');
      const text =
        (m?.message?.text as string)
        || (m?.message?.content as string)
        || (typeof m?.message === 'string' ? m.message : '')
        || '';
      previews.push({ sessionId: sid, lastAt: at, lastMessageText: text });
    }
    return previews
      .filter(p => !filter || p.sessionId.toLowerCase().includes(filter.toLowerCase()) || p.lastMessageText.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [allMessages, filter]);

  // Aplica filtro também por nome do lead na lista
  const filteredSessions = useMemo(() => {
    if (!filter) return sessions;
    const f = filter.toLowerCase();
    return sessions.filter(s => {
      const name = (leadsById[s.sessionId]?.name || '').toLowerCase();
      return (
        s.sessionId.toLowerCase().includes(f) ||
        s.lastMessageText.toLowerCase().includes(f) ||
        name.includes(f)
      );
    });
  }, [sessions, leadsById, filter]);

  const messagesOfSelected = useMemo(() => {
    if (!selectedSession) return [] as ImobiproMessage[];
    return allMessages
      .filter(m => (m.session_id || m.sessionId) === selectedSession)
      .sort((a, b) => {
        const atA = String(a.created_at || a.createdAt || '');
        const atB = String(b.created_at || b.createdAt || '');
        return atA.localeCompare(atB);
      });
  }, [allMessages, selectedSession]);

  // Seleciona automaticamente a primeira sessão ao carregar
  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSession(sessions[0].sessionId);
    }
  }, [sessions, selectedSession]);

  // Detecta se usuário está no fim do scroll
  useEffect(() => {
    const root = chatAreaRef.current as HTMLDivElement | null;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    if (!viewport) return;
    const onScroll = () => {
      const distance = viewport.scrollHeight - (viewport.scrollTop + viewport.clientHeight);
      setIsAtBottom(distance <= 16);
    };
    onScroll();
    viewport.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [selectedSession]);

  // Auto-scroll quando troca de conversa ou quando chega nova mensagem e o usuário está no fim
  useEffect(() => {
    const root = chatAreaRef.current as HTMLDivElement | null;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
    const shouldForce = prevSessionRef.current !== selectedSession;
    const shouldScroll = shouldForce || isAtBottom;
    if (viewport && bottomAnchorRef.current && shouldScroll) {
      bottomAnchorRef.current.scrollIntoView({ behavior: shouldForce ? 'auto' : 'smooth', block: 'end' });
    }
    prevSessionRef.current = selectedSession;
  }, [messagesOfSelected, selectedSession, isAtBottom]);

  const extractText = (m: ImobiproMessage): string => {
    const raw = (m?.message?.text as string)
      || (m?.message?.content as string)
      || (typeof m?.message === 'string' ? m.message : '')
      || '';
    return raw;
  };

  // Visualizador de JSON com colapsar/expandir
  const TypeBadge = ({ label }: { label: string }) => (
    <span className="ml-2 inline-flex items-center rounded-md border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
      {label}
    </span>
  );

  const JsonViewer: React.FC<{ data: any; depth?: number; path?: string }> = ({ data, depth = 0, path = 'root' }) => {
    const [open, setOpen] = useState(depth < 2);
    const isArray = Array.isArray(data);
    const isObject = data && typeof data === 'object' && !isArray;

    if (!isObject && !isArray) {
      if (typeof data === 'string') return <span className="text-emerald-300 break-words">"{data}"</span>;
      if (typeof data === 'number') return <span className="text-amber-300">{String(data)}</span>;
      if (typeof data === 'boolean') return <span className="text-blue-300">{String(data)}</span>;
      if (data === null) return <span className="text-gray-400">null</span>;
      return <span className="text-gray-300">{String(data)}</span>;
    }

    const entries = isArray ? data.map((v: any, i: number) => [i, v]) : Object.entries(data);

    return (
      <div className="rounded-md border border-gray-800 bg-gray-950">
        <button
          className="w-full text-left px-2 py-1.5 hover:bg-gray-900 flex items-center justify-between"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={`json-${path}`}
        >
          <div className="font-mono text-xs text-gray-300">
            {isArray ? `Array(${entries.length})` : `Object(${entries.length})`}
            <TypeBadge label={isArray ? 'array' : 'object'} />
          </div>
          <span className="text-gray-400 text-xs">{open ? '− recolher' : '+ expandir'}</span>
        </button>
        {open && (
          <div id={`json-${path}`} className="px-3 pb-2">
            {entries.map(([k, v]: any, idx: number) => (
              <div key={`${path}.${k}`} className="py-1 border-b border-gray-900 last:border-b-0">
                <div className="flex items-start gap-2">
                  <div className="min-w-[120px] max-w-[40%] truncate font-mono text-[11px] text-amber-200">{String(k)}</div>
                  <div className="flex-1 font-mono text-[12px] text-gray-200 break-words">
                    {typeof v === 'object' && v !== null ? (
                      <div className="ml-0.5 border-l border-gray-800 pl-2">
                        <JsonViewer data={v} depth={depth + 1} path={`${path}.${k}`} />
                      </div>
                    ) : (
                      <JsonViewer data={v} depth={depth + 1} path={`${path}.${k}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const formatText = (text: string): string => {
    if (!text) return '';
    // Converte sequências literais "\n" e "\t" em quebras reais
    let out = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    // Opcional: normaliza múltiplas quebras
    return out;
  };

  // Exibir timestamp exatamente como armazenado na coluna `data` (sem conversão de timezone)
  const formatTimestampBR = (value?: string) => {
    if (!value) return '';
    // Mantém a string como está, sem conversão de timezone
    const s = String(value).trim();
    // Suporta formatos "YYYY-MM-DD HH:MM:SS.sss" e "YYYY-MM-DDTHH:MM:SS"
    const clean = s.replace('T', ' ');
    const [datePart, timePartFull] = clean.split(' ');
    if (!datePart) return s;
    const [yyyy, mm, dd] = datePart.split('-');
    let hhmm = '';
    if (timePartFull) {
      const [hh, mi] = timePartFull.split(':');
      hhmm = `${(hh || '').padStart(2, '0')}:${(mi || '').padStart(2, '0')}`;
    }
    if (yyyy && mm && dd && hhmm) return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy} - ${hhmm}`;
    if (yyyy && mm && dd) return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
    return clean;
  };

  // Carregar leads correspondentes aos session_ids (lead.id)
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const needIds = sessions
          .map(s => s.sessionId)
          .filter(id => id && !leadsById[id]);
        const uniqueIds = Array.from(new Set(needIds));
        if (uniqueIds.length === 0) return;

        const { data, error } = await supabase
          .from('leads')
          .select('id, name, email, phone, stage')
          .in('id', uniqueIds as string[]);

        if (error) throw error;

        const next: Record<string, LeadInfo> = { ...leadsById };
        (data || []).forEach((l: any) => {
          next[l.id] = { id: l.id, name: l.name, email: l.email, phone: l.phone, stage: toCanonicalStage(l.stage) };
        });
        setLeadsById(next);
      } catch (e) {
        // Silencioso: se falhar, a UI degrada para sessionId
      }
    };
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  const formatPhone = (phone?: string | null) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 11 && digits.startsWith('55')) {
      return `+55 (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleSummarizeConversation = async () => {
    if (!selectedSession) return;
    try {
      // Abrir modal imediatamente com mensagem de carregamento
      setSummaryText(null);
      setSummaryJson(null);
      setSummaryOpen(true);
      setIaLoading(true);
      setIaError(null);
      setIaResult(null);
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/resumo_conversa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ session_id: selectedSession }),
      });
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      if (!response.ok) {
        const msg = typeof parsed === 'object' ? (parsed.message || parsed.error || JSON.stringify(parsed)) : String(parsed);
        throw new Error(msg || `Erro HTTP ${response.status}`);
      }
      // Normaliza formatos: pode vir como array com { output: "{...json...}" }
      let effective: any = parsed;
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.output) {
        try {
          effective = JSON.parse(parsed[0].output);
        } catch {
          effective = { output: parsed[0].output };
        }
      } else if (parsed?.output && typeof parsed.output === 'string') {
        try {
          effective = JSON.parse(parsed.output);
        } catch {
          effective = { output: parsed.output };
        }
      }

      setIaResult(null);
      setSummaryJson(effective);
      setSummaryText(buildReadableSummary(effective, selectedSession));
    } catch (e: any) {
      setIaError(e.message || 'Falha ao resumir conversa');
      // Mantém modal aberto e exibe erro dentro do cabeçalho; conteúdo ficará vazio
    } finally {
      setIaLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!selectedSession) return;
    try {
      setFollowLoading(true);
      setFollowError(null);
      // Não exibir resultado no UI
      const response = await fetch('https://webhooklabz.n8nlabz.com.br/webhook/follow-up-chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ session_id: selectedSession }),
      });
      const text = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
      if (!response.ok) {
        const msg = typeof parsed === 'object' ? (parsed.message || parsed.error || JSON.stringify(parsed)) : String(parsed);
        throw new Error(msg || `Erro HTTP ${response.status}`);
      }
      // Silencioso: sem mensagem na UI
    } catch (e: any) {
      // Silencioso: não exibir erro
    } finally {
      setFollowLoading(false);
    }
  };

  const handleChangeStage = async (newStage: string) => {
    if (!selectedSession) return;
    try {
      setStageUpdating(true);
      const { error } = await supabase
        .from('leads')
        .update({ stage: toCanonicalStage(newStage) })
        .eq('id', selectedSession);
      if (error) throw error;
      setLeadsById(prev => ({
        ...prev,
        [selectedSession]: {
          ...(prev[selectedSession] || { id: selectedSession }),
          stage: toCanonicalStage(newStage),
          name: prev[selectedSession]?.name,
          email: prev[selectedSession]?.email,
          phone: prev[selectedSession]?.phone,
        }
      }));
    } catch {
      // silencioso
    } finally {
      setStageUpdating(false);
    }
  };

  // Helpers para construir um resumo legível a partir do JSON retornado
  const buildReadableSummary = (data: any, sessionId: string): string => {
    try {
      const lead = leadsById[sessionId];
      const lines: string[] = [];
      lines.push('✨ Resumo da Conversa');
      lines.push('');
      // Cabeçalho do cliente
      const clientParts = [] as string[];
      if (lead?.name) clientParts.push(lead.name);
      if (lead?.email) clientParts.push(lead.email);
      if (lead?.phone) clientParts.push(formatPhone(lead.phone));
      const clientLine = clientParts.length > 0 ? clientParts.join(' • ') : '';
      lines.push(`👤 Cliente: ${clientLine}`);
      // Não exibir o session_id no resumo visual
      // Adapter para formato específico do endpoint
      const nota = pickNumber(data, ['nota_atendimento']);
      const statusAt = pickString(data, ['status_atendimento']);
      const resumo = pickString(data, ['resumo_conversa', 'summary', 'resumo']);
      const proximasAcoes = pickArray(data, ['proximas_acoes']);
      const pendencias = pickArray(data, ['pendencias']);
      const riscos = pickArray(data, ['riscos', 'risks']);
      const recomendacoes = pickArray(data, ['recomendacoes_processos']);
      const dados = data?.dados_extraidos || {};
      const imovel = dados?.imovel || {};
      const ag = dados?.agendamento || {};
      const metricas = data?.metricas || {};
      const qualidade = data?.qualidade || {};
      const flags = data?.flags || {};

      if (statusAt || typeof nota === 'number') {
        const parts: string[] = [];
        if (statusAt) parts.push(`📌 Status: ${capitalize(statusAt)}`);
        if (typeof nota === 'number') parts.push(`⭐ Nota atendimento: ${nota}/10`);
        if (parts.length) lines.push(parts.join(' • '));
      }

      if (resumo) {
        lines.push('');
        lines.push('📝 Resumo:');
        lines.push(resumo);
      }

      if (imovel && (imovel.bairro || imovel.valor || imovel.codigo_oferta || imovel.codigo_portal || imovel.link)) {
        lines.push('');
        lines.push('🏠 Imóvel:');
        if (imovel.bairro) lines.push(`• Bairro: ${imovel.bairro}`);
        if (imovel.valor) lines.push(`• Valor: ${imovel.valor}`);
        if (imovel.codigo_oferta) lines.push(`• Código oferta: ${imovel.codigo_oferta}`);
        if (imovel.codigo_portal) lines.push(`• Código portal: ${imovel.codigo_portal}`);
        if (imovel.link) lines.push(`• Link: ${imovel.link}`);
      }

      if (ag && (ag.data || ag.hora || ag.corretor)) {
        lines.push('');
        lines.push('📅 Agendamento:');
        if (ag.data) lines.push(`• Data: ${ag.data}`);
        if (ag.hora) lines.push(`• Hora: ${ag.hora}`);
        if (ag.corretor) lines.push(`• Corretor: ${ag.corretor}`);
      }

      if (Array.isArray(proximasAcoes) && proximasAcoes.length) {
        lines.push('');
        lines.push('✅ Próximas ações:');
        proximasAcoes.forEach((s) => lines.push(`- [ ] ${s}`));
      }

      if (Array.isArray(pendencias) && pendencias.length) {
        lines.push('');
        lines.push('🕗 Pendências:');
        pendencias.forEach((p) => lines.push(`- ${p}`));
      }

      if (Array.isArray(riscos) && riscos.length) {
        lines.push('');
        lines.push('⚠️ Riscos:');
        riscos.forEach((r) => lines.push(`- ${r}`));
      }

      if (Array.isArray(recomendacoes) && recomendacoes.length) {
        lines.push('');
        lines.push('🧭 Recomendações:');
        recomendacoes.forEach((r) => lines.push(`- ${r}`));
      }

      const metricParts: string[] = [];
      if (metricas.total_mensagens != null) metricParts.push(`total mensagens: ${metricas.total_mensagens}`);
      if (metricas.mensagens_ia != null && metricas.mensagens_human != null) metricParts.push(`IA: ${metricas.mensagens_ia} • Human: ${metricas.mensagens_human}`);
      if (metricas.repeticoes_detectadas != null) metricParts.push(`repetições: ${metricas.repeticoes_detectadas}`);
      if (metricParts.length) {
        lines.push('');
        lines.push('📈 Métricas:');
        lines.push(`• ${metricParts.join(' | ')}`);
      }

      const qualKeys = Object.keys(qualidade || {});
      if (qualKeys.length) {
        lines.push('');
        lines.push('🧪 Qualidade:');
        qualKeys.forEach((k) => lines.push(`• ${capitalize(k)}: ${qualidade[k]}/10`));
      }

      const flagTrue = Object.entries(flags || {}).filter(([, v]) => v === true).map(([k]) => k);
      if (flagTrue.length) {
        lines.push('');
        lines.push('🚩 Flags:');
        flagTrue.forEach((f) => lines.push(`- ${f.replace(/_/g, ' ')}`));
      }
      // Sentimento / intenção / status
      const sentiment = pickString(data, ['sentiment', 'sentimento']);
      if (sentiment) {
        const emoji = sentimentEmoji(String(sentiment));
        lines.push(`${emoji} Sentimento: ${capitalize(String(sentiment))}`);
      }
      const intent = pickString(data, ['intent', 'intencao', 'objective', 'objetivo']);
      if (intent) lines.push(`🎯 Intenção: ${intent}`);
      // Resumo principal
      const mainSummary = pickString(data, ['summary', 'resumo', 'overview', 'descricao']);
      if (mainSummary) {
        lines.push('');
        lines.push('📝 Resumo:');
        lines.push(mainSummary);
      }
      // Pontos-chave / destaques
      const keyPoints = pickArray(data, ['key_points', 'pontos_chave', 'highlights', 'destaques']);
      if (keyPoints.length > 0) {
        lines.push('');
        lines.push('🔹 Pontos‑chave:');
        keyPoints.forEach((p) => lines.push(`• ${p}`));
      }
      // Próximos passos / ações
      const nextSteps = pickArray(data, ['next_steps', 'proximos_passos', 'action_items', 'acoes_recomendadas']);
      if (nextSteps.length > 0) {
        lines.push('');
        lines.push('✅ Próximos passos:');
        nextSteps.forEach((s) => lines.push(`- [ ] ${s}`));
      }
      // Riscos / oportunidades (se existirem)
      const risks = pickArray(data, ['risks', 'riscos']);
      if (risks.length > 0) {
        lines.push('');
        lines.push('⚠️ Riscos:');
        risks.forEach((r) => lines.push(`- ${r}`));
      }
      const opps = pickArray(data, ['opportunities', 'oportunidades']);
      if (opps.length > 0) {
        lines.push('');
        lines.push('🚀 Oportunidades:');
        opps.forEach((o) => lines.push(`- ${o}`));
      }
      return lines.join('\n');
    } catch {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
  };

  const sentimentEmoji = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes('pos') || v.includes('positivo') || v.includes('positive')) return '😊';
    if (v.includes('neg') || v.includes('negativo') || v.includes('negative')) return '😟';
    return '😐';
  };

  const pickString = (obj: any, keys: string[]): string | null => {
    for (const k of keys) {
      const val = obj?.[k];
      if (typeof val === 'string' && val.trim()) return val;
      if (typeof val === 'object' && val && typeof val.text === 'string') return val.text;
    }
    return null;
  };

  const pickArray = (obj: any, keys: string[]): string[] => {
    for (const k of keys) {
      const val = obj?.[k];
      if (Array.isArray(val)) return val.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)));
    }
    return [];
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const getStatusBadgeClass = (status?: string | null) => {
    if (!status) return 'bg-gray-700/30 text-gray-200 border border-gray-600/40';
    const s = String(status).toLowerCase();
    if (s.includes('agend')) return 'bg-emerald-700/20 text-emerald-200 border border-emerald-700/40';
    if (s.includes('pend') || s.includes('andamento') || s.includes('andamento')) return 'bg-amber-700/20 text-amber-200 border border-amber-700/40';
    if (s.includes('concl') || s.includes('final') || s.includes('feito')) return 'bg-blue-700/20 text-blue-200 border border-blue-700/40';
    if (s.includes('cancel') || s.includes('perdido')) return 'bg-rose-700/20 text-rose-200 border border-rose-700/40';
    return 'bg-gray-700/30 text-gray-200 border border-gray-600/40';
  };

  const pickNumber = (obj: any, keys: string[]): number | null => {
    for (const k of keys) {
      const val = obj?.[k];
      if (typeof val === 'number') return val;
      if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-120px)] grid grid-cols-12 gap-4">
      {/* Lista de conversas */}
      <div className="col-span-12 md:col-span-4 rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur p-3 flex flex-col">
        <div className="px-2 pb-3">
          <Input
            placeholder="Buscar por sessão ou mensagem..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800/70 border-gray-700 text-gray-200 placeholder:text-gray-400"
          />
        </div>
        <div className="text-xs text-gray-400 px-3 pb-2">
          {loading ? 'Carregando...' : `${filteredSessions.length} conversas`}
          {error && (
            <span className="ml-2 text-red-400">Erro: {error}</span>
          )}
        </div>
        <ScrollArea className="flex-1 h-full">
          <ul className="space-y-1 pr-2 pb-4">
            {filteredSessions.length === 0 && !loading && !error && (
              <li className="px-3 py-2 text-gray-500 text-sm">Nenhuma conversa encontrada.</li>
            )}
            {filteredSessions.map((s) => {
              const lead = leadsById[s.sessionId];
              const displayName = lead?.name && lead.name.trim().length > 0
                ? lead.name
                : 'aguardando nome cliente';
              const isPlaceholder = !lead?.name || lead.name.trim().length === 0;
              return (
              <li key={s.sessionId}>
                <button
                  onClick={() => setSelectedSession(s.sessionId)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                    selectedSession === s.sessionId
                      ? 'bg-blue-600/15 border-blue-700/40 text-white'
                      : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/70 text-gray-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('font-medium truncate', isPlaceholder && 'italic text-amber-300/90 animate-pulse')}>{displayName}</span>
                    <span className="text-[10px] text-gray-400">{formatTimestampBR(s.lastAt)}</span>
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {formatText(s.lastMessageText) || '—'}
                  </div>
                </button>
              </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>

      {/* Janela de chat */}
      <div className="col-span-12 md:col-span-8 rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 sticky top-0 bg-gray-900/70 backdrop-blur z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-gray-400">Cliente</div>
              <div className="text-lg font-semibold text-white truncate">
                {selectedSession && leadsById[selectedSession]?.name
                  ? leadsById[selectedSession]?.name
                  : (selectedSession || 'Selecione uma conversa')}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {selectedSession && leadsById[selectedSession]?.email ? leadsById[selectedSession]?.email : ''}
                {selectedSession && leadsById[selectedSession]?.phone ? ` • ${formatPhone(leadsById[selectedSession]?.phone)}` : ''}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <Select
                onValueChange={async (v) => { await handleChangeStage(v); }}
                value={selectedSession ? (toCanonicalStage(leadsById[selectedSession]?.stage) || '') : ''}
                disabled={!selectedSession || stageUpdating}
              >
                <SelectTrigger className="w-[180px] bg-transparent text-white border border-gray-700/60 hover:border-gray-600 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-gray-100 border border-gray-800">
                  <SelectGroup>
                    <SelectLabel>Status do cliente (Pipeline)</SelectLabel>
                    {STAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent text-white hover:bg-transparent hover:text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                onClick={handleSummarizeConversation}
                disabled={!selectedSession || iaLoading}
                title="Gerar resumo da conversa (IA)"
              >
                ✨ Resumo Conversa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent text-white hover:bg-transparent hover:text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                onClick={handleFollowUp}
                disabled={!selectedSession || followLoading}
                title="Disparar follow up para esta conversa"
              >
                🔔 Fazer Follow up
              </Button>
            </div>
          </div>
          {iaError && (
            <div className="mt-2 text-xs text-red-400">{iaError}</div>
          )}
          {/* Follow up é silencioso */}
        </div>

        <ScrollArea ref={chatAreaRef} className="flex-1 p-3 md:p-4">
          {!selectedSession && (
            <div className="h-full w-full flex items-center justify-center text-gray-400">Selecione uma conversa para visualizar</div>
          )}
          {selectedSession && (
            <div className="space-y-2 md:space-y-3">
              {messagesOfSelected.map((m) => {
                const type: ChatMessageType = (m?.message?.type as ChatMessageType) || 'human';
                const text = formatText(extractText(m));
                const isHuman = String(type).toLowerCase() === 'human';
                const isAI = String(type).toLowerCase() === 'ai';
                return (
                  <div key={m.id} className={cn('flex', isAI ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3 py-2 text-sm border shadow-sm',
                        isAI
                          ? 'bg-blue-600/20 border-blue-700/40 text-blue-100'
                          : isHuman
                          ? 'bg-emerald-600/15 border-emerald-700/40 text-emerald-100'
                          : 'bg-gray-800/70 border-gray-700 text-gray-200'
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words leading-relaxed">{text || '[mensagem vazia]'}</div>
                      <div className="mt-1 text-[10px] text-gray-400 text-right">{formatTimestampBR(m.created_at || m.createdAt || '')}</div>
                    </div>
                  </div>
                );
              })}
              <div id="chat-bottom-anchor" ref={bottomAnchorRef} />
            </div>
          )}
        </ScrollArea>

        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-400">
          Mensagens apenas para visualização (origem: tabela `imobipro_messages`).
        </div>
      </div>
      {/* Modal de Resumo da Conversa (IA) */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-3xl rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 text-gray-100 shadow-2xl ring-1 ring-blue-500/10 backdrop-blur">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-white text-xl font-semibold tracking-tight">
              ✨ Resumo da Conversa
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Visão geral gerada pela IA sobre este atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto space-y-4">
            {iaLoading && !summaryText ? (
              <Card className="bg-gray-950/80 border-gray-800">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-300 animate-pulse">carregando resumo da conversa gerada por IA…</div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Bloco de visão geral com destaque */}
                {(summaryJson?.status_atendimento || summaryJson?.nota_atendimento != null || summaryJson?.metricas) && (
                  <Card className="bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-900/40 shadow-inner">
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {summaryJson?.status_atendimento && (
                          <Badge className={getStatusBadgeClass(summaryJson.status_atendimento)}>
                            <Target className="h-3.5 w-3.5 mr-1" /> {capitalize(String(summaryJson.status_atendimento))}
                          </Badge>
                        )}
                        {summaryJson?.nota_atendimento != null && (
                          <Badge className="bg-amber-700/20 text-amber-200 border border-amber-700/40">
                            <Star className="h-3.5 w-3.5 mr-1" /> {summaryJson.nota_atendimento}/10
                          </Badge>
                        )}
                      </div>
                      {summaryJson?.metricas && (
                        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                          <div className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-center">
                            <div className="text-[10px] text-gray-400">Mensagens</div>
                            <div className="text-sm text-gray-100 font-medium">{summaryJson.metricas.total_mensagens ?? '—'}</div>
                          </div>
                          <div className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-center">
                            <div className="text-[10px] text-gray-400">IA</div>
                            <div className="text-sm text-blue-200 font-medium">{summaryJson.metricas.mensagens_ia ?? '—'}</div>
                          </div>
                          <div className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2 text-center">
                            <div className="text-[10px] text-gray-400">Human</div>
                            <div className="text-sm text-emerald-200 font-medium">{summaryJson.metricas.mensagens_human ?? '—'}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Bloco de cabeçalho resumido */}
                <Card className="bg-gray-950/80 border border-gray-800/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-white">Resumo</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                      {summaryText || 'Sem dados para exibir.'}
                    </div>
                  </CardContent>
                </Card>

                {/* Seções estruturadas quando possível (usando últimas variáveis derivadas no builder) */}
                {summaryJson?.status_atendimento || summaryJson?.nota_atendimento ? (
                  <Card className="bg-gray-950/80 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-300" /> Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center gap-2 flex-wrap">
                      {summaryJson?.status_atendimento && (
                        <Badge variant="secondary" className="bg-blue-700/20 text-blue-200 border border-blue-700/40">
                          {String(summaryJson.status_atendimento)}
                        </Badge>
                      )}
                      {summaryJson?.nota_atendimento != null && (
                        <Badge variant="secondary" className="bg-amber-700/20 text-amber-200 border border-amber-700/40 flex items-center gap-1">
                          <Star className="h-3 w-3" /> {summaryJson.nota_atendimento}/10
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {(summaryJson?.dados_extraidos?.imovel) ? (
                  <Card className="bg-gray-950/80 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white flex items-center gap-2">
                        <HomeIcon className="h-4 w-4 text-emerald-300" /> Imóvel
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-gray-200 space-y-1">
                      {summaryJson?.dados_extraidos?.imovel?.bairro && <div>• Bairro: {summaryJson.dados_extraidos.imovel.bairro}</div>}
                      {summaryJson?.dados_extraidos?.imovel?.valor && <div>• Valor: {summaryJson.dados_extraidos.imovel.valor}</div>}
                      {summaryJson?.dados_extraidos?.imovel?.codigo_oferta && <div>• Código oferta: {summaryJson.dados_extraidos.imovel.codigo_oferta}</div>}
                      {summaryJson?.dados_extraidos?.imovel?.codigo_portal && <div>• Código portal: {summaryJson.dados_extraidos.imovel.codigo_portal}</div>}
                      {summaryJson?.dados_extraidos?.imovel?.link && (
                        <div className="truncate">• Link: <a className="text-blue-300 hover:underline" href={summaryJson.dados_extraidos.imovel.link} target="_blank" rel="noreferrer">{summaryJson.dados_extraidos.imovel.link}</a></div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {(summaryJson?.dados_extraidos?.agendamento) ? (
                  <Card className="bg-gray-950/80 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-amber-300" /> Agendamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-gray-200 space-y-1">
                      {summaryJson?.dados_extraidos?.agendamento?.data && <div>• Data: {summaryJson.dados_extraidos.agendamento.data}</div>}
                      {summaryJson?.dados_extraidos?.agendamento?.hora && <div>• Hora: {summaryJson.dados_extraidos.agendamento.hora}</div>}
                      {summaryJson?.dados_extraidos?.agendamento?.corretor && <div>• Corretor: {summaryJson.dados_extraidos.agendamento.corretor}</div>}
                    </CardContent>
                  </Card>
                ) : null}

                {(Array.isArray(summaryJson?.proximas_acoes) && summaryJson.proximas_acoes.length) ||
                 (Array.isArray(summaryJson?.pendencias) && summaryJson.pendencias.length) ? (
                  <Card className="bg-gray-950/80 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Ações</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(summaryJson?.proximas_acoes) && summaryJson.proximas_acoes.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-300 mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Próximas ações</div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {summaryJson.proximas_acoes.map((x: string, idx: number) => <li key={`pa-${idx}`}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(summaryJson?.pendencias) && summaryJson.pendencias.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-300 mb-2 flex items-center gap-2"><Flag className="h-4 w-4 text-amber-300" /> Pendências</div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {summaryJson.pendencias.map((x: string, idx: number) => <li key={`pd-${idx}`}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {(Array.isArray(summaryJson?.riscos) && summaryJson.riscos.length) ||
                 (Array.isArray(summaryJson?.recomendacoes_processos) && summaryJson.recomendacoes_processos.length) ? (
                  <Card className="bg-gray-950/80 border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Análises</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(summaryJson?.riscos) && summaryJson.riscos.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-300 mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-300" /> Riscos</div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {summaryJson.riscos.map((x: string, idx: number) => <li key={`rk-${idx}`}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(summaryJson?.recomendacoes_processos) && summaryJson.recomendacoes_processos.length > 0 && (
                        <div>
                          <div className="text-sm text-gray-300 mb-2 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-300" /> Recomendações</div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {summaryJson.recomendacoes_processos.map((x: string, idx: number) => <li key={`rc-${idx}`}>{x}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-sm shadow-blue-900/30"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(summaryText || '');
                } catch {}
              }}
            >
              Copiar resumo
            </Button>
            <Button
              variant="ghost"
              className="bg-transparent text-gray-300 hover:text-white border border-gray-700/60 hover:border-gray-600 px-4"
              onClick={() => setSummaryOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChatsView;


