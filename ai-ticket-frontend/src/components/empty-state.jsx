import React from "react";

export default function EmptyState({ title = "No items yet", message = "There are no tickets right now.", ctaText = "Create a ticket", onCta }) {
  return (
    <div className="w-full py-12 flex flex-col items-center text-center">
      <svg width="140" height="140" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 opacity-80">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="#c7d2fe" strokeWidth="1.5" fill="#eef2ff" />
        <path d="M7 9h10M7 12h7" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-md">{message}</p>
      {onCta && (
        <button className="btn btn-primary" onClick={onCta}>{ctaText}</button>
      )}
    </div>
  );
}
