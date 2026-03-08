import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Agentation } from "agentation"
import { routeTree } from "./routeTree.gen"
import "./index.css"

const router = createRouter({ routeTree })
const queryClient = new QueryClient()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {import.meta.env.DEV ? <Agentation /> : null}
    </QueryClientProvider>
  </StrictMode>
)
