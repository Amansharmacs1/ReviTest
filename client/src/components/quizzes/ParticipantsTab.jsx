import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { quizService } from '../../services/quizService';
import {
  Users,
  Search,
  Download,
  GraduationCap,
  Mail,
  Building,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const ParticipantsTab = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await quizService.getAllParticipants({ search });
      setParticipants(res.data || []);
    } catch (err) {
      console.error('Error fetching participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [search]);

  const handleExport = () => {
    if (participants.length === 0) return;
    const headers = [
      'Student Name',
      'Email',
      'Roll Number',
      'College',
      'Department',
      'Quiz Title',
      'Score',
      'Percentage',
      'Status',
      'Submitted At',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      let s = String(val).replace(/"/g, '""');
      if (['=', '+', '-', '@'].includes(s.charAt(0))) s = `'${s}`;
      return `"${s}"`;
    };

    const rows = participants.map((p) => [
      escapeCsv(p.name),
      escapeCsv(p.email),
      escapeCsv(p.rollNumber),
      escapeCsv(p.college),
      escapeCsv(p.department),
      escapeCsv(p.quizId?.title || 'Quiz'),
      p.score,
      `${p.percentage}%`,
      p.status,
      p.submittedAt ? new Date(p.submittedAt).toLocaleString() : 'In Progress',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants_roster_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-primary" />
            <span>All Quiz Participants ({participants.length})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Directory of students who joined and participated in your quizzes.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchParticipants}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={participants.length === 0}
            icon={Download}
          >
            Export All
          </Button>
        </div>
      </div>

      <div className="w-full sm:w-80">
        <Input
          placeholder="Search by student name, email, or roll no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </div>

      <Card className="overflow-hidden bg-white shadow-xs border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-3.5">Student</th>
                <th className="py-3 px-3.5">Roll No</th>
                <th className="py-3 px-3.5">College / Dept</th>
                <th className="py-3 px-3.5">Quiz Taken</th>
                <th className="py-3 px-3.5">Score</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading participants...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No student participants found yet. Create and share a quiz to see students here.
                  </td>
                </tr>
              ) : (
                participants.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-navy">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.email}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">
                      {p.rollNumber || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <div>{p.college || '—'}</div>
                      {p.department && (
                        <div className="text-[11px] text-slate-400">
                          {p.department}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-navy">
                      {p.quizId?.title || 'Quiz'}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-brand-primary">
                      {p.status === 'SUBMITTED' ? (
                        <span>
                          {p.score} ({p.percentage}%)
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <Badge
                        variant={
                          p.status === 'SUBMITTED' ? 'success' : 'warning'
                        }
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3.5 text-slate-400">
                      {p.submittedAt
                        ? new Date(p.submittedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'In Progress'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ParticipantsTab;
