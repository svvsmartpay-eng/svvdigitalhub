import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Crumb { label: string; href?: string; }
export default function PageHeader({ title, breadcrumbs, actions, subtitle }: { title: string; breadcrumbs?: Crumb[]; actions?: ReactNode; subtitle?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        {breadcrumbs && (
          <nav className="flex items-center text-sm text-gray-500 mb-1 flex-wrap">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                {b.href ? <Link to={b.href} className="hover:text-[#1e3a5f] transition-colors">{b.label}</Link> : <span>{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
