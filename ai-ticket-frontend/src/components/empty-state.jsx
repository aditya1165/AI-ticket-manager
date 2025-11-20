import React from "react";

export default function EmptyState({ title = "No items yet", message = "There are no tickets right now.", ctaText = "Create a ticket", onCta }) {
  return (
    <div className="w-full py-16 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke="#6366f1" strokeWidth="1.5" fill="none" />
          <path d="M7 10h10M7 13h6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-md">{message}</p>
      {onCta && (
        <button 
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all" 
          onClick={onCta}
        >
          {ctaText}
        </button>
      )}
    </div>
  );
}
