# Google Cloud Setup

Mood Journal requires two Google Cloud credentials: an **OAuth 2.0 client ID** (for sign-in and Sheets access) and an **API key** (for the Google Drive Picker). This guide walks through creating both from scratch.

---

## 1. Create a project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project selector at the top → **New Project**
3. Give it a name (e.g. `Mood Journal`) and click **Create**

---

## 2. Enable APIs

In the left menu, go to **APIs & Services → Library** and enable both:

- **Google Sheets API**
- **Google Picker API**

---

## 3. Configure the OAuth consent screen

Go to **APIs & Services → OAuth consent screen**

- **User type**: External (or Internal if this is a Google Workspace org)
- Fill in **App name**, **User support email**, and **Developer contact email**
- **Scopes**: click *Add or remove scopes* and add:
  ```
  https://www.googleapis.com/auth/drive.file
  ```
  This scope limits access to files the app creates or that the user explicitly selects — it does not grant access to the rest of the user's Drive.
- **Test users**: add the Google accounts that need access while the app is in *Testing* status

> Publishing the app (moving it out of Testing) removes the test-user restriction. For a personal tool you can leave it in Testing indefinitely.

---

## 4. Create the OAuth 2.0 client ID

Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**

- **Application type**: Web application
- **Name**: anything descriptive (e.g. `Mood Journal Web`)
- **Authorised JavaScript origins** — add every origin the app will be served from:
  - Local dev: `http://localhost:5173`
  - GitHub Pages: `https://<your-username>.github.io`
  - Any custom domain if applicable

> No redirect URIs are needed. Mood Journal uses the Google Identity Services token client, which only requires JavaScript origins.

Click **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`).

---

## 5. Create an API key

Go to **APIs & Services → Credentials → Create Credentials → API key**

Copy the key, then click **Edit API key** to restrict it:

- **Application restrictions**: HTTP referrers — add:
  - `http://localhost:5173/*`
  - `https://<your-username>.github.io/*`
- **API restrictions**: Restrict key → select **Google Picker API**

Click **Save**.

---

## 6. Store the credentials

### Local development

Create a `.env` file in the project root (this file is gitignored):

```env
VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=<your-api-key>
```

### GitHub Actions (for GitHub Pages deployment)

Add both values as repository secrets:

1. Go to your repo → **Settings → Secrets and variables → Actions → Secrets**
2. Add `VITE_GOOGLE_CLIENT_ID` with the client ID value
3. Add `VITE_GOOGLE_API_KEY` with the API key value

The deploy workflow reads these automatically on every push to `main`.

---

## Credential reference

| Variable | Where used | What it does |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth sign-in flow | Authenticates the user and obtains an access token scoped to `drive.file` |
| `VITE_GOOGLE_API_KEY` | Google Drive Picker | Allows the Picker widget to render the user's spreadsheets when connecting an existing sheet |

---

## How sign-in and tokens work

Mood Journal uses the Google Identity Services **token model** (implicit flow). A few consequences worth knowing:

- **Access tokens are short-lived (~1 hour) and there are no refresh tokens.** By design, a new token can only be obtained from a user gesture. The app therefore mints a fresh token each time you press **Sync** — it never refreshes silently in the background. Pressing Sync after the token has expired (or after a page reload) simply requests a new one and then reconciles.
- After the first consent, repeat Sync presses are silent (no popup) as long as you have an active Google session. If the session has lapsed, the press surfaces the account/consent popup, then continues.

**No additional Google Cloud configuration is required for this** — the flow works with the OAuth client and scope set up above. If you hit an auth error, check these in order:

1. **Authorised JavaScript origins** on the OAuth client ID include the exact origin you're loading from (e.g. `http://localhost:5173` and `https://<your-username>.github.io`). A missing or mismatched origin is the most common cause of token request failures.
2. Your Google account is listed under **Test users** on the OAuth consent screen (while the app is in *Testing* status).
3. No redirect URIs and no extra scopes are needed — leaving them empty is correct.

Leaving the consent screen in *Testing* status is fine for a personal tool; the 7-day expiry that applies to *Testing* refresh tokens does not affect this app, since the token model issues no refresh tokens.
