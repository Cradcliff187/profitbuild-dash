

# Add Password Visibility Toggle (Eye Icon)

## Overview
Add a clickable eye/eye-off icon to all password fields so users can toggle between hidden and visible password text. This is a very simple, low-risk change.

## What Changes

### 1. Auth.tsx (Login Page)
- Add `Eye` / `EyeOff` icons from lucide-react
- Add state `showPassword` to toggle visibility
- Wrap the password `<Input>` in a `relative` div and add an icon button inside it
- Toggle `type` between `"password"` and `"text"`

### 2. ChangePassword.tsx (Change Password Page)
- Same pattern for both "New Password" and "Confirm Password" fields
- Two separate toggle states (`showNewPassword`, `showConfirmPassword`)

### 3. ResetPassword.tsx (Reset Password Page)
- Same pattern for both password fields
- Two separate toggle states

## UI Pattern (applied to each password field)

```
<div className="relative">
  <Input type={showPassword ? "text" : "password"} ... className="pr-9" />
  <button
    type="button"
    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    onClick={() => setShowPassword(!showPassword)}
    tabIndex={-1}
  >
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | 1 password field gets toggle |
| `src/pages/ChangePassword.tsx` | 2 password fields get toggles |
| `src/pages/ResetPassword.tsx` | 2 password fields get toggles |

## Risk
None. Purely visual/UX addition with no logic changes.
