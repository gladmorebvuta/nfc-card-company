import { motion } from "motion/react"
import { HelpCircle, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { cn } from "../utils"

interface Question {
  id: string;
  question: string;
  impact: string;
  status: string;
  context: string;
}

export function QuestionsSection({ questions }: { questions: Question[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unresolved': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'investigating': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-400" />;
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <Card className="h-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-6 border-b border-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 shadow-sm border border-red-100">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Blocking Questions</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Issues requiring immediate attention</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <motion.div 
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md",
                q.status === 'unresolved' ? "border-red-100" : "border-gray-100"
              )}
            >
              {q.status === 'unresolved' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
              )}
              {q.status === 'investigating' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
              )}
              {q.status === 'resolved' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
              )}
              
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 bg-gray-50 rounded-full p-1.5 border border-gray-100 shadow-inner">
                    {getStatusIcon(q.status)}
                  </div>
                  <h4 className="text-sm font-semibold leading-tight text-[#2E1065] md:text-base">
                    {q.question}
                  </h4>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                  getImpactColor(q.impact)
                )}>
                  {q.impact}
                </span>
              </div>
              <p className="ml-12 text-sm text-gray-500 leading-relaxed">
                {q.context}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}