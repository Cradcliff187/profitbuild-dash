# Subcontractor Project Agreement – template setup

Before generating contracts, add a Word template and make it available to the app.

## 1. Create the Word template

1. Open your existing RCG Subcontractor Project Agreement in Microsoft Word.
2. Replace every instance of real data with the placeholders below.

### Placeholders

| Replace this kind of value | Use this placeholder |
|----------------------------|----------------------|
| Subcontractor company name | `{{SUBCONTRACTOR_COMPANY}}` |
| Subcontractor contact person | `{{SUBCONTRACTOR_CONTACT}}` |
| Subcontractor contact title | `{{SUBCONTRACTOR_TITLE}}` |
| Subcontractor phone | `{{SUBCONTRACTOR_PHONE}}` |
| Subcontractor email | `{{SUBCONTRACTOR_EMAIL}}` |
| Subcontractor address | `{{SUBCONTRACTOR_ADDRESS}}` or `{{SUBCONTRACTOR_ADDRESS_FORMATTED}}` |
| State of formation (e.g. KY) | `{{SUBCONTRACTOR_STATE}}` |
| Legal form (e.g. LLC) | `{{SUBCONTRACTOR_LEGAL_FORM}}` |
| Project name/number (e.g. [225-005] …) | `{{PROJECT_NAME_NUMBER}}` |
| Project number only | `{{PROJECT_NUMBER}}` |
| Project name only | `{{PROJECT_NAME}}` |
| Project location/address | `{{PROJECT_LOCATION}}` |
| Property owner | `{{PROPERTY_OWNER}}` |
| Project start date | `{{PROJECT_START_DATE}}` |
| Project end date | `{{PROJECT_END_DATE}}` |
| Subcontract number | `{{SUBCONTRACT_NUMBER}}` (or `{{SUBCONTRACT_NO}}`) |
| Subcontract price (e.g. $63,323.00) | `{{SUBCONTRACT_PRICE}}` |
| Agreement date (e.g. 11th day of June, 2025) | `{{AGREEMENT_DATE}}` |
| Prime contract owner | `{{PRIME_CONTRACT_OWNER}}` |
| RCG legal name | `{{RCG_LEGAL_NAME}}` |
| RCG display name | `{{RCG_DISPLAY_NAME}}` |
| RCG address | `{{RCG_ADDRESS}}` |
| RCG phone | `{{RCG_PHONE}}` |
| RCG email | `{{RCG_EMAIL}}` |
| RCG website | `{{RCG_WEBSITE}}` |
| RCG signatory name | `{{RCG_SIGNATORY_NAME}}` |
| RCG signatory title | `{{RCG_SIGNATORY_TITLE}}` |

3. Save the file as: **`subcontractor-project-agreement-template.docx`**

## 2. Storage bucket and upload

The migration `20260128020004_create_contract_templates_bucket.sql` creates the private **`contract-templates`** bucket and RLS policies (service role can read; admins/executives can manage).

After the migration has been applied:

**Option A – Upload via script (recommended)**

1. Ensure the template file exists as `docs/subcontractor-project-agreement-template.docx` (copy from `docs/subcontractor-agreement-template-FINAL.docx` if needed).
2. Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env` (from Supabase Dashboard → Project Settings → API → service_role secret).
3. From the project root run: `npm run upload:template`

**Option B – Upload via Supabase Dashboard**

1. In Supabase: **Storage** → open the **`contract-templates`** bucket.
2. Upload your Word template with the **exact** filename: **`subcontractor-project-agreement-template.docx`** (root path: `contract-templates/subcontractor-project-agreement-template.docx`).

3. Deploy the edge function (if not already deployed): run `supabase functions deploy generate-contract` from the project root. If you see “Access token not provided”, run `supabase login` first.

## 3. Check it works

Run the flow from the UI:

1. Open a project → **Estimates & Quotes** → open an **accepted** quote.
2. Click **Generate Contract**, complete the modal, and generate.
3. If the template or bucket name is wrong, the generate-contract function will log something like “Failed to fetch template”. Fix the filename or bucket and try again.

## Contract type and filename

- **Contract type in DB:** `subcontractor_project_agreement`
- **Template file name:** `subcontractor-project-agreement-template.docx`
- **Display name:** “Subcontractor Project Agreement”

Other contract types can be added later with their own template files and the same placeholder pattern.

## Troubleshooting: Email / Subcontract number not in the final document

**Symptom:** The user fills in Subcontractor Email and Subcontract Number in the Generate Contract modal, but the generated Word document shows blanks (or "N/A") where those values should appear.

**Root cause:** The app sends those values correctly and they are stored in the contract’s `field_values` in the database. If they don’t appear in the DOCX, the **Word template** in the `contract-templates` bucket does not contain the matching placeholders in the body, header, or footer.

**Fix:** In the Word template, insert the **exact** placeholders where the subcontractor email and subcontract number should appear:

- For the subcontractor’s email address use: **`{{SUBCONTRACTOR_EMAIL}}`**
- For the subcontract number use: **`{{SUBCONTRACT_NUMBER}}`**

Use Word’s Find (Ctrl+F) to search for “Subcontract No”, “E-Mail”, or similar labels and replace the following blank or static value with the placeholder (e.g. change “Subcontract No.: __________” to “Subcontract No.: {{SUBCONTRACT_NUMBER}}”). Type the placeholders exactly as above (double curly braces, uppercase, underscores). Re-upload the template to Storage.

**Check stored payload (Supabase):** `contracts.field_values` is JSONB. For a generated contract, `field_values->'subcontractor'->>'email'` and `field_values->'contract'->>'subcontractNumber'` should show the values entered in the modal. If they do, the problem is only the template content.
