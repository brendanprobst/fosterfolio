const token = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "";

if (!token || !projectRef) {
  console.error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.");
  process.exit(1);
}

const body = {
  external_email_enabled: true,
  smtp_admin_email: process.env.SMTP_ADMIN_EMAIL,
  smtp_host: process.env.SMTP_HOST,
      smtp_port: process.env.SMTP_PORT,
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
  smtp_sender_name: process.env.SMTP_SENDER_NAME,
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`Supabase auth SMTP update failed (${response.status}): ${text}`);
  process.exit(1);
}
