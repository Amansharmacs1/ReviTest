import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { saasService } from '../../services/saasService';
import {
  Key,
  Webhook,
  Download,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';

export const IntegrationsSettingsTab = () => {
  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdRawKeyModal, setCreatedRawKeyModal] = useState(null); // { rawKey, name, keyPrefix }
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [createWebhookModalOpen, setCreateWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['RESULTS_PUBLISHED', 'EXAM_SUBMITTED']);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Data export state
  const [downloadingRoster, setDownloadingRoster] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchApiKeys = async () => {
    try {
      setLoadingKeys(true);
      const res = await saasService.listApiKeys();
      setApiKeys(res.data?.keys || []);
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setLoadingWebhooks(true);
      const res = await saasService.listWebhooks();
      setWebhooks(res.data?.webhooks || []);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  // Handle API Key creation
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    setFeedback(null);
    try {
      const res = await saasService.createApiKey({
        name: newKeyName.trim(),
        permissions: ['READ_RESULTS', 'READ_ROSTER', 'READ_EXAMS'],
      });
      setCreateKeyModalOpen(false);
      setNewKeyName('');
      setCreatedRawKeyModal(res.data);
      fetchApiKeys();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate API key.' });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    try {
      await saasService.revokeApiKey(keyId);
      setFeedback({ type: 'success', message: 'API key revoked.' });
      fetchApiKeys();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to revoke API key.' });
    }
  };

  // Handle Webhook creation
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!webhookName.trim() || !webhookUrl.trim()) return;

    setCreatingWebhook(true);
    setFeedback(null);
    try {
      await saasService.createWebhook({
        name: webhookName.trim(),
        url: webhookUrl.trim(),
        events: selectedEvents,
      });
      setCreateWebhookModalOpen(false);
      setWebhookName('');
      setWebhookUrl('');
      setFeedback({ type: 'success', message: 'Webhook subscription registered.' });
      fetchWebhooks();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create webhook.' });
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id) => {
    try {
      await saasService.deleteWebhook(id);
      setFeedback({ type: 'success', message: 'Webhook removed.' });
      fetchWebhooks();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove webhook.' });
    }
  };

  // Handle Roster CSV Download
  const handleDownloadRosterCsv = async () => {
    setDownloadingRoster(true);
    try {
      const response = await saasService.downloadRosterCsv();
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'candidates_roster.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to download candidate roster.' });
    } finally {
      setDownloadingRoster(false);
    }
  };

  const handleCopyRawKey = () => {
    if (!createdRawKeyModal?.rawKey) return;
    navigator.clipboard.writeText(createdRawKeyModal.rawKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. API Keys Section */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-primary" />
              <span>Programmatic API Keys</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authenticate external SIS, LMS, or HR software with scoped API credentials.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setCreateKeyModalOpen(true)}
          >
            Generate API Key
          </Button>
        </div>

        {loadingKeys ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading API keys...</div>
        ) : apiKeys.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No programmatic API keys generated yet. Click &quot;Generate API Key&quot; to integrate your SIS or LMS.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Key Identifier</th>
                  <th className="p-3">Permissions</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiKeys.map((k) => (
                  <tr key={k._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-navy">{k.name}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {k.keyPrefix}••••••••
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {k.permissions?.map((p) => (
                          <Badge key={p} variant="neutral" size="sm">
                            {p.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={k.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {k.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      {k.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleRevokeApiKey(k._id)}
                          className="text-rose-600 hover:bg-rose-50"
                          title="Revoke Key"
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2. Webhook Subscriptions Section */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-navy flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-600" />
              <span>Real-Time Webhook Subscriptions</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Receive automated HMAC-signed HTTP POST event payloads when assessments are submitted or evaluated.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setCreateWebhookModalOpen(true)}
          >
            Add Endpoint
          </Button>
        </div>

        {loadingWebhooks ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No webhook endpoints registered. Register a URL to receive real-time notifications.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Destination URL</th>
                  <th className="p-3">Events</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {webhooks.map((w) => (
                  <tr key={w._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-navy">{w.name}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                      {w.url}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {w.events?.map((ev) => (
                          <Badge key={ev} variant="info" size="sm">
                            {ev}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="success" size="sm" dot>
                        Active
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDeleteWebhook(w._id)}
                        className="text-rose-600 hover:bg-rose-50"
                        title="Delete Webhook"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Data Export & CSV Download Center */}
      <Card className="p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-navy flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Data Export & Archival Hub</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Export raw records for external institutional reporting, audits, or spreadsheet workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-navy text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Candidate Enrollment Roster (.CSV)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Download a complete spreadsheet export of all registered examinees, student IDs,
                departments, and account statuses.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadRosterCsv}
              disabled={downloadingRoster}
              className="w-full justify-center bg-white"
            >
              {downloadingRoster ? 'Generating CSV...' : 'Download Roster CSV'}
            </Button>
          </div>

          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-navy text-xs">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Schedule Results & Analytics (.CSV)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                To download assessment results, rankings, and scores, navigate to the &quot;Exam
                Schedules&quot; tab and click the analytics button on any completed assessment.
              </p>
            </div>
            <span className="text-[11px] text-brand-primary font-semibold">
              Available from Exam Schedules table
            </span>
          </div>
        </div>
      </Card>

      {/* Modal: Create API Key */}
      <Modal
        isOpen={createKeyModalOpen}
        onClose={() => setCreateKeyModalOpen(false)}
        title="Generate Programmatic API Key"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateApiKey} className="space-y-4 text-xs">
          <Input
            label="Key Identifier / Integration Name"
            placeholder="e.g. Canvas LMS Integration"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
          />

          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] space-y-1">
            <span className="font-bold block">Security Notice:</span>
            <p>
              Your full raw key will be revealed only once upon creation. Store it securely in your
              key vault.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setCreateKeyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Key}
              disabled={creatingKey || !newKeyName.trim()}
            >
              {creatingKey ? 'Generating...' : 'Generate API Key'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Display Raw Key (Shown Once) */}
      <Modal
        isOpen={Boolean(createdRawKeyModal)}
        onClose={() => setCreatedRawKeyModal(null)}
        title="API Key Created Successfully"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Copy Your Secret Key Now</span>
              <p className="text-[11px]">
                This secret API key will <strong>never be shown again</strong>. Please copy and store
                it securely.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Secret API Key:
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-300 bg-slate-50 font-mono text-xs select-all break-all">
              <span className="flex-1 font-semibold text-navy">{createdRawKeyModal?.rawKey}</span>
              <Button
                variant="outline"
                size="sm"
                icon={copiedKey ? Check : Copy}
                onClick={handleCopyRawKey}
                className="shrink-0"
              >
                {copiedKey ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button variant="primary" size="sm" onClick={() => setCreatedRawKeyModal(null)}>
              I Have Saved My Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Webhook */}
      <Modal
        isOpen={createWebhookModalOpen}
        onClose={() => setCreateWebhookModalOpen(false)}
        title="Register Webhook Endpoint"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateWebhook} className="space-y-4 text-xs">
          <Input
            label="Webhook Name"
            placeholder="e.g. Student Information System Sync"
            value={webhookName}
            onChange={(e) => setWebhookName(e.target.value)}
            required
          />

          <Input
            label="Destination URL (HTTPS)"
            placeholder="https://api.institution.edu/webhooks/revitest"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase">
              Subscribed Event Triggers:
            </label>
            <div className="space-y-1">
              {[
                { id: 'RESULTS_PUBLISHED', label: 'Results Published' },
                { id: 'EXAM_SUBMITTED', label: 'Candidate Exam Submitted' },
                { id: 'VIOLATION_FLAGGED', label: 'Security Violation Flagged' },
                { id: 'EXAM_PUBLISHED', label: 'New Exam Published' },
              ].map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(ev.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedEvents([...selectedEvents, ev.id]);
                      else setSelectedEvents(selectedEvents.filter((x) => x !== ev.id));
                    }}
                    className="w-3.5 h-3.5 text-brand-primary rounded border-slate-300"
                  />
                  <span>{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setCreateWebhookModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Webhook}
              disabled={creatingWebhook || !webhookName.trim() || !webhookUrl.trim()}
            >
              {creatingWebhook ? 'Registering...' : 'Register Webhook'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default IntegrationsSettingsTab;
