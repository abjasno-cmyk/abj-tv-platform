import { ArchivClient, type ArchivViewData } from "@/app/archiv/ArchivClient";

export const dynamic = "force-dynamic";

export default async function DayOverviewPage() {
  const initialData: ArchivViewData = {
    topForDisplay: [],
    channels: [],
  };
  return <ArchivClient initialData={initialData} />;
}
