import React from 'react';
import { useLogin } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-1/2 bg-[#1e3a5f] p-12 text-white flex-col justify-center">
        <h1 className="text-4xl font-bold mb-4">SVV Communication</h1>
        <p className="text-xl opacity-80">Asset Management System</p>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm border">
          <h2 className="text-2xl font-bold text-center mb-6">Login to Account</h2>
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">{(error as any)?.response?.data?.message || 'Login failed'}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" loading={isPending}>Login</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
