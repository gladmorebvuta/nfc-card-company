import { Server, ShieldAlert } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card"
import { cn } from "../utils"

interface Endpoint {
  method: string;
  path: string;
  desc: string;
  auth: string;
}

export function ApiSection({ endpoints }: { endpoints: Endpoint[] }) {
  const getMethodColor = (method: string) => {
    switch(method) {
      case 'GET': return 'bg-green-100 text-green-800 border-green-200';
      case 'POST': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PUT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <Card className="h-full border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-gray-50 bg-[#FFF7EE]/30 rounded-t-3xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6] text-white shadow-md">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">API Endpoints</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Core services for V1 & V2 integration</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-3xl">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-4 border-b border-gray-100">Method</th>
                <th scope="col" className="px-6 py-4 border-b border-gray-100">Path</th>
                <th scope="col" className="px-6 py-4 border-b border-gray-100">Description</th>
                <th scope="col" className="px-6 py-4 border-b border-gray-100">Auth Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {endpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-[#FFF7EE]/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", getMethodColor(ep.method))}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[#2E1065] font-medium tracking-tight whitespace-nowrap">
                    {ep.path}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={ep.desc}>
                    {ep.desc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {ep.auth === 'None' ? (
                        <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded-md">Public</span>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4 text-[#F97316]" />
                          <span className="text-[#F97316] font-medium text-xs bg-[#F97316]/10 px-2 py-1 rounded-md">{ep.auth}</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}