import { TrendingUp, TrendingDown } from 'lucide-react';

function StatCard({ label, value, delta, deltaDirection }) {
  const isPositive = deltaDirection === 'up';
  const deltaColor = isPositive ? 'text-green-600' : 'text-red-600';
  const deltaBg = isPositive ? 'bg-green-100' : 'bg-red-100';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
          <TrendIcon size={16} className={isPositive ? 'text-green-600' : 'text-red-600'} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-3">{value}</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">vs last week</span>
        <span className={`px-2 py-1 rounded-full ${deltaBg} ${deltaColor} flex items-center gap-1 font-medium`}>
          <TrendIcon size={12} />
          {Math.abs(delta)}%
        </span>
      </div>
    </div>
  );
}

export default StatCard;