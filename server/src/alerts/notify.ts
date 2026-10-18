import { supabase } from "../lib/supabase.js";

export interface TrustedContactRow {
  id: string;
  member_id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  auto_alert: boolean;
}

export interface AlertDelivery {
  contactId: string;
  contactName: string;
  channel: "sms" | "email" | "none";
  status: "sent" | "simulated" | "suppressed" | "failed";
  detail?: string;
}

/**
 * Minimal message: no amount, recipient or account details.
 * The contact is informed, never given control.
 */
function buildMessage(memberFirstName: string): string {
  return (
    `Sound Credit Union: ${memberFirstName} asked us to let you know they are making an unusual payment today. ` +
    `Please call them on a number you already have. Sound will never ask you for codes or passwords.`
  );
}

async function sendSms(to: string, body: string): Promise<"sent" | "simulated"> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[simulated SMS to ${to}] ${body}`);
    return "simulated";
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
  return "sent";
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Alerts every active trusted contact for the member.
 * A contact whose name matches the payment recipient is suppressed and left for
 * employee review, since the contact could be part of the problem.
 */
export async function alertTrustedContacts(opts: {
  memberId: string;
  memberFirstName: string;
  assessmentId: string | null;
  recipientName: string;
  trigger: "auto" | "manual";
  onlyAutoAlert: boolean;
}): Promise<AlertDelivery[]> {
  let query = supabase
    .from("trusted_contacts")
    .select("id, member_id, name, relationship, phone, email, auto_alert")
    .eq("member_id", opts.memberId)
    .is("revoked_at", null);
  if (opts.onlyAutoAlert) query = query.eq("auto_alert", true);

  const { data: contacts, error } = await query;
  if (error) throw new Error(error.message);

  const message = buildMessage(opts.memberFirstName);
  const deliveries: AlertDelivery[] = [];

  for (const c of (contacts ?? []) as TrustedContactRow[]) {
    let delivery: AlertDelivery;
    if (opts.recipientName && normalize(c.name) === normalize(opts.recipientName)) {
      delivery = { contactId: c.id, contactName: c.name, channel: "none", status: "suppressed", detail: "Contact is the payment recipient; routed to employee review" };
    } else if (c.phone) {
      try {
        delivery = { contactId: c.id, contactName: c.name, channel: "sms", status: await sendSms(c.phone, message) };
      } catch (err) {
        delivery = { contactId: c.id, contactName: c.name, channel: "sms", status: "failed", detail: String(err) };
      }
    } else {
      // Email delivery is not wired up for the demo; recorded as simulated.
      delivery = { contactId: c.id, contactName: c.name, channel: "email", status: "simulated" };
    }
    deliveries.push(delivery);
  }

  if (deliveries.length) {
    const { error: insertError } = await supabase.from("contact_alerts").insert(
      deliveries.map((d) => ({
        member_id: opts.memberId,
        assessment_id: opts.assessmentId,
        contact_id: d.contactId,
        trigger: opts.trigger,
        channel: d.channel,
        status: d.status,
        message: d.status === "suppressed" ? null : message,
      })),
    );
    if (insertError) console.error("Failed to log contact alerts:", insertError.message);
  }

  return deliveries;
}
