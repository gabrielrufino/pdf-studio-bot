1. Add `ProTrial = 'pro_trial'` to `PlanTypeEnum` in `src/enums/plan-type.enum.ts`.
2. Update `src/middlewares/usage-limit.middleware.ts`:
    * Add `[PlanTypeEnum.ProTrial]: 50` limit (or whatever is appropriate, matching Pro).
    * Ensure if `user.plan_type === PlanTypeEnum.ProTrial` and it has been more than 3 days since `plan_started_at`, the user is reverted to `PlanTypeEnum.Free`.
    * Use Pro limit reached translation for `ProTrial`.
3. Create trial initiation logic in `src/handlers/pro.handler.ts`:
    * Under `/pro` command, add an option for a 3-day trial if they haven't used it before. Alternatively, update `onCommand` to present an inline keyboard with options: "Subscribe" and "Start 3-Day Free Trial". Wait, let me check what the exact requirement is. The prompt says "Implemente um trial de 3 dias do Pro".
    * It might be better to just show a button or allow trial. Let's add a `Start Trial` inline button in `/pro`.
    * How to track if they used the trial? We could add a field to `UserEntity` like `has_used_trial: boolean = false`, or just assume if they are `Free` they can start a trial. Let's add `has_used_trial` field.
4. Update `src/entities/user.entity.ts`:
    * Add `has_used_trial: boolean = false`.
5. Update `src/repositories/user.repository.ts` schema to include `has_used_trial: { bsonType: 'bool' }`.
6. Update `/pro` command logic:
    * If `user.plan_type === PlanTypeEnum.ProTrial`, show a message that they are currently on trial.
    * If `!user.has_used_trial`, show a button for 3-day trial.
7. Update `src/locales/en.json`, `es.json`, `pt.json` to include translation for "pro_trial_start", "pro_trial_active", "pro_trial_started".
8. Write/update tests for `pro.handler.spec.ts` and `usage-limit.middleware.spec.ts`.
9. Complete pre-commit step.
10. Submit.
