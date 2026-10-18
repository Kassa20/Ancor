# Anchor diagrams

## 1. User UI flow

```mermaid
flowchart TD
    Start([Member opens online banking]) --> Switch{Demo member}
    Switch -->|M1001| Linda[Linda: family emergency scam]
    Switch -->|M1057| Alex[Alex: legitimate home-closing wire]
    Linda --> Dash
    Alex --> Dash
    Dash[Dashboard] --> TC[Trusted Contact page]
    Dash --> Tx[Transactions]
    Dash --> Send[Send Money page]

    TC --> TCForm["Add contact: name, relationship, phone or email<br/>Toggle: alert automatically on high-risk payments"]
    TCForm -->|POST trusted-contacts| TCSaved[(Saved in Supabase)]
    TCSaved --> Dash

    Send --> Fill["Enter payment or Fill demo payment"]
    Fill -->|POST /api/risk/precheck| Tier{Precheck tier}
    Tier -->|LOW| Sent([Payment sent, no extra steps])
    Tier -->|MEDIUM| Short["Short check: why we're pausing, purpose,<br/>pressure and secrecy, independent call"]
    Tier -->|HIGH| Full["Full Pause and Reflect: 7 steps"]

    subgraph Q[Questionnaire]
        S1[1. Why we're pausing] --> S2["2. Purpose + own words"]
        S2 --> S3[3. About the recipient]
        S3 --> S4[4. Pressure and secrecy]
        S4 --> S5["5. Independent check<br/>Call now, payment saved"]
        S5 --> S6[6. Impact if lost]
        S6 --> S7[7. Trusted contact]
    end
    Full --> S1
    Short --> S4
    S7 -->|POST /api/risk/score| Result
    S5 -.->|short mode ends here| Result

    Result["Risk Result page<br/>0-100 score, tier, typology, reasons"] --> Auto{Score HIGH and contact opted in?}
    Auto -->|Yes| AlertSent[Alert sent to trusted contact before Send]
    Auto -->|No| AlertBtn[Alert my trusted contacts button]
    AlertBtn -->|POST /api/alerts/trusted-contacts| AlertSent
    AlertSent --> Decide
    Result --> Decide{Member decides}

    Decide -->|Talk to Sound now| Talk([Specialist calls; payment on hold])
    Decide -->|Wait 24 hours| Wait([Payment saved and on hold])
    Decide -->|Cancel and report| Cancel([Payment cancelled; report opened])
    Decide -->|Send anyway| SendAnyway{Tier HIGH?}
    SendAnyway -->|Yes| Talk
    SendAnyway -->|No| Sent
```

## 2. System architecture

```mermaid
flowchart LR
    subgraph Client["Client: React 19 + Vite + Tailwind"]
        direction TB
        App[App.tsx: flow orchestration + member switcher]
        SendMoney[SendMoney.tsx]
        Quest[FraudQuestionnaire.tsx]
        Risk[RiskResult.tsx]
        TCPage[TrustedContact.tsx]
        Console["TakeoverConsole.tsx (employee)<br/>AccountProtected.tsx (member)"]
        AtoLib["lib/ato.ts<br/>takeover signals from history"]
        Dash[Dashboard + TransactionList]
        Pay["lib/payment.ts<br/>builds risk signals from history"]
        Api[lib/api.ts]
        Data[("events.json + members.json<br/>synthetic core-banking feed")]
        App --> SendMoney & Quest & Risk & TCPage & Dash & Console
        Console --> AtoLib
        AtoLib --> Data
        Console --> Api
        SendMoney --> Pay
        Pay --> Data
        Dash --> Data
        App --> Api
        Risk --> Api
    end

    Api -->|"/api via Vite proxy"| Express

    subgraph Server["Server: Express + TypeScript"]
        direction TB
        Express[index.ts]
        RRisk["routes/risk.ts<br/>precheck, score, decision"]
        RAlert["routes/alerts.ts<br/>manual alert"]
        RTC["routes/trustedContacts.ts<br/>list, enroll, revoke"]
        RMem["member and event endpoints"]
        RATO["routes/ato.ts<br/>confirm, reverify, status"]
        Lockdown["ato/lockdown.ts<br/>delink, contain, reverify, migrate, demolish"]
        subgraph Engine[Risk engine]
            Pattern["pattern.ts<br/>history score P"]
            Answers["answers.ts<br/>red flags + contradictions A"]
            AI["ai.ts<br/>narrative check N"]
            Score["score.ts<br/>100 x sigmoid of weighted P, A, N"]
            Pattern --> Score
            Answers --> Score
            AI --> Score
        end
        Notify["alerts/notify.ts<br/>minimal message, recipient-match suppression"]
        Express --> RRisk & RAlert & RTC & RMem & RATO
        RATO --> Lockdown
        RRisk --> Pattern
        RRisk --> Score
        RRisk -->|HIGH: auto alert| Notify
        RAlert --> Notify
    end

    subgraph Supabase["Supabase Postgres, RLS on"]
        direction TB
        TTC[(trusted_contacts)]
        TRA[(risk_assessments)]
        TCA[(contact_alerts)]
        TMem[(members + events)]
        TAL[(account_lockdowns)]
        TLS[(lockdown_steps)]
    end

    subgraph External[External services]
        LLM["Azure OpenAI or OpenAI<br/>falls back to rules-only"]
        Twilio["Twilio SMS<br/>falls back to simulated"]
    end

    RRisk --> TRA
    RTC --> TTC
    Notify --> TTC
    Notify --> TCA
    RMem --> TMem
    AI --> LLM
    Notify --> Twilio
    Lockdown --> TAL
    Lockdown --> TLS
```

## 3. Request sequence: risk score and trusted-contact alert

```mermaid
sequenceDiagram
    autonumber
    actor M as Member
    participant UI as Client
    participant API as Express API
    participant Eng as Risk engine
    participant LLM as Azure OpenAI
    participant DB as Supabase
    participant SMS as Twilio
    actor TC as Trusted contact

    M->>UI: Fill payment, click Continue
    UI->>UI: buildPaymentSignals from member history
    UI->>API: POST /api/risk/precheck
    API->>Eng: scorePattern
    Eng-->>API: tier HIGH, reasons
    API-->>UI: HIGH, show full questionnaire
    M->>UI: Answer questions
    UI->>API: POST /api/risk/score
    API->>Eng: scorePattern + scoreAnswers
    Eng->>LLM: Classify answers and free text
    LLM-->>Eng: typology, scam probability
    Eng-->>API: score 92, HIGH, reason codes
    API->>DB: insert risk_assessments
    API->>DB: select trusted_contacts with auto_alert
    API->>SMS: Send minimal alert
    SMS-->>TC: Please call Linda on a number you have
    API->>DB: insert contact_alerts
    API-->>UI: score, reasons, alerts sent
    M->>UI: Choose Talk, Wait, Cancel or Send anyway
    UI->>API: PATCH /api/risk/assessments/:id/decision
    API->>DB: update decision
```

## 4. Supabase data model

```mermaid
erDiagram
    trusted_contacts ||--o{ contact_alerts : "receives"
    risk_assessments ||--o{ contact_alerts : "triggers"
    account_lockdowns ||--|{ lockdown_steps : "runs"
    trusted_contacts {
        uuid id PK
        text member_id
        text name
        text relationship
        text phone
        text email
        boolean auto_alert
        timestamptz revoked_at
    }
    risk_assessments {
        uuid id PK
        text member_id
        jsonb payment
        jsonb answers
        numeric pattern_score
        numeric answer_score
        numeric ai_score
        smallint score
        text tier
        text typology
        jsonb reasons
        boolean ai_used
        text decision
    }
    contact_alerts {
        uuid id PK
        text member_id
        uuid assessment_id FK
        uuid contact_id FK
        text trigger
        text channel
        text status
        text message
    }
    account_lockdowns {
        uuid id PK
        text member_id
        text status
        text confirmed_by
        jsonb signals
        jsonb pending_payments
        jsonb completed_unauthorized
        numeric balance
        text old_account_ref
        text new_account_ref
        text reverify_method
    }
    lockdown_steps {
        uuid id PK
        uuid lockdown_id FK
        text step_key
        smallint step_order
        text status
        text detail
        timestamptz completed_at
    }
```

## 5. Account takeover: post-confirmation lockdown flow

```mermaid
flowchart TD
    subgraph Detect["Signals in Sarah's account, Oct 15 (kit data)"]
        direction LR
        D1[Failed sign-in] --> D2["One-time code entered<br/>on fake site"] --> D3[Password reset] --> D4[Email and phone changed] --> D5[New recipient added] --> D6["2 P2P payments started<br/>$3,006.33 pending"]
    end
    D6 --> Console["Fraud Console: specialist reviews the signal cluster"]
    Console -->|Confirm account takeover| Confirm[POST /api/ato/lockdowns]

    Confirm --> S1["1. Delink<br/>freeze sends, recipients, new accounts,<br/>limits, contact changes"]
    S1 --> S2["2. Contain<br/>stop pending payments, sign out sessions,<br/>revert email and phone to pre-change"]
    S2 --> Member["Sarah sees: We stopped unauthorized activity<br/>Sending paused; deposits keep working"]
    S2 --> Wait{Re-verify identity}

    Wait -->|Callback to pre-change phone| S3[3. Re-verify]
    Wait -->|Branch visit with photo ID| S3
    S3 -->|POST /api/ato/lockdowns/:id/reverify| S4["4. Migrate<br/>new account number, balance moved,<br/>payroll and autopays redirected, new card"]
    S4 --> S5["5. Demolish and recover<br/>close old account, tripwire on old number,<br/>recall anything already sent, case check-ins"]
    S5 --> Safe(["Sarah sees: Your money is safe in your new account"])
```

## 6. Account takeover: request sequence

```mermaid
sequenceDiagram
    autonumber
    actor F as Fraud specialist
    participant UI as Fraud Console
    participant API as Express API
    participant L as Lockdown orchestrator
    participant DB as Supabase
    actor S as Sarah

    UI->>UI: buildTakeoverContext from member history
    F->>UI: Review signals, click Confirm account takeover
    UI->>API: POST /api/ato/lockdowns
    API->>L: startLockdown
    L->>DB: insert account_lockdowns + 5 lockdown_steps
    L->>DB: step 1 delink done
    L->>DB: step 2 contain done, 2 payments stopped
    API-->>UI: lockdown, awaiting re-verification
    S->>UI: Opens app: account protected, sending paused
    F->>S: Calls phone number on file before the change
    F->>UI: Click Callback to pre-change phone
    UI->>API: POST /api/ato/lockdowns/:id/reverify
    API->>L: reverifyAndMigrate
    L->>DB: step 3 reverify done
    L->>DB: step 4 migrate done, new account ref
    L->>DB: step 5 demolish done, recalls if any
    API-->>UI: lockdown completed
    S->>UI: Sees money safe in new account
```
