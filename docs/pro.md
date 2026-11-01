# Pro

## Overview

The `/pro` command upgrades a user to the PRO plan using Telegram's native payment flow with Telegram Stars (XTR).

## Business Rules

- If the user is already PRO, the bot shows the subscription start date.
- PRO lasts 30 days from payment confirmation.
- The price is read from the global configuration (`pro_price`).
- No usage limit is consumed by invoking `/pro`.

## User Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Bot
    participant C as ConfigurationRepository
    participant P as PaymentRepository
    participant R as UserRepository

    U->>B: /pro
    B->>R: findByTelegramId
    alt already PRO
        R-->>B: user with PRO
        B->>U: subscription_info with start date
    else not PRO
        B->>C: findGlobalConfig
        C-->>B: pro_price
        B->>U: replyWithInvoice
        U->>B: pre_checkout_query
        B->>U: answerPreCheckoutQuery(true)
        U->>B: successful_payment
        B->>R: update plan_type = PRO
        B->>P: create PaymentEntity
        B->>U: pro_success
    end
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> CheckingStatus : /pro
    CheckingStatus --> ShowingInfo : already PRO
    CheckingStatus --> InvoiceSent : not PRO
    InvoiceSent --> PaymentConfirmed : successful_payment
    PaymentConfirmed --> ActivePro : update user
    ActivePro --> [*]
    ShowingInfo --> [*]
```

## Technical Notes

- Handler: `ProHandler`.
- Listens to `pre_checkout_query` and `message:successful_payment` events.
- Payment payload is `'pdf-studio-pro-subscription'`.
- Currency is `XTR` (Telegram Stars).
- `usageLimitMiddleware` checks PRO expiration daily and downgrades expired plans.
