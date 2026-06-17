'use client'

import { motion } from 'framer-motion'
import { useQueryState } from 'nuqs'
import { 
  Cpu, 
  Zap, 
  Activity, 
  FileText, 
  Database, 
  Globe, 
  Eye, 
  TrendingUp, 
  Award,
  LucideIcon
} from 'lucide-react'

interface AgentInfo {
  name: string;
  description: string;
  subtext: string;
  icon: LucideIcon;
}

const AGENT_INFO_MAP: Record<string, AgentInfo> = {
  cnc_agent_expert: {
    name: 'CNC Manufacturing Assistant',
    description: 'Machining Expert & Troubleshooting',
    subtext: 'Ask about startup procedures, machine coordinates, spindle speed anomalies, feeds, speeds, or active alarm code troubleshooting.',
    icon: Cpu
  },
  oee_agent: {
    name: 'OEE Optimization Assistant',
    description: 'Efficiency & Productivity Analytics',
    subtext: 'Ask about Availability, Performance, Quality, or Overall Equipment Effectiveness metrics to optimize shift output.',
    icon: Zap
  },
  cycle_time_agent: {
    name: 'Cycle Time Analysis Expert',
    description: 'Bottleneck Detection & Throughput',
    subtext: 'Ask about average cycle times, target variance offsets, or line bottlenecks affecting delivery throughput.',
    icon: Activity
  },
  six_sigma_expert: {
    name: 'Six Sigma Quality Specialist',
    description: 'QA & Process Variations Specialist',
    subtext: 'Ask about process capability indices, defect rates, Pareto charts, or DMAIC frameworks to improve quality levels.',
    icon: FileText
  },
  knowledge_agent: {
    name: 'Centralized Knowledge Assistant',
    description: 'Information & Manuals Architect',
    subtext: 'Ask about safety regulations, machine documents, startup files, or reference logs in the manuals database.',
    icon: Database
  },
  web_agent: {
    name: 'Enterprise Web Integrator',
    description: 'Connectivity & Cloud Sync Gateway',
    subtext: 'Ask about ERP integrations, database sync logs, web queries, or live external search queries.',
    icon: Globe
  },
  observer_agent: {
    name: 'Observer Agent',
    description: 'Production System Monitor & Analyst',
    subtext: 'Ask about system anomalies, process inefficiencies, or live incident trackers to dispatch specialized agents.',
    icon: Eye
  },
  predict_plan_agent: {
    name: 'Predictive Planning Assistant',
    description: 'Maintenance & Downtime Forecasting',
    subtext: 'Ask about tool wear timelines, temperature forecasts, or planned downtime schedules.',
    icon: TrendingUp
  },
  mentor_agent: {
    name: 'Strategic Industrial Mentor',
    description: 'Lean Deployment & Continuous Improvement',
    subtext: 'Ask about 5S audits, lead time scorecards, Kaizen ideas, or operational business impact strategies.',
    icon: Award
  }
};

const ChatBlankState = () => {
  const [agentId] = useQueryState('agent');
  
  // Lookup agent information, falling back to observer_agent if not found
  const info = AGENT_INFO_MAP[agentId || 'observer_agent'] || AGENT_INFO_MAP.observer_agent;
  const ActiveIcon = info.icon;

  // Blue and Black combination as requested
  const color = 'text-blue-500 dark:text-blue-400';
  const bgColor = 'bg-blue-500/5 dark:bg-blue-500/10';
  const borderColor = 'border-blue-500/10 dark:border-blue-500/20';
  const glowColor = 'shadow-blue-500/5 dark:shadow-blue-500/10';

  return (
    <section
      className="flex flex-col items-center text-center font-geist py-10"
      aria-label="Welcome message"
    >
      <div className="flex max-w-2xl flex-col gap-y-6 w-full px-4 items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className={`rounded-xl border ${borderColor} ${bgColor} p-3 transition-all duration-300 shadow-lg ${glowColor}`}>
              <ActiveIcon className={`size-6 ${color}`} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-primary">
                {info.name}
              </h1>
              <p className={`text-xs ${color} font-medium tracking-wide`}>
                {info.description}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-sm leading-relaxed text-muted max-w-lg mx-auto"
        >
          {info.subtext}
        </motion.p>
      </div>
    </section>
  )
}

export default ChatBlankState;
