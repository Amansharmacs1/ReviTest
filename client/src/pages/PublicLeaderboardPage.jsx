import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizService } from '../services/quizService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import {
  Award,
  Trophy,
  Medal,
  Clock,
  Search,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const PublicLeaderboardPage = () => {
  const { publicQuizId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await quizService.getPublicLeaderboard(publicQuizId);
      setData(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [publicQuizId]);

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-navy">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || true) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-elevated border border-slate-200">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="warning" size="sm">
              Creator Only
            </Badge>
            <h2 className="text-xl font-bold text-navy">Private Leaderboard</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This leaderboard is private and only visible to the quiz creator. If you are the instructor, please sign in to your REVITEST organization dashboard to view the leaderboard.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={`/quiz/${publicQuizId}`} className="w-full sm:w-auto">
              <Button variant="outline" size="sm" icon={ArrowLeft} className="w-full">
                Back to Quiz
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full">
                Sign in to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const { quizTitle, leaderboard = [] } = data || {};
  const filtered = leaderboard.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to={`/quiz/${publicQuizId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Quiz Page</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-navy tracking-tight flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-500" />
              <span>Quiz Leaderboard</span>
            </h1>
            <p className="text-xs text-slate-500">{quizTitle}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            icon={RefreshCw}
            className="self-start sm:self-auto"
          >
            Refresh
          </Button>
        </div>

        {/* Top 3 Podium Cards */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((student, idx) => {
              const medals = [
                { color: 'bg-amber-100 text-amber-700 border-amber-300', label: '1st Place' },
                { color: 'bg-slate-200 text-slate-700 border-slate-300', label: '2nd Place' },
                { color: 'bg-amber-50 text-amber-900 border-amber-200', label: '3rd Place' },
              ];
              const medal = medals[idx];

              return (
                <Card
                  key={idx}
                  className={`p-5 text-center space-y-2 border-2 ${medal.color} relative overflow-hidden`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {medal.label}
                  </div>
                  <h3 className="text-lg font-black text-navy truncate">
                    {student.name}
                  </h3>
                  <div className="text-2xl font-black text-navy">
                    {student.score}{' '}
                    <span className="text-xs font-medium text-slate-500">
                      / {student.maximumMarks}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                    <span>{student.percentage}%</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(student.timeTakenSeconds)}</span>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Leaderboard Table */}
        <Card className="p-5 sm:p-6 space-y-4 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-navy text-sm">
              All Rankings ({filtered.length})
            </h3>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Percentage</th>
                  <th className="py-3 px-3">Time Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No matching participants found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.rank <= 3
                          ? 'bg-amber-50/30 font-semibold'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            item.rank === 1
                              ? 'bg-amber-400 text-white'
                              : item.rank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : item.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-navy">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-primary">
                        {item.score} / {item.maximumMarks}
                      </td>
                      <td className="py-3 px-3">{item.percentage}%</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {formatTime(item.timeTakenSeconds)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PublicLeaderboardPage;
