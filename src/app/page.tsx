import type { Metadata } from "next";
import OnboardingWizard from "@/components/OnboardingWizard";

// Private client link — keep it out of search engines.
export const metadata: Metadata = {
  title: "4Pie Labs — Client Onboarding",
  robots: { index: false, follow: false },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <OnboardingWizard />
    </main>
  );
}
