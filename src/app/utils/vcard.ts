export function generateVCard(contact: {
  name: string;
  title: string;
  email: string;
  phone: string;
  department: string;
  office: string;
  bio: string;
  links: { title: string; url: string }[];
}) {
  const [first, ...rest] = contact.name.split(" ");
  const last = rest.join(" ");
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.name}`,
    `N:${last};${first};;;`,
    `TITLE:${contact.title}`,
    `ORG:Middlesex Consulting Group;${contact.department}`,
    `EMAIL;TYPE=WORK:${contact.email}`,
    `TEL;TYPE=WORK:${contact.phone}`,
    `ADR;TYPE=WORK:;;${contact.office};;;;`,
    `NOTE:${contact.bio}`,
    ...contact.links.map((l) => `URL:${l.url}`),
    "END:VCARD",
  ].join("\r\n");

  const blob = new Blob([vcard], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${contact.name.replace(/\s+/g, "_")}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateLeadVCard(lead: {
  name: string;
  title: string;
  company: string;
}) {
  const [first, ...rest] = lead.name.split(" ");
  const last = rest.join(" ");
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${lead.name}`,
    `N:${last};${first};;;`,
    `TITLE:${lead.title}`,
    `ORG:${lead.company}`,
    "END:VCARD",
  ].join("\r\n");

  const blob = new Blob([vcard], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${lead.name.replace(/\s+/g, "_")}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLeadsCSV(
  leads: {
    name: string;
    email?: string;
    company: string;
    phone?: string;
    note?: string;
    score?: number;
    source?: string;
    status?: string;
    location?: string;
    date: string;
  }[]
) {
  const header = "Name,Email,Company,Phone,Note,Score,Source,Status,Location,Date Added";
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map(
    (l) =>
      [l.name, l.email, l.company, l.phone, l.note, l.score, l.source, l.status, l.location, l.date]
        .map(esc)
        .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "connections_export.csv";
  a.click();
  URL.revokeObjectURL(url);
}
