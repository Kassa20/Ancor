import {
  ShieldCheck,
  UserPlus,
  X,
  Info,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

export interface TrustedContactInfo {
  id?: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  autoAlert: boolean;
}

interface TrustedContactProps {
  contact: TrustedContactInfo | null;
  onSave: (contact: TrustedContactInfo) => void;
  onRemove: () => void;
}

function TrustedContactForm({
  onSave,
  onCancel,
  initial,
}: {
  onSave: (contact: TrustedContactInfo) => void;
  onCancel: () => void;
  initial?: TrustedContactInfo | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [relationship, setRelationship] = useState(
    initial?.relationship ?? ""
  );
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [autoAlert, setAutoAlert] = useState(initial?.autoAlert ?? true);

  const canSubmit = name.trim() && relationship.trim() && (phone.trim() || email.trim());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="size-5" />
          </div>
          <h2 className="text-lg font-semibold">
            {initial ? "Edit Trusted Contact" : "Add a Trusted Contact"}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">What is a trusted contact?</p>
            <p className="mt-1">
              A trusted contact is someone Sound Credit Union may reach out to if
              we notice unusual activity on your account. They{" "}
              <strong>cannot</strong> access your account, make transactions, or
              see your balance. They are only contacted to help verify your
              well-being.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarah Johnson"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Relationship
          </label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Select relationship</option>
            <option value="Spouse / Partner">Spouse / Partner</option>
            <option value="Adult Child">Adult Child</option>
            <option value="Sibling">Sibling</option>
            <option value="Parent">Parent</option>
            <option value="Close Friend">Close Friend</option>
            <option value="Other Family Member">Other Family Member</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(206) 555-0123"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={autoAlert}
          onChange={(e) => setAutoAlert(e.target.checked)}
        />
        <span>
          <span className="font-medium">Alert them automatically</span> if a
          payment I'm about to send looks high-risk. They're only told that I'm
          making an unusual payment.
        </span>
      </label>

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Your choice, your control.</strong> You can change or remove
          your trusted contact at any time. Sound will never give your trusted
          contact access to your account or share your financial information with
          them.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (canSubmit) onSave({ name, relationship, phone, email, autoAlert });
          }}
          disabled={!canSubmit}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {initial ? "Save Changes" : "Add Trusted Contact"}
        </button>
      </div>
    </div>
  );
}

export function TrustedContactCard({
  contact,
  onSetup,
}: {
  contact: TrustedContactInfo | null;
  onSetup: () => void;
}) {
  if (contact) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Trusted Contact</p>
              <p className="text-xs text-muted-foreground">
                {contact.name} · {contact.relationship}
              </p>
            </div>
          </div>
          <button
            onClick={onSetup}
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onSetup}
      className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-5 text-left transition-colors hover:bg-primary/[0.06]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Add a Trusted Contact</p>
            <p className="text-xs text-muted-foreground">
              Someone we can reach out to if we notice unusual activity
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function TrustedContactPage({
  contact,
  onSave,
  onRemove,
  onBack,
}: TrustedContactProps & { onBack: () => void }) {
  const [editing, setEditing] = useState(!contact);

  if (editing) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6">
          <TrustedContactForm
            initial={contact}
            onSave={(c) => {
              onSave(c);
              setEditing(false);
            }}
            onCancel={() => {
              if (contact) {
                setEditing(false);
              } else {
                onBack();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <ShieldCheck className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Trusted Contact</h2>
          <p className="text-sm text-muted-foreground">
            Manage who Sound can reach out to on your behalf
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Name
          </p>
          <p className="mt-1 text-sm font-medium">{contact!.name}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Relationship
          </p>
          <p className="mt-1 text-sm font-medium">{contact!.relationship}</p>
        </div>
        {contact!.phone && (
          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Phone
            </p>
            <p className="mt-1 text-sm font-medium">{contact!.phone}</p>
          </div>
        )}
        <div className="px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Automatic alerts
          </p>
          <p className="mt-1 text-sm font-medium">
            {contact!.autoAlert ? "On for high-risk payments" : "Off"}
          </p>
        </div>
        {contact!.email && (
          <div className="px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </p>
            <p className="mt-1 text-sm font-medium">{contact!.email}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setEditing(true)}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Edit Contact
        </button>
        <button
          onClick={onRemove}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-800">
            Your trusted contact will <strong>never</strong> have access to your
            account, see your balance, or be able to make transactions. Sound may
            only contact them to help confirm your well-being if unusual activity
            is detected.
          </p>
        </div>
      </div>
    </div>
  );
}
