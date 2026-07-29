import { MoreVertical } from 'lucide-react';
import StatusPill from './StatusPill';

function TransactionsTable({ transactions }) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Time</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                No recent activity
              </td>
            </tr>
          ) : (
            transactions.map((transaction, index) => (
              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.tracking_code}</td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-navy">{transaction.customer_name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(transaction.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-600 capitalize">{transaction.priority}</td>
                <td className="px-6 py-4 text-sm font-medium text-navy">{transaction.weight_kg} kg</td>
                <td className="px-6 py-4">
                  <StatusPill status={transaction.status} />
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionsTable;