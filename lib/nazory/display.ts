export function getAuthorDisplayName(row: { first_name?: string; lastName?: string; firstName?: string; last_name?: string }): string {
  const firstName = row.first_name ?? row.firstName ?? "";
  const lastName = row.last_name ?? row.lastName ?? "";
  return [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}
