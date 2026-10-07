import { useState, useEffect, useCallback } from 'react';
import { getFraudAudit, getFraudStats, overrideFraudDecision } from '../api/fraud';
import { FraudBadge } from '../components/shared/FraudBadge';
import { FraudScoreBar } from '../components/shared/FraudScoreBar';
import type { FraudAuditEntry, FraudStats } from '../types/index';

export function FraudDashboardPage() {
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [auditLog, setAuditLog] = useState<FraudAuditEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'SupportIQ — Fraud Audit Center';
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, auditData] = await Promise.all([
        getFraudStats(),
        getFraudAudit({ page, limit: 20, decision: filter || undefined }),
      ]);
      setStats(statsData);
      setAuditLog(auditData.data);
      setHasMore(auditData.hasMore);
    } catch (err) {
      console.error('Failed to load fraud data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOverride = async (auditId: string, decision: 'ACCEPT' | 'DECLINE') => {
    try {
      await overrideFraudDecision(auditId, decision, 'Admin override from dashboard');
      loadData();
    } catch (err) {
      console.error('Override failed:', err);
    }
  };

  return (
    <div className="fraud-dashboard">
      {/* Stats Cards */}
      <div className="fraud-stats-grid">
        <div className="fraud-stat-card">
          <div className="fraud-stat-card__value">{stats?.totalScored ?? '—'}</div>
          <div className="fraud-stat-card__label">Total Scored</div>
        </div>
        <div className="fraud-stat-card fraud-stat-card--success">
          <div className="fraud-stat-card__value">{stats?.accepted ?? '—'}</div>
          <div className="fraud-stat-card__label">Accepted</div>
        </div>
        <div className="fraud-stat-card fraud-stat-card--warning">
          <div className="fraud-stat-card__value">{stats?.review ?? '—'}</div>
          <div className="fraud-stat-card__label">Under Review</div>
        </div>
        <div className="fraud-stat-card fraud-stat-card--danger">
          <div className="fraud-stat-card__value">{stats?.blocked ?? '—'}</div>
          <div className="fraud-stat-card__label">Blocked</div>
        </div>
        <div className="fraud-stat-card">
          <div className="fraud-stat-card__value">{stats?.fraudRate ?? '0.00'}%</div>
          <div className="fraud-stat-card__label">Fraud Rate</div>
        </div>
        <div className="fraud-stat-card fraud-stat-card--accent">
          <div className="fraud-stat-card__value">
            ৳{stats?.amountSaved?.toLocaleString() ?? '0'}
          </div>
          <div className="fraud-stat-card__label">Amount Saved</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="fraud-filter-bar">
        <h2 className="fraud-section-title">Decision Audit Log</h2>
        <div className="fraud-filter-bar__actions">
          <select
            className="fraud-select"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Decisions</option>
            <option value="ACCEPT">Accept</option>
            <option value="REVIEW">Review</option>
            <option value="DECLINE">Decline</option>
          </select>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="fraud-table-container">
        <table className="fraud-table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th>Amount</th>
              <th>Sender → Receiver</th>
              <th>Score</th>
              <th>Decision</th>
              <th>Model</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auditLog.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="fraud-table__empty">
                  {filter ? 'No transactions matching this filter.' : 'No scored transactions yet. Transactions will appear here once Ojuri is enabled.'}
                </td>
              </tr>
            )}
            {auditLog.map((entry) => (
              <>
                <tr
                  key={entry.tx_id}
                  className={`fraud-table__row ${expandedRow === entry.tx_id ? 'fraud-table__row--expanded' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === entry.tx_id ? null : entry.tx_id)}
                >
                  <td className="fraud-table__txid">{entry.tx_id}</td>
                  <td className="fraud-table__amount">৳{entry.amount.toLocaleString()}</td>
                  <td className="fraud-table__parties">
                    <span>{entry.sender}</span>
                    <span className="fraud-table__arrow">→</span>
                    <span>{entry.receiver}</span>
                  </td>
                  <td><FraudScoreBar score={entry.fraud_score} /></td>
                  <td><FraudBadge decision={entry.fraud_decision} /></td>
                  <td className="fraud-table__model">{entry.model_version || '—'}</td>
                  <td className="fraud-table__time">
                    {new Date(entry.time).toLocaleString()}
                  </td>
                  <td className="fraud-table__actions">
                    {(entry.fraud_decision === 'REVIEW' || entry.fraud_decision === 'DECLINE') && entry.ojuri_audit_id && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={(e) => { e.stopPropagation(); handleOverride(entry.ojuri_audit_id!, 'ACCEPT'); }}
                        title="Override to ACCEPT"
                      >
                        ✓ Accept
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRow === entry.tx_id && entry.reason_codes && (
                  <tr key={`${entry.tx_id}-detail`} className="fraud-table__detail-row">
                    <td colSpan={8}>
                      <div className="fraud-reason-codes">
                        <strong>Reason Codes:</strong>
                        <ul>
                          {(entry.reason_codes || []).map((rc, i) => (
                            <li key={i}>
                              <span className="fraud-reason-code">{rc.code}</span>
                              <span>{rc.description}</span>
                              <span className="fraud-reason-contribution">
                                {(rc.contribution * 100).toFixed(1)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="fraud-pagination">
        <button
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage(p => p - 1)}
        >
          ← Previous
        </button>
        <span className="fraud-pagination__label">Page {page}</span>
        <button
          className="btn btn-secondary"
          disabled={!hasMore}
          onClick={() => setPage(p => p + 1)}
        >
          Next →
        </button>
      </div>

      {/* Sentinel Link */}
      <div className="fraud-sentinel-link">
        <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          Open Sentinel Dashboard →
        </a>
        <span className="fraud-sentinel-link__desc">
          Advanced fraud ops: graph analytics, model training, feature catalog
        </span>
      </div>
    </div>
  );
}
