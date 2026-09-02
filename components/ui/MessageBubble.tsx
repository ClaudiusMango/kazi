'use client';

export default function MessageBubble({
  role,
  children,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
}) {
  return (
    <div className={`bubble ${role === 'user' ? 'bubble-patient' : 'bubble-ai'}`}>
      {children}
    </div>
  );
}
