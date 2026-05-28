import React, { useEffect, useMemo, useState } from 'react';
import api from '../utils/axios';
import { Shield, Users, Database, RefreshCcw } from 'lucide-react';
import AdminCrosswords from './AdminCrosswords';
import AdminCreativity from './AdminCreativity';
import AdminBingo from './AdminBingo';

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-5">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </div>
      <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

const RoleBadge = ({ role }) => (
  <span
    className={
      role === 'ADMIN'
        ? 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700'
        : 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700'
    }
  >
    {role}
  </span>
);

export default function AdminBackoffice() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ]);
      setStats(statsRes.data?.data || null);
      setUsers(usersRes.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => {
    const s = stats || {};
    return [
      { icon: Users, label: 'Utilisateurs', value: s.users ?? '—' },
      { icon: Database, label: 'Jeux', value: s.games ?? '—' },
      { icon: Shield, label: 'Crosswords', value: s.crosswords ?? '—' },
    ];
  }, [stats]);

  const changeRole = async (userId, role) => {
    setBusyUserId(userId);
    setError('');
    try {
      const res = await api.patch(`/api/admin/users/${userId}/role`, { role });
      const updated = res.data?.data;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Erreur');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Backoffice</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin</h1>
            <p className="text-gray-600 mt-1">Gestion des utilisateurs et stats de la plateforme.</p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 border border-white/30 shadow hover:shadow-md transition"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {cards.map((c) => (
            <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} />
          ))}
        </div>

        <div className="flex gap-6 border-b border-gray-200 mt-8 mb-6 overflow-x-auto">
          {[
            { id: 'users', label: 'Utilisateurs' },
            { id: 'crosswords', label: 'Mots-Croisés' },
            { id: 'creativity', label: 'Créativité' },
            { id: 'bingo', label: 'Loto Allemand' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'text-purple-700 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">Utilisateurs</div>
              <div className="text-sm text-gray-600">Changer les rôles (ADMIN/USER).</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr className="text-left text-gray-600">
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Rôle</th>
                  <th className="px-5 py-3 font-semibold">Créé</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-gray-600" colSpan={4}>
                      Chargement...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-gray-600" colSpan={4}>
                      Aucun utilisateur.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/40">
                      <td className="px-5 py-3 text-gray-900">{u.email}</td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          className="px-3 py-2 rounded-xl border border-gray-200 bg-white shadow-sm disabled:opacity-60"
                          value={u.role}
                          disabled={busyUserId === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'crosswords' && <AdminCrosswords />}
        {activeTab === 'creativity' && <AdminCreativity />}
        {activeTab === 'bingo' && <AdminBingo />}
      </div>
    </div>
  );
}

