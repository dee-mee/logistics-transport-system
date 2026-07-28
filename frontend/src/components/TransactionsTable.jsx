import { MoreVertical } from 'lucide-react';
import StatusPill from './StatusPill';

function TransactionsTable({ transactions }) {
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sl</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Time</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((transaction, index) => (
            <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-navy">{transaction.customer}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{transaction.dateTime}</td>
              <td className="px-6 py-4 text-sm text-gray-600">{transaction.type}</td>
              <td className="px-6 py-4 text-sm font-medium text-navy">{transaction.total}</td>
              <td className="px-6 py-4">
                <StatusPill status={transaction.status} />
              </td>
              <td className="px-6 py-4">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical size={18} className="text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TransactionsTable;