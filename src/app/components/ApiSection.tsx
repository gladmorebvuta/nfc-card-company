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
      case 'GET': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'POST': return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'PUT': return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      case 'DELETE': return 'bg-red-500/15 text-red-300 border-red-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  }

  return (
    <Card className="h-full border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-border bg-background/40 rounded-t-3xl">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-white shadow-md">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">API Endpoints</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Core services for V1 & V2 integration</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-3xl">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="bg-background/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-6 py-4 border-b border-border">Method</th>
                <th scope="col" className="px-6 py-4 border-b border-border">Path</th>
                <th scope="col" className="px-6 py-4 border-b border-border">Description</th>
                <th scope="col" className="px-6 py-4 border-b border-border">Auth Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-background/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-mono">
                    <span className={cn("px-2.5 py-1 rounded-md text-xs font-bold border", getMethodColor(ep.method))}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-foreground font-medium tracking-tight whitespace-nowrap">
                    {ep.path}
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate" title={ep.desc}>
                    {ep.desc}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {ep.auth === 'None' ? (
                        <span className="text-emerald-300 font-medium text-xs bg-emerald-500/15 px-2 py-1 rounded-md">Public</span>
                      ) : (
                        <>
                          <ShieldAlert className="h-4 w-4 text-[#3B82F6]" />
                          <span className="text-[#3B82F6] font-medium text-xs bg-[#3B82F6]/10 px-2 py-1 rounded-md">{ep.auth}</span>
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