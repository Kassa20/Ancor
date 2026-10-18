import express from "express";
import cors from "cors";
import { supabase } from "./lib/supabase.js";
import { riskRouter } from "./routes/risk.js";
import { alertsRouter } from "./routes/alerts.js";
import { trustedContactsRouter } from "./routes/trustedContacts.js";
import { atoRouter } from "./routes/ato.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/risk", riskRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api", trustedContactsRouter);
app.use("/api", atoRouter);

app.get("/api/members", async (_req, res) => {
  const { data, error } = await supabase.from("members").select("*");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

app.get("/api/members/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("synthetic_member_id", req.params.id)
    .single();
  if (error) {
    res.status(404).json({ error: error.message });
    return;
  }
  res.json(data);
});

app.get("/api/members/:id/events", async (req, res) => {
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("synthetic_member_id", req.params.id)
    .single();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("member_id", member.id)
    .order("event_sequence", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

app.get("/api/events", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .range(offset, offset + limit - 1)
    .order("event_timestamp", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
