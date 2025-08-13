import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Upload, Send, FileDown } from 'lucide-react';
import { logAudit } from '@/lib/audit/logger';

type UploadRow = { nome: string; telefone: string; email?: string };

function parseCSV(content: string): UploadRow[] {
  const rows: UploadRow[] = [];
  // normalizar quebras de linha
  const lines = content.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return rows;
  const sep = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const headersRaw = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const idxNome = headersRaw.findIndex(h => ['nome','name'].includes(h));
  const idxTelefone = headersRaw.findIndex(h => ['telefone','phone','celular','whatsapp'].includes(h));
  const idxEmail = headersRaw.findIndex(h => ['email','e-mail'].includes(h));
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/^\"|\"$/g, '').trim());
    const nome = idxNome >= 0 ? (cols[idxNome] || '') : '';
    const telefone = idxTelefone >= 0 ? (cols[idxTelefone] || '') : '';
    const email = idxEmail >= 0 ? (cols[idxEmail] || '') : '';
    if (nome || telefone || email) rows.push({ nome, telefone, email });
  }
  return rows;
}

export function DisparadorView() {
  const { profile } = useUserProfile();
  const { instances, loadChats, createChat, sendMessage, loading } = useWhatsAppInstances();

  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [message, setMessage] = useState<string>('Olá {nome}, tudo bem?');
  const [sending, setSending] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const canSend = useMemo(() => Boolean(selectedInstance && rows.length > 0 && message.trim().length > 0), [selectedInstance, rows, message]);

  const handleDownloadTemplate = () => {
    const csv = 'nome,telefone,email\nJoão Silva,55999998888,joao@exemplo.com\nMaria Souza,55911112222,maria@exemplo.com\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-disparador.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    try {
      setFileName(file.name);
      const text = await file.text();
      const parsed = parseCSV(text);
      setRows(parsed);
    } catch (e: any) {
      setErrorLog(prev => [...prev, `Falha ao ler arquivo: ${e?.message || e}`]);
    }
  };

  const resolveTemplate = (tpl: string, row: UploadRow) => tpl
    .replace(/\{nome\}/g, row.nome || '')
    .replace(/\{telefone\}/g, row.telefone || '')
    .replace(/\{email\}/g, row.email || '');

  const startSending = async () => {
    if (!canSend) return;
    setSending(true);
    setSentCount(0);
    setErrorLog([]);
    try {
      try { await logAudit({ action: 'bulk_whatsapp.started', resource: 'bulk_whatsapp', resourceId: undefined, meta: { rows: rows.length, instance_id: selectedInstance } }); } catch {}
      // Carregar chats existentes da instância para evitar conflitos de UNIQUE(instance_id, contact_phone)
      const existing = await loadChats(selectedInstance);
      const phoneToChat = new Map<string, string>(existing.map(c => [c.contact_phone, c.id]));

      for (const r of rows) {
        try {
          const phone = (r.telefone || '').replace(/\D/g, '');
          if (!phone) { setErrorLog(prev => [...prev, `Telefone ausente para ${r.nome || r.email || 'sem nome'}`]); continue; }

          let chatId = phoneToChat.get(phone) || '';
          if (!chatId) {
            const newChat = await createChat({ instance_id: selectedInstance, contact_phone: phone, contact_name: r.nome || undefined });
            chatId = newChat.id;
            phoneToChat.set(phone, chatId);
          }

          const content = resolveTemplate(message, r);
          await sendMessage({ chat_id: chatId, instance_id: selectedInstance, contact_phone: phone, message_type: 'text', content });
          setSentCount(prev => prev + 1);
          // Aguardar pequeno delay para evitar gatilhos de rate limit (ajuste conforme necessário)
          await new Promise(res => setTimeout(res, 150));
        } catch (err: any) {
          setErrorLog(prev => [...prev, `Erro ao enviar para ${r.telefone}: ${err?.message || err}`]);
        }
      }
      try { await logAudit({ action: 'bulk_whatsapp.finished', resource: 'bulk_whatsapp', resourceId: undefined, meta: { sent: sentCount, total: rows.length, instance_id: selectedInstance } }); } catch {}
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Disparador</h1>
        <p className="text-gray-400">Envie mensagens em massa para uma lista de contatos via WhatsApp.</p>
      </div>

      <Card className="bg-gray-800/50 border-gray-700/60">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Instância WhatsApp</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-gray-200">
                  <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione a instância'} />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 text-gray-200 border-gray-700">
                  {instances.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.instance_name} — {i.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Planilha (.csv) com nome, telefone, email</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  className="bg-gray-900/50 border-blue-500/50 text-blue-300 placeholder:text-blue-300 file:text-blue-300 file:bg-gray-800 file:border-blue-500/50 file:rounded-md file:px-3 file:py-1.5 file:hover:bg-gray-700"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="border-blue-500/50 text-blue-300 font-medium"
                >
                  <FileDown className="h-4 w-4 mr-2" /> Baixar modelo
                </Button>
              </div>
              {fileName && <p className="text-xs text-gray-400">Arquivo: {fileName} — {rows.length} linhas</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Mensagem (suporta variáveis {`{nome}`}, {`{telefone}`}, {`{email}`})</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="bg-gray-900/50 border-gray-700 text-gray-200 min-h-[120px]" />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={startSending} disabled={!canSend || sending} className="bg-gradient-to-r from-blue-600 to-purple-600">
              {sending ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Enviar em massa
                </>
              )}
            </Button>
            <p className="text-sm text-gray-400">Enviados: {sentCount} / {rows.length}</p>
          </div>

          {rows.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-400 mb-2">Pré-visualização (primeiras 10 linhas):</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                <strong>Nome</strong>
                <strong>Telefone</strong>
                <strong>Email</strong>
                {rows.slice(0, 10).map((r, idx) => (
                  <React.Fragment key={idx}>
                    <span className="truncate">{r.nome}</span>
                    <span className="truncate">{r.telefone}</span>
                    <span className="truncate">{r.email}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {errorLog.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded p-3 text-sm text-red-300">
              {errorLog.slice(0, 10).map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
              {errorLog.length > 10 && <div>... e mais {errorLog.length - 10} erros</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DisparadorView;


