import { getServiceByName } from "@/server/services/registry";
import { getServiceEligibilityRule } from "@/server/eligibility/rules";
import { evaluateApplicationWindow } from "@/server/application-window/engine";
import { ServiceClient } from "./ServiceClient";
import { notFound } from "next/navigation";

interface ServiceDetailPageProps {
  params: Promise<{ service: string }>;
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { service: serviceQuery } = await params;
  const service = await getServiceByName(serviceQuery);

  if (!service) {
    notFound();
  }

  const eligibilityRule = getServiceEligibilityRule(service.slug || service.serviceId);
  const applicationWindow = evaluateApplicationWindow(service.slug || service.serviceId);

  return (
    <ServiceClient
      service={service}
      eligibilityRule={eligibilityRule}
      applicationWindow={applicationWindow}
    />
  );
}
