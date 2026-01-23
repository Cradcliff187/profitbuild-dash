# SMS Error Logging & UI Improvements

**Date:** January 23, 2026  
**Issue:** Mike Wethington's SMS (513-509-0933) consistently failing with no error details visible

---

## Changes Implemented

### 1. **Database Schema Enhancement**
- ✅ Added `textbelt_http_status` column to `sms_messages` table
- Stores HTTP status code from Textbelt API calls for better diagnostics

```sql
ALTER TABLE sms_messages ADD COLUMN IF NOT EXISTS textbelt_http_status integer;
```

---

### 2. **Edge Function Improvements** (`supabase/functions/send-sms/index.ts`)

#### Enhanced Logging
- ✅ Captures HTTP status code from Textbelt responses
- ✅ Logs comprehensive diagnostic info for all API calls
- ✅ Enhanced error logging with full context including:
  - HTTP status
  - Phone number and recipient details
  - Message length and link info
  - Timestamp
  - Full Textbelt response

#### Improved Error Message Capture
- ✅ Ensures `error_message` is **always** populated for failures:
  - Uses Textbelt's error message if provided
  - Falls back to `HTTP {status} - No error message from Textbelt` if no message
  - Falls back to descriptive message if success:false with no error
- ✅ Stores HTTP status code in new `textbelt_http_status` field
- ✅ Logs success confirmation when failed SMS is logged to database

#### Key Code Changes
```typescript
// Captures HTTP status before parsing JSON
const httpStatus = textbeltResponse.status;
const textbeltResult = await textbeltResponse.json();

// Enhanced error logging
console.log('📱 Textbelt API Response:', {
  httpStatus,
  success: textbeltResult.success,
  textId: textbeltResult.textId,
  error: textbeltResult.error,
  quotaRemaining: textbeltResult.quotaRemaining,
  phone: finalPhone,
  recipientName,
});

// Comprehensive error message construction
let errorMessage = null;
if (!textbeltResult.success) {
  if (textbeltResult.error) {
    errorMessage = textbeltResult.error;
  } else if (httpStatus !== 200) {
    errorMessage = `HTTP ${httpStatus} - No error message from Textbelt`;
  } else {
    errorMessage = 'Unknown error - Textbelt returned success:false with no error message';
  }
}
```

---

### 3. **UI Enhancements** (`src/components/sms/SMSHistory.tsx`)

#### Desktop Table View
- ✅ Added error tooltips on hover for failed messages
- ✅ Shows AlertCircle icon next to failed status badges
- ✅ Displays error message and HTTP status in tooltip
- ✅ Failed rows have subtle red background (`bg-destructive/5`)
- ✅ Tooltip shows "No error details available" if neither error_message nor http_status exist

#### Mobile Card View
- ✅ Failed message cards have red border accent
- ✅ Red background in card header for failed messages
- ✅ Prominent Alert component displaying:
  - "Delivery Failed" heading
  - Error message from Textbelt
  - HTTP status code (if available)
  - Fallback message if no details available

#### Type Safety
- ✅ Updated TypeScript interfaces to include `textbelt_http_status` field
- ✅ Updated Supabase types (`types.ts`) for Row, Insert, and Update operations

#### Visual Improvements
```typescript
// Desktop: Tooltip with error details
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-1 cursor-help">
        {badge}
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
      </div>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <div className="space-y-1 text-xs">
        <div className="font-semibold">Error Details:</div>
        {errorMessage && <div>{errorMessage}</div>}
        {httpStatus && <div className="text-muted-foreground">HTTP Status: {httpStatus}</div>}
      </div>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

// Mobile: Alert component in card
<Alert variant="destructive" className="py-2">
  <AlertCircle className="h-3.5 w-3.5" />
  <AlertDescription className="text-xs ml-6">
    <div className="font-semibold mb-0.5">Delivery Failed</div>
    {message.error_message && <div>{message.error_message}</div>}
    {message.textbelt_http_status && (
      <div className="text-[10px] mt-0.5 opacity-75">
        HTTP Status: {message.textbelt_http_status}
      </div>
    )}
  </AlertDescription>
</Alert>
```

---

## Root Cause Analysis: Mike Wethington's SMS Failures

### Database Investigation Results

**Query Result:**
```sql
SELECT recipient_name, recipient_phone, delivery_status, 
       error_message, textbelt_text_id, sent_at 
FROM sms_messages 
WHERE recipient_phone = '5135090933' 
ORDER BY sent_at DESC LIMIT 10;
```

**Finding:**
- ❌ 100% failure rate (10/10 recent attempts)
- ❌ `error_message`: **NULL** (no error from Textbelt)
- ❌ `textbelt_text_id`: **NULL** (Textbelt never returned a text ID)
- ✅ Phone format is correct: `5135090933` (10 digits)
- ✅ User has `sms_notifications_enabled: true`

**Same Batch Comparison (Jan 21, 2026 at 20:25):**
| Time | Recipient | Phone | Status |
|------|-----------|-------|--------|
| 20:25:02 | John Burns | 859-801-6963 | ✅ SENT |
| 20:25:03 | **Mike Wethington** | **513-509-0933** | ❌ **FAILED** |
| 20:25:03 | Tom Garoutte | 859-469-1474 | ✅ SENT |
| 20:25:04 | Danny Boy | 513-514-4354 | ✅ SENT |

### Conclusion

**The lack of error_message from Textbelt strongly suggests:**
1. **Number is blocked/filtered at Textbelt level** - possibly opted out via "STOP" reply
2. **VoIP/Landline number** - May not support SMS
3. **Carrier-level block** - Carrier rejecting messages from Textbelt
4. **Disconnected number** - Number format valid but service inactive

**Evidence supporting Textbelt blocklist theory:**
- ✅ Other 513 area code numbers work (Danny Boy: 513-514-4354)
- ✅ No code/validation errors (format is correct)
- ✅ Textbelt provides no error details (unusual behavior)
- ✅ Consistent 100% failure rate across weeks

---

## Next Steps for Troubleshooting

### Immediate Actions
1. **Check Edge Function logs** - Enhanced logging will now show HTTP status and full error context
2. **View error in UI** - SMS History page now displays error messages for all failed sends
3. **Contact Mike** - Verify:
   - Is the number active and SMS-capable?
   - Is it a mobile number (not VoIP/landline)?
   - Has he blocked or reported messages as spam?
   - Did he reply "STOP" to any previous SMS?

### Testing Options
1. **Test Mode**: Use `testMode: true` in send request to validate without using credits
2. **Alternative Number**: Ask Mike for an alternative mobile number to test
3. **Contact Textbelt Support**: Provide them with:
   - Phone number: `5135090933`
   - Recent text IDs from successful sends (for comparison)
   - Request they check if number is on their opt-out/block list

---

## Benefits of These Improvements

### For Developers
- ✅ Better debugging with comprehensive logs
- ✅ HTTP status codes help identify API vs. validation issues
- ✅ Timestamp tracking for error patterns
- ✅ Full diagnostic info in Edge Function logs

### For End Users
- ✅ Visible error messages in UI (no database access needed)
- ✅ Clear indication of failed messages
- ✅ Helpful error details for troubleshooting
- ✅ Better user experience with visual feedback

### For Support Team
- ✅ Quick identification of recurring issues
- ✅ Error messages available directly in UI
- ✅ Ability to see patterns (e.g., specific carrier issues)
- ✅ Data to provide to Textbelt support if needed

---

## Files Modified

1. **Database**: `sms_messages` table - Added `textbelt_http_status` column
2. **Edge Function**: `supabase/functions/send-sms/index.ts` - Enhanced logging and error capture
3. **UI Component**: `src/components/sms/SMSHistory.tsx` - Added error display
4. **Types**: `src/integrations/supabase/types.ts` - Updated TypeScript definitions

---

## Testing Recommendations

### Test Scenario 1: Failed Message Display
1. Navigate to SMS History page
2. Look for Mike Wethington's failed messages
3. **Desktop**: Hover over status badge - should see tooltip with error
4. **Mobile**: Should see red Alert box with error details

### Test Scenario 2: New Send with Error
1. Try sending a test SMS to Mike's number
2. Check Edge Function logs for enhanced diagnostic info
3. Verify error appears in SMS History immediately
4. Confirm HTTP status and error message are captured

### Test Scenario 3: Successful Send
1. Send test SMS to a working number (e.g., Danny Boy)
2. Verify no error indicators appear
3. Confirm normal blue/green status badge shows

---

## Documentation Reference

**Textbelt API Documentation**: https://docs.textbelt.com/

**Key Findings from Docs:**
- Failed sends should return `{"success": false, "error": "description"}`
- Mike's sends return no error field (unusual)
- Textbelt automatically handles "STOP" replies and blocks those numbers
- Network/timeout issues may result in no response at all

---

## Summary

These improvements ensure that **every SMS failure is now visible, trackable, and debuggable** - both in the logs and the UI. The specific issue with Mike Wethington's number appears to be a Textbelt-side block/filter rather than a code issue, but with these enhancements, future issues will be much easier to diagnose and resolve.
