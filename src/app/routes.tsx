import * as React from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { PublicProfile } from "./pages/PublicProfile";
import { EditProfile } from "./pages/EditProfile";
import { Connections } from "./pages/Connections";
import { Events } from "./pages/Events";
import { AuthPage } from "./pages/AuthPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Onboarding } from "./pages/Onboarding";

function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: () => <Navigate to="/login" replace />,
  },
  {
    path: "/c/:uniqueId",
    Component: () => (
      <AppWrapper>
        <PublicProfile />
      </AppWrapper>
    ),
  },
  {
    path: "/login",
    Component: () => (
      <AppWrapper>
        <AuthPage />
      </AppWrapper>
    ),
  },
  {
    path: "/onboarding",
    Component: () => (
      <AppWrapper>
        <ProtectedRoute allowUnboarded>
          <Onboarding />
        </ProtectedRoute>
      </AppWrapper>
    ),
  },
  {
    path: "/dashboard",
    Component: () => (
      <AppWrapper>
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      </AppWrapper>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "edit", Component: EditProfile },
      { path: "connections", Component: Connections },
      { path: "events", Component: Events },
    ],
  },
]);
