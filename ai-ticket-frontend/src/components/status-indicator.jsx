export default function StatusIndicator({ status = "offline", size = "sm" }) {
  const sizeClasses = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const statusConfig = {
    online: {
      color: "bg-green-500",
      label: "Online",
      ring: "ring-green-500/20"
    },
    offline: {
      color: "bg-gray-500",
      label: "Offline",
      ring: "ring-gray-500/20"
    },
    dnd: {
      color: "bg-red-500",
      label: "Do Not Disturb",
      ring: "ring-red-500/20"
    }
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <div className="relative inline-flex items-center">
      <div 
        className={`${sizeClasses[size]} ${config.color} rounded-full ring-2 ${config.ring} ring-offset-1 ring-offset-slate-800`}
        title={config.label}
      />
    </div>
  );
}
