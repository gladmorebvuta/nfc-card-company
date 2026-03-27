import * as React from "react"
import { RouterProvider } from "react-router"
import { router } from "./routes"
import { Toaster } from "sonner"
import "../styles/fonts.css"

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            borderRadius: "1rem",
            color: "#2E1065",
            fontWeight: 600,
          },
        }}
      />
    </>
  )
}