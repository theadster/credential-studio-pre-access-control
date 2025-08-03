import React from 'react';
import { IdCard } from 'lucide-react';

const LogoExport: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      {/* High-resolution logo for export */}
      <div className="flex items-center space-x-8">
        <IdCard className="h-32 w-32 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
        <span 
          className="font-bold text-[#8b5cf6]" 
          style={{ 
            fontSize: '8rem',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
          }}
        >
          credential.studio
        </span>
      </div>
      
      {/* Alternative sizes for different use cases */}
      <div className="absolute top-8 left-8 space-y-8">
        {/* Medium size */}
        <div className="flex items-center space-x-4">
          <IdCard className="h-16 w-16 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
          <span 
            className="font-bold text-[#8b5cf6]" 
            style={{ 
              fontSize: '4rem',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            }}
          >
            credential.studio
          </span>
        </div>
        
        {/* Small size */}
        <div className="flex items-center space-x-2">
          <IdCard className="h-8 w-8 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
          <span 
            className="font-bold text-[#8b5cf6]" 
            style={{ 
              fontSize: '2rem',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            }}
          >
            credential.studio
          </span>
        </div>
      </div>
      
      {/* Icon only versions */}
      <div className="absolute top-8 right-8 space-y-8 flex flex-col items-center">
        <IdCard className="h-32 w-32 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
        <IdCard className="h-16 w-16 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
        <IdCard className="h-8 w-8 text-[#8b5cf6]" style={{ strokeWidth: 1.5 }} />
      </div>
      
      {/* Dark background version */}
      <div className="absolute bottom-8 left-8 bg-gray-900 p-8 rounded-lg">
        <div className="flex items-center space-x-4">
          <IdCard className="h-16 w-16 text-white" style={{ strokeWidth: 1.5 }} />
          <span 
            className="font-bold text-white" 
            style={{ 
              fontSize: '4rem',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            }}
          >
            credential.studio
          </span>
        </div>
      </div>
    </div>
  );
};

export default LogoExport;