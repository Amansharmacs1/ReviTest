import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../common/Input';
import { quizService } from '../../services/quizService';
import {
  FileQuestion,
  Play,
  Square,
  Copy,
  Check,
  Search,
  Plus,
  Share2,
  Users,
  Award,
  Clock,
  ExternalLink,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const MyQuizzesTab = ({ onOpenCreate, onSelectQuiz }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await quizService.listQuizzes({
        status: statusFilter,
        search,
      });
      setQuizzes(res.data?.quizzes || []);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [statusFilter, search]);

  const handleCopy = (publicQuizId) => {
    const fullUrl = `${window.location.origin}/quiz/${publicQuizId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(publicQuizId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-navy flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-brand-primary" />
            <span>My Quizzes</span>
          </h2>
          <p className="text-xs text-slate-500">
            Create, share, and track all your student quizzes in one place.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onOpenCreate}
          icon={Plus}
          className="font-bold shadow-md shadow-brand-primary/20 self-start sm:self-auto"
        >
          Create New Quiz
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Quizzes' },
            { id: 'LIVE', label: 'Live' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'STOPPED', label: 'Stopped' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search quiz title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading your quizzes...
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="p-10 text-center space-y-4 bg-white border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-primary flex items-center justify-center mx-auto">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-navy">No Quizzes Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't created any quizzes yet or no quizzes match your search filter.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreate}
            icon={Plus}
          >
            Create Your First Quiz
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => {
            const isLive = quiz.quizStatus === 'LIVE';
            const isStopped = quiz.quizStatus === 'STOPPED';

            return (
              <Card
                key={quiz._id}
                className="p-5 space-y-4 bg-white hover:border-brand-primary/40 transition-all border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Badge
                        variant={
                          isLive ? 'success' : isStopped ? 'danger' : 'warning'
                        }
                        size="sm"
                      >
                        {quiz.quizStatus}
                      </Badge>
                      <h3 className="text-base font-bold text-navy line-clamp-1 hover:text-brand-primary transition-colors cursor-pointer"
                        onClick={() => onSelectQuiz(quiz._id)}
                      >
                        {quiz.title}
                      </h3>
                    </div>
                  </div>

                  {quiz.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {quiz.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{quiz.totalQuestions} Questions</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <span>{quiz.durationMinutes} Mins</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        <strong>{quiz.completedSubmissions}</strong> submissions
                      </span>
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(quiz.publicQuizId)}
                      icon={copiedId === quiz.publicQuizId ? Check : Copy}
                      className="text-xs"
                    >
                      {copiedId === quiz.publicQuizId ? 'Copied' : 'Share Link'}
                    </Button>
                    <a
                      href={`/quiz/${quiz.publicQuizId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg"
                      title="Open student link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectQuiz(quiz._id)}
                    icon={ChevronRight}
                    className="text-xs font-semibold"
                  >
                    Manage & Results
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyQuizzesTab;
