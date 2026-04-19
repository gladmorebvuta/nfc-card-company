import * as React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";

interface Props {
  children: React.ReactNode;
  /** Pass true on the /onboarding route to prevent a redirect loop */
  allowUnboarded?: boolean;
}

export function ProtectedRoute({ children, allowUnboarded = false }: Props) {
  const { user, loading } = useAuth();
  const { nfcProfile } = useProfile();

  // Wait until auth resolves AND (if logged in) the Firestore profile has loaded
  if (loading || (user && nfcProfile === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // New user — redirect to onboarding unless we're already rendering it
  if (!allowUnboarded && nfcProfile && !nfcProfile.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
