"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";

export default function Navbar() {
  const { isSignedIn } = useUser();

  return (
    <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10 bg-[#0A0A0B]">

      <div className="text-xl font-semibold">
        TeexFlow
      </div>

      <div className="flex items-center gap-4">

        {!isSignedIn ? (
          <SignInButton>
            <button className="text-white/70 hover:text-white">
              Login
            </button>
          </SignInButton>
        ) : (
          <>
            <Link href="/dashboard" className="text-white/70 hover:text-white">
              Dashboard
            </Link>
            <UserButton />
          </>
        )}

      </div>

    </nav>
  );
}