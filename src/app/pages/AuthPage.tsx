import * as React from "react";
import { Navigate } from "react-router";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import mcgLogoColour from "../../assets/MCG Logo Colour.svg";
import { Seo } from "../components/seo/Seo";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function AuthPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = React.useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-[#FFF7EE] to-[#EDE9FE]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E1065]" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-tr from-[#FFF7EE] via-[#FFEDD5] to-[#EDE9FE]">
      <Seo title="Sign In" description="Sign in to manage your NFC digital business card." noindex />

      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#F97316]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#8B5CF6]/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-[#2E1065]/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Card */}
        <div className="rounded-[2rem] bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_24px_64px_rgba(46,16,101,0.12)] overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#F97316] via-[#8B5CF6] to-[#2E1065]" />

          <div className="px-8 pt-10 pb-10 flex flex-col items-center gap-6">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            >
              <img src={mcgLogoColour} alt="Middlesex Consulting Group" className="h-14 w-auto" />
            </motion.div>

            {/* Headline */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight text-[#2E1065]">
                NFC Card Platform
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Sign in to manage your digital business card
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            {/* Google Sign-in Button */}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="group relative w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-[#2E1065]/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-[#2E1065]"
            >
              {signingIn ? (
                <>
                  <div className="h-5 w-5 rounded-full border-2 border-[#2E1065]/20 border-t-[#2E1065] animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
              {/* Hover shimmer */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-[#F97316]/5 via-transparent to-[#8B5CF6]/5" />
            </button>

            {/* Footer note */}
            <p className="text-[11px] text-center text-gray-400 font-medium leading-relaxed">
              Access is restricted to authorised MCG employees.<br />
              Use your company Google account to continue.
            </p>

          </div>
        </div>

        {/* Bottom branding */}
        <p className="text-center text-[11px] text-gray-400 mt-5 font-medium">
          Powered by <span className="text-[#2E1065] font-semibold">BrandApt</span>
        </p>
      </motion.div>
    </div>
  );
}
