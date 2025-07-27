import React from 'react';
import { CreditCard } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <CreditCard className="h-6 w-6 text-primary" />
      <span className="text-xl font-bold text-primary">credential.studio</span>
    </div>
  );
};

export default Logo;
