import { Router } from "express";
import { supabase } from "../lib/supabase.js";

export const trustedContactsRouter = Router();

const COLUMNS = "id, member_id, name, relationship, phone, email, auto_alert, created_at";

trustedContactsRouter.get("/members/:id/trusted-contacts", async (req, res) => {
  const { data, error } = await supabase
    .from("trusted_contacts")
    .select(COLUMNS)
    .eq("member_id", req.params.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

/** Voluntary, member-directed enrollment. */
trustedContactsRouter.post("/members/:id/trusted-contacts", async (req, res) => {
  const { name, relationship, phone, email, autoAlert } = req.body as {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
    autoAlert?: boolean;
  };
  if (!name?.trim() || !relationship?.trim() || !(phone?.trim() || email?.trim())) {
    res.status(400).json({ error: "name, relationship and a phone or email are required" });
    return;
  }
  const { data, error } = await supabase
    .from("trusted_contacts")
    .insert({
      member_id: req.params.id,
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      auto_alert: autoAlert ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

/** Revocable at any time. Kept for the audit trail, hidden from use. */
trustedContactsRouter.delete("/trusted-contacts/:contactId", async (req, res) => {
  const { error } = await supabase
    .from("trusted_contacts")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", req.params.contactId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).end();
});
