# Contact And Certification Enhancements Design

## Goal

Add a coherent set of certification, contact-management, and contact-display capabilities for the mini program:

- OCR-assisted enterprise and worker certification
- SMS verification during certification
- A reusable contact profile with verified phone, WeChat ID, and WeChat QR code
- Consistent post contact display and unlock behavior
- Certification status entry optimization on the mine page

The design is intentionally product-complete: it covers front end, backend interfaces, data design, UI behavior, and acceptance criteria.

## Product Principles

1. Reduce repeated input for users who post frequently.
2. Treat phone, WeChat ID, and WeChat QR code as one unified "contact information" domain.
3. Keep certification OCR as an assistive input feature, not an automatic approval mechanism.
4. Persist a verified phone as the account's trusted default phone.
5. Save contact information into each post as a snapshot, rather than reading directly from the latest profile at view time.
6. Keep phase 1 lightweight for users: one default contact profile, with backend data structures ready for future expansion to multiple profiles.

## Scope

### Included

- Enterprise certification OCR
- Worker certification OCR
- SMS verification for both certification flows
- Trusted phone persistence after successful verification
- New "Contact Information" entry in the mine page
- Default contact profile management
- Post publishing contact enhancements
- WeChat contact card UI after unlock
- Mine page certification-status click-through when not certified
- Hide the redundant phone-only entry in settings after the mine page exposes `联系方式`
- Certificate-upload icon audit, including ID-card back-side icon correctness

### Excluded From Phase 1

- Multi-profile contact switching UI
- Real-person or face verification
- Certificate anti-forgery checks
- Automatic moderation of QR-code content

## Module 1: OCR-Assisted Certification

### Enterprise Certification

Add OCR support for the business license and optional legal-person ID card images.

Suggested auto-fill targets:

- Company name
- Full business-license name
- Unified social credit code
- Legal representative name
- Registered address

The OCR result should fill the form, but the user must still confirm and can edit any field before submission.

### Worker Certification

Add OCR support for ID-card recognition.

Suggested auto-fill targets:

- Real name
- ID number
- Validity period

Front-end labels and icon semantics must clearly distinguish:

- Front side: portrait side
- Back side: national emblem side

### UX Rules

- OCR failure must not block submission
- OCR recognition errors must be editable
- OCR is an input accelerator, not a trust decision

### Technical Chain

1. Mini program captures or selects an image
2. Image is uploaded
3. Backend or cloud function calls OCR provider
4. Structured OCR fields are returned
5. Front end writes fields back into the form

## Module 2: SMS Verification During Certification

### Goal

Use SMS verification to confirm phone ownership during enterprise and worker certification.

### Product Rules

- Enterprise certification requires SMS verification
- Worker certification requires SMS verification
- The verified phone becomes the account's trusted phone after certification completes successfully
- Later posting forms should default to this trusted phone
- Users may still temporarily modify the phone number when publishing a post

### State Rules

- A verification success should produce a short-lived verification proof
- Certification submission must carry that proof
- The trusted phone should not be replaced by a temporary post phone

### Risk Controls

- SMS send frequency limit
- SMS validation expiration
- Retry limit
- Space reserved for stronger anti-abuse measures such as image captcha or risk scoring

## Module 2A: Tencent Cloud Integration And Billing

### Integration Decision

Phase 1 will connect OCR and certification SMS through Tencent Cloud directly from the backend.

Implementation direction:

- OCR uses Tencent Cloud OCR APIs
- certification SMS uses Tencent Cloud SMS APIs
- the backend signs requests with Tencent Cloud `SecretId` and `SecretKey`
- the mini program continues uploading images through the existing `/upload` flow, and OCR consumes the uploaded image URL

This keeps the front-end upload path unchanged and avoids introducing a second upload or cloud-function flow just for OCR.

### Products To Open

Before production rollout, the following Tencent Cloud capabilities must be available:

- OCR service, including:
  - ID-card OCR
  - business-license OCR
- SMS service, for domestic SMS sending during certification
- API key access (`SecretId` / `SecretKey`) with permission to call OCR and SMS APIs

Recommended account setup:

- use a Tencent Cloud enterprise-authenticated account
- create a CAM sub-account or scoped key for the server instead of using a broad root key
- grant only the permissions required for OCR and SMS calls

### Billing And Lead-Time Notes

Operational notes confirmed against Tencent Cloud official documentation:

- OCR can usually be started with the platform's free quota, and later expanded with resource packs or postpaid billing if volume grows
- SMS normally requires:
  - opening the SMS product
  - creating an SMS application
  - preparing and approving an SMS signature
  - preparing and approving an SMS template
  - purchasing an available SMS package before real sending
- SMS signature/template approval may require business materials and review time, so this should be prepared before launch

Exact pricing, free-quota rules, and package availability are controlled by Tencent Cloud and may change. The release checklist should always use the current Tencent Cloud console values as the final source of truth.

### Required Environment Variables

The backend should read the following configuration values:

```env
# Tencent Cloud shared credentials for OCR + SMS.
# Leave empty until the Tencent Cloud account, permissions, and products are ready.
TENCENT_CLOUD_SECRET_ID=
TENCENT_CLOUD_SECRET_KEY=

# OCR
TENCENT_OCR_REGION=ap-beijing

# SMS
TENCENT_SMS_REGION=ap-guangzhou
TENCENT_SMS_SDK_APP_ID=
TENCENT_SMS_SIGN_NAME=
TENCENT_SMS_CERT_TEMPLATE_ID=

# Optional per-scene override templates
TENCENT_SMS_WORKER_CERT_TEMPLATE_ID=
TENCENT_SMS_ENTERPRISE_CERT_TEMPLATE_ID=
```

### Runtime Behavior When Config Is Missing

Recommended backend behavior:

- in production:
  - missing Tencent Cloud credentials or SMS template config should fail certification SMS with a clear server error
  - missing Tencent Cloud credentials should fail OCR with a clear server error
- in local development and test:
  - SMS may fall back to debug-code mode when Tencent Cloud is not yet configured
  - OCR may fall back to unconfigured or mock responses so developers can continue form-link work without blocking the entire flow

This keeps production honest while still allowing staged development before the real Tencent Cloud resources are applied for.

## Module 3: Contact Profile

### Product Positioning

Do not rely only on "remember the last input".

Introduce an explicit contact-information module in the mine page. This gives users a stable place to manage reusable business contact info and creates a clean foundation for future expansion.

### Entry Placement

Recommended placement:

- Add a new function-grid item in the mine page: `联系方式`
- Keep it in an early function-grid slot so it stays prominent and is less likely to collide with later business-grid additions during merge

Once this entry exists, settings should no longer carry a standalone phone-management cell. Settings should stay focused on generic app/account items such as avatar, cache, agreement, privacy policy, and logout.

This is preferable to hiding it under settings because it is business data, not just account settings.

### Phase 1 Product Shape

Expose one default contact profile in the UI, containing:

- Trusted phone
- Default WeChat ID
- Default WeChat QR code

Internally, data structures should be able to scale to multiple profiles later without redesigning the domain.

### Contact Profile Page

The page should allow users to:

- View the trusted phone with a clear "verified" marker
- Edit the default WeChat ID
- Upload or replace the default WeChat QR code
- Save the default contact profile

### Default Behavior In Publishing

Publishing pages should read from this default contact profile automatically and fill:

- Contact name
- Trusted phone
- WeChat ID
- WeChat QR code

Users may modify the phone and WeChat fields per post.

## Module 4: Publishing Contact Enhancements

### Supported Publishing Scenarios

- Purchase
- Stock
- Process
- Job recruitment

These publishing flows should converge on one contact-information model.

### Data Fields

Publishing forms should support:

- Contact name
- Contact phone
- Contact WeChat ID
- Contact WeChat QR code
- Visibility toggles for each of the above where applicable

Suggested visibility toggles:

- Show phone
- Show WeChat ID
- Show WeChat QR code

### Product Rules

- At least one contact method should remain available
- If "show WeChat QR code" is enabled but no QR image exists, block submit with a clear message
- The QR code should be managed as a dedicated contact field, not mixed into ordinary gallery images

### Snapshot Rule

When a post is created, its contact information must be saved as a post-level snapshot. This prevents later edits to the user's default contact profile from unintentionally mutating historical posts.

## Module 5: Contact Display After Unlock

### Existing Buttons

Keep the current action model:

- WeChat
- Phone
- Online chat

Phone and online chat should keep their existing behavior.

### WeChat Button Behavior

After the viewer unlocks contact info, tapping the `微信` button should open a small WeChat contact card.

The card should contain:

- A QR-code image in the upper area
- The WeChat ID in the lower area
- A `复制` button beside the WeChat ID
- A clear guidance text near the QR code:
  - `长按二维码识别，添加微信`

### UI Recommendation

- Title: `微信联系方式`
- QR code should be displayed at a usable size rather than as a tiny thumbnail
- Recommended display size: about `280rpx` to `360rpx` square
- The QR code should include adequate white border and not be over-compressed
- Below the QR code, show a muted helper text:
  - `长按二维码识别，添加微信`
- The WeChat ID row should show:
  - label or direct value
  - `复制` button on the right
- A secondary hint may be shown when needed:
  - `若识别失败，请确认二维码清晰完整`

### Interaction Constraint

The "长按识别" element should be treated as a guidance label or weak visual button, not as a true click action. The real action is a long press on the QR image itself.

### Technical Note

This design assumes that the QR image can expose the image long-press menu inside the mini program. In practice, recognition success depends on:

- WeChat client behavior
- image clarity
- image accessibility and compression quality

This is an implementation inference informed by the WeChat image-preview and long-press image-menu capabilities, and it should be verified on real devices.

### Unlock Rule

Phone, WeChat ID, and WeChat QR code are all classified as contact information.

Before unlock:

- Do not return full values
- Do not expose the QR image in a recognisable form

After unlock:

- Return the full contact object
- Allow copying WeChat ID
- Allow viewing the QR image and long-press scanning it

## Module 6: Mine Page Certification Status Entry

### Requirement

On both enterprise and worker mine pages, the certification-status area to the right of avatar and nickname should behave differently by status.

### Rules

- Not certified:
  - the area is clickable
  - enterprise users go to enterprise certification
  - worker users go to worker certification
- Approved:
  - display status only
  - no click-through required
- Pending and rejected:
  - recommended to allow navigation to the certification page or status detail page
  - exact routing can be finalized during implementation

This requirement is included in scope but does not need immediate implementation in the current code batch.

## Module 7: Certificate Upload Icon Audit

### Requirement

Both enterprise and worker certification pages should be checked for correct icon semantics in all certificate upload zones.

### Mandatory Check

For all ID-card back-side uploads, the icon and text must clearly represent the national-emblem side.

### Expected Labels

- ID card front: `人像面`
- ID card back: `国徽面`

This applies to both:

- Worker certification page
- Enterprise certification page where legal-person ID images are collected

## Data Design

### Users

Add or clarify a trusted-phone field at user level:

- `verifiedPhone`

Purpose:

- account-level trusted phone sourced from verified certification flow
- default phone for later publishing forms

### Contact Profiles

Even though phase 1 exposes only one default profile, backend data should support future expansion:

- `id`
- `userId`
- `contactName`
- `phone`
- `phoneVerified`
- `wechatId`
- `wechatQrImage`
- `isDefault`
- `status`
- timestamps

### Posts And Jobs

Contact snapshot fields should include:

- `contactName`
- `contactPhone`
- `contactWechat`
- `contactWechatQr`
- `showPhone`
- `showWechat`
- `showWechatQr`

### Certification Session Or Verification Session

Use a short-lived session or proof object to store:

- OCR output
- SMS verification status
- expiration

This avoids making the entire flow depend on transient client state.

## Suggested APIs

### OCR

- `POST /ocr/business-license`
- `POST /ocr/id-card/front`
- `POST /ocr/id-card/back`

### SMS Verification

- `POST /verify/sms/send`
- `POST /verify/sms/check`

### Contact Profile

- `GET /contact-profile/default`
- `PUT /contact-profile/default`

### Publishing

Existing post and job publishing APIs should be extended to accept:

- `contactWechatQr`
- `showWechatQr`

### Contact Unlock

Unlocked detail responses should return the full contact object:

- `phone`
- `wechatId`
- `wechatQrImage`

## Page Inventory

### Pages To Modify

- enterprise certification page
- worker certification page
- mine page
- purchase/stock/process publishing page
- job publishing page
- post detail page
- home card contact interaction

### Pages To Add

- contact information page

## Delivery Phases

### P1 Core Closed Loop

- OCR for enterprise certification
- OCR for worker certification
- SMS verification in certification
- trusted phone persistence
- new contact-information entry in mine page
- default contact profile page
- default contact autofill in publishing
- WeChat card after unlock with QR code and copy action

### P2 Experience Reinforcement

- unify contact behavior across all publishing flows
- not-certified click-through from mine page
- certification icon audit and fixes
- optional "save as default contact info" prompt after publishing
- improved pending/rejected certification guidance

### P3 Expansion

- multiple contact profiles
- choose a profile while publishing
- stronger risk control
- possible real-person verification extensions

## Acceptance Criteria

### OCR

- Business-license upload auto-fills company fields
- ID-card upload auto-fills worker fields
- OCR failure allows manual completion
- OCR results remain editable

### SMS Verification

- Enterprise certification can send and validate SMS codes
- Worker certification can send and validate SMS codes
- Verified phone becomes the trusted phone after certification success
- Publishing forms default to that trusted phone

### Contact Profile

- Mine page has a visible `联系方式` entry
- User can manage default WeChat ID and WeChat QR code
- Trusted phone is visibly marked as verified

### Publishing

- Publishing forms default to contact-profile values
- Users may modify phone and WeChat values per post
- QR code visibility cannot be enabled without a QR code
- Post detail uses the saved post snapshot

### WeChat Contact Card

- Tapping `微信` after unlock opens a contact card
- The card shows a QR code image
- The card shows the WeChat ID
- The WeChat ID can be copied
- The card clearly tells the user to long-press the QR code to identify it
- Real-device verification confirms the expected long-press behavior for supported clients and clear QR images

### Mine Page Certification Status

- Not-certified status is clickable
- Enterprise users go to enterprise certification
- Worker users go to worker certification
- Approved status does not require click-through

### Certificate Icons

- ID-card back side uses the correct "national emblem" semantic
- Labels for front and back are unambiguous on both certification pages

## Risks

- QR-code recognition depends on WeChat client capabilities and image clarity
- Trusted phone and temporary post phone must be differentiated in product and data layers
- Sensitive materials such as ID numbers, business licenses, and QR images require stronger storage and access control
- Historical post snapshots must remain stable even if users later edit contact info

## References

- Tencent Cloud ID Card OCR: https://cloud.tencent.com/document/product/866/33524
- Tencent Cloud Business License OCR: https://cloud.tencent.com/document/product/866/36215
- Tencent Cloud OCR billing and quotas: https://cloud.tencent.com/document/product/866/17622
- Tencent Cloud Card OCR product overview: https://cloud.tencent.com/product/cardocr
- Tencent Cloud SMS quick start: https://cloud.tencent.com/document/product/382/37745
- Tencent Cloud SendSms API: https://cloud.tencent.com/document/api/382/55981
- Tencent Cloud API key management: https://cloud.tencent.com/document/product/598/37140
- WeChat Mini Program `wx.previewImage`: https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.previewImage.html
