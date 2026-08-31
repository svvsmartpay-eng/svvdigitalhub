import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function SearchInput({ onSearch, placeholder = 'Search...', value: externalValue }: { onSearch: (q: string) => void; placeholder?: string; value?: string }) {
  const [value, setValue] = useState(externalValue || '');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, 350);
    return () => clearTimeout(handler);
  }, [value, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="pl-9 pr-9" />
      {value && (
        <button onClick={() => { setValue(''); onSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
