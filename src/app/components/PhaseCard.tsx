import * as React from "react"
import { motion } from "motion/react"
import { ChevronDown, ChevronUp, Calendar, User, CheckCircle2, Circle } from "lucide-react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { ProgressBar } from "./ui/ProgressBar"
import { cn } from "../utils"

interface Task {
  id: string;
  title: string;
  status: string;
  owner: string;
  estimate: string;
}

interface PhaseProps {
  phase: {
    id: string;
    version: string;
    title: string;
    status: string;
    progress: number;
    dueDate: string;
    owner: string;
    milestones: string[];
    tasks: Task[];
  };
  defaultExpanded?: boolean;
}

export function PhaseCard({ phase, defaultExpanded = false }: PhaseProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="default">Completed</Badge>;
      case 'in-progress': return <Badge variant="secondary" className="bg-[#F97316]/10 text-[#F97316]">In Progress</Badge>;
      default: return <Badge variant="secondary" className="bg-[#FFF7EE] text-[#2E1065]">Planned</Badge>;
    }
  }

  return (
    <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <div 
        className={cn(
          "flex cursor-pointer flex-col justify-between p-6 transition-colors md:flex-row md:items-center",
          isExpanded ? "bg-white" : "hover:bg-[#FFF7EE]/30"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7EE] text-[#2E1065] shadow-inner font-bold">
            {phase.version}
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#2E1065]">{phase.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {phase.dueDate}</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {phase.owner}</span>
              <span className="hidden md:inline">•</span>
              {getStatusBadge(phase.status)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-6 md:mt-0 md:justify-end">
          <div className="flex w-32 flex-col gap-1.5 hidden md:flex">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Progress</span>
              <span>{phase.progress}%</span>
            </div>
            <ProgressBar value={phase.progress} />
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        className="overflow-hidden"
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <CardContent className="border-t border-gray-100 bg-gray-50/50 p-6 pt-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Milestones</h4>
              <ul className="space-y-3">
                {phase.milestones.map((milestone, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-[#2E1065]">
                    <div className="mt-0.5 h-4 w-4 rounded-full bg-[#FFF7EE] border border-[#F97316] flex items-center justify-center shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#F97316]" />
                    </div>
                    {milestone}
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">Detailed Tasks</h4>
              <div className="space-y-2">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:border-[#8B5CF6]/30 hover:shadow-md">
                    <div className="flex items-center gap-3">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-[#8B5CF6]" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        task.status === 'completed' ? "text-gray-400 line-through" : "text-[#2E1065]"
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                       <span className="hidden px-2 py-1 rounded-md bg-gray-50 font-medium text-gray-600 sm:inline-block">{task.owner}</span>
                       <span className="w-8 text-right font-mono text-gray-400">{task.estimate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </motion.div>
    </Card>
  )
}