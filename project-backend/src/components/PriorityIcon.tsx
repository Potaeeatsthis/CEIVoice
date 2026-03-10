// src/components/PriorityIcon.tsx
export default function PriorityIcon({ priority }: { priority: string }) {
  // Determine how many dots to show (1-4)
  const getLevel = () => {
    switch (priority) {
      case 'URGENT': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      default: return 1; // LOW
    }
  };

  // Determine color based on priority
  const getColor = () => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-blue-500';
      default: return 'bg-emerald-500'; // LOW
    }
  };

  const level = getLevel();

  return (
    <div className="flex gap-1.5 items-center" title={`Priority: ${priority}`}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`
            w-2 h-2 rounded-full transition-all duration-300 
            ${i <= level ? getColor() : 'bg-zinc-800'} 
          `}
        />
      ))}
    </div>
  );
}

