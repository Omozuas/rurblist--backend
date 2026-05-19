# TODO - Scalable/Production-Ready Refactor Plan

## Phase 1: Scaffolding only (no endpoint behavior changes)

- [x] Add `src/app.js` and move Express middleware/router wiring from `server.js` into it.
- [x] Keep `server.js` as bootstrapper (dbConnect + passport + app.listen).
- [x] Add request correlation id middleware.
- [x] Add structured logger integration (keep compatibility with current error handler).
- [x] Add `GET /health` endpoint.
- [x] Introduce versioned routing under `src/routes/v1/` while keeping existing `/api/*` working.

## Phase 2: Production hardening + refactor (still non-breaking)

- [x] Add `validators/` + auth schemas and wire into v1 auth routes.
- [x] Extract auth business logic for `createUser` + `loginUser` into `src/services/auth/*` and make `AuthController` thin adapter.
- [x] Remove legacy `routes/auth.route.js` after `/api/auth/*` compatibility moved to v1 router.
- [x] Move auth controller ownership into `src/services/auth/controllers` and remove legacy `controllers/authController.js`.
- [x] Move Google callback OTP completion into auth use-cases.
- [x] Start `user` migration with `GET /user/me` in `src/services/user/*`.
- [x] Move `PATCH /user/change-password` into `src/services/user/*` and remove legacy route registration.
- [x] Move saved-property user endpoints into `src/services/user/*` and remove legacy route registrations.
- [x] Move user read endpoints (`GET /user`, `GET /user/:id`) into `src/services/user/*`.
- [x] Move user admin/delete endpoints into `src/services/user/*`.
- [x] Move `PUT /user/edit-user` profile/KYC update into `src/services/user/*`.
- [x] Move KYC verification into `src/services/kyc/*` and remove legacy user route.
- [x] Start `agent` migration with read-only endpoints in `src/services/agent/*`.
- [x] Move `DELETE /agent/me` into `src/services/agent/*`.
- [x] Move `PATCH /agent/me` into `src/services/agent/*`.
- [x] Move `POST /agent` into `src/services/agent/*`.
- [x] Move `PATCH /agent/complete-profile` into `src/services/agent/*` and remove legacy agent route/controller.
- [x] Move plans module into `src/services/plan/*` and remove legacy plan route/controller.
- [x] Start `payment` migration with receipt/reference endpoints in `src/services/payment/*`.
- [x] Move payment initialization endpoints into `src/services/payment/*`.
- [x] Move payment verify fallback into `src/services/payment/*`.
- [x] Move payment webhook into `src/services/payment/*` and remove legacy payment route/controller.
- [x] Start `tour` migration with read-only endpoints in `src/services/tour/*`.
- [x] Move tour messaging/conversation endpoints into `src/services/tour/*`.
- [x] Move tour lifecycle endpoints into `src/services/tour/*` and remove legacy tour route/controller.
- [x] Start `verification` migration with read/download endpoints in `src/services/verification/*`.
- [x] Move verification non-file mutation endpoints into `src/services/verification/*`.
- [x] Move verification upload endpoints into `src/services/verification/*` and remove legacy verification route/controller.
- [x] Start `property` migration with read-only/list endpoints in `src/services/property/*`.
- [x] Move property comments/reactions into `src/services/property/*`.
- [x] Move `DELETE /property/:id` into `src/services/property/*`.
- [x] Move `PATCH /property/:id` into `src/services/property/*`.
- [x] Move `POST /property` create endpoint into `src/services/property/*`.
- [x] Move `POST /property/:id/verify-buyer` into `src/services/property/*` and remove legacy property route/controller.
- [x] Remove dead legacy KYC route and user controller after v1 migration.
- [x] Move root routes into `src/routes/root.routes.js` and remove legacy routes/controllers shells.
- [x] Move legacy middleware into `src/middleware` and harden auth/error responses for production.
- [x] Move core config (`dbConnection`, `validateEnv`, `jwtToken`, `passport`) into `src/config` with safer env/JWT/passport handling.
- [x] Move provider config (`cloudinary`, `dojahService`) into `src/config` with upload/env/error hardening.
- [x] Merge Mongo ID validation into `src/middleware/validateParams`, apply it across v1 params, and remove old helper.
- [x] Move upload middleware into `src/middleware/upload.js` with safer filenames, strict file validation, and centralized errors.
- [x] Move `AppError` and OTP generation into `src/utils`, use `AppError` in shared middleware, and switch OTP to crypto randomness.
- [x] Move query helpers into `src/utils/query` and harden public query parsing.
- [x] Move receipt generation into `src/utils/receipt` and remove unused Google calendar helper.
- [x] Move email service into `src/services/email` with lazy transporters, configurable timeout, and safer provider error logging.
- [x] Move self-ping cron into `src/jobs` and make it opt-in/configurable.
- [x] Add newly introduced runtime env keys to `.env` and validate optional numeric/boolean tuning values at startup.
- [x] Move Mongoose models into `src/models` and add a central model export index.
- [x] Add project-wide syntax check script for `server.js` and `src/**/*.js`.
- [x] Improve controller error response consistency by routing payment/KYC failures through the central error handler.
- [x] Add repeatable smoke-test script for health/readiness/auth/user checks.
- [x] Ensure syntax check script runs across the migrated app.

## Verification

- [x] Run `npm run check`.
- [ ] Start server and run `npm run smoke`.
