import { ChatIcon, SearchIcon, ShieldIcon, PersonIcon } from './icons';

/**
 * Presents the existing support pipeline (ticket → AI intent classification →
 * transaction + fraud-status lookup → answer, with human escalation). Presentation only.
 */
const STEPS = [
  { Icon: ChatIcon, title: 'You describe the issue', desc: 'Tell us what went wrong in your own words.' },
  { Icon: SearchIcon, title: 'AI understands the request', desc: 'It works out what kind of problem this is.' },
  { Icon: ShieldIcon, title: 'Your transactions are checked', desc: 'Recent transfers and fraud-monitoring status are reviewed.' },
  { Icon: PersonIcon, title: 'Answer or human agent', desc: 'You get guidance, and a support agent steps in when needed.' },
];

export function SupportFlow({ variant = 'vertical' }: { variant?: 'vertical' | 'horizontal' }) {
  return (
    <ol className={`mfs-flow mfs-flow-${variant}`}>
      {STEPS.map(({ Icon, title, desc }) => (
        <li key={title}>
          <span className="mfs-flow-icon"><Icon size={16} /></span>
          <span className="mfs-flow-text">
            <b>{title}</b>
            <span>{desc}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
