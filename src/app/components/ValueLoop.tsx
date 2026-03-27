import * as React from "react"
import { motion } from "motion/react"
import { SmartphoneNfc, Users, Sparkles, ArrowRight, Share2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card"

export function ValueLoop() {
  const steps = [
    { id: 1, title: "Tap & Connect", desc: "NFC device triggers profile load", icon: SmartphoneNfc, color: "bg-[#8B5CF6]" },
    { id: 2, title: "View Profile", desc: "Rich media & links displayed", icon: Users, color: "bg-[#F97316]" },
    { id: 3, title: "Save & Engage", desc: "VCard exchange & analytics", icon: Sparkles, color: "bg-[#2E1065]" },
  ]

  return (
    <Card className="h-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7EE] text-[#F97316] shadow-sm border border-[#F97316]/20">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Core Value Loop</CardTitle>
            <p className="text-sm text-gray-500 mt-1">User journey visualization</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-center">
        <div className="relative py-8 px-4 sm:px-8 flex flex-col items-center sm:flex-row justify-between w-full mx-auto max-w-2xl gap-8 sm:gap-4">
          
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-[#8B5CF6] via-[#F97316] to-[#2E1065] opacity-20 hidden sm:block -translate-y-1/2 rounded-full" />
          <div className="absolute left-1/2 top-0 h-full w-1 bg-gradient-to-b from-[#8B5CF6] via-[#F97316] to-[#2E1065] opacity-20 sm:hidden -translate-x-1/2 rounded-full" />

          {steps.map((step, idx) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.2 + 0.3 }}
              className="relative z-10 flex flex-col items-center text-center group bg-white p-4 rounded-2xl shadow-sm border border-gray-50 w-full sm:w-48 hover:shadow-md transition-shadow"
            >
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform group-hover:scale-110 ${step.color} ring-4 ring-white`}>
                <step.icon className="h-7 w-7" />
              </div>
              <h4 className="mb-1 text-base font-bold text-[#2E1065]">{step.title}</h4>
              <p className="text-xs font-medium text-gray-500 leading-relaxed">{step.desc}</p>
              
              {idx < steps.length - 1 && (
                <div className="absolute -bottom-8 left-1/2 sm:hidden -translate-x-1/2 text-gray-300">
                   <ArrowRight className="h-6 w-6 rotate-90" />
                </div>
              )}
              {idx < steps.length - 1 && (
                <div className="absolute -right-8 top-1/2 hidden sm:block -translate-y-1/2 text-gray-300">
                   <ArrowRight className="h-6 w-6" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}