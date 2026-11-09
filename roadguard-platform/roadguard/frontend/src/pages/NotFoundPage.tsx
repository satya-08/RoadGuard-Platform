import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 text-center">
      <div className="p-4 bg-red-500/10 text-red-400 rounded-full mb-4 border border-red-500/30">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">404 &mdash; Page Not Found</h1>
      <p className="text-sm text-slate-400 mt-2 max-w-md">
        The requested RoadGuard view or resource could not be found or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
};
