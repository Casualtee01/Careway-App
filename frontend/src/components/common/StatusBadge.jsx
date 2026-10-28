const labels = { pending: 'Pending', accepted: 'Accepted', cancelled: 'Cancelled', completed: 'Completed', approved: 'Approved', rejected: 'Rejected' };

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status || 'unknown'}`}>{labels[status] || status || 'Unknown'}</span>;
}
