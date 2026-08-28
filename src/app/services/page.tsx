import React from "react";
import { Metadata } from "next";
import { getAllServices } from "@/server/services/registry";
import { getDemoUser } from "@/server/vault";
import { getUserActivePreparations } from "@/server/services/active";
import { ServicesClient } from "./ServicesClient";

export const metadata: Metadata = {
  title: "Universal Service Registry | DigiReady",
  description:
    "Explore examinations, scholarships, and citizen services. Check your document readiness, detect conflicts, and know when you are ready to apply.",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const demoUser = await getDemoUser();
  const services = await getAllServices();
  const activePreparations = await getUserActivePreparations(demoUser.id);
  const activeServiceSlugs = activePreparations.map((p) => p.slug);

  return (
    <div className="flex flex-col min-h-screen">
      <ServicesClient
        initialServices={services}
        initialActiveSlugs={activeServiceSlugs}
        userId={demoUser.id}
      />
    </div>
  );
}
