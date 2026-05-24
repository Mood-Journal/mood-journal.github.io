interface PickerCallbackData {
  action: string
  docs?: Array<{ id: string; name: string }>
}

interface GooglePickerDocsView {
  setMimeTypes(mimeTypes: string): GooglePickerDocsView
}

interface GooglePickerInstance {
  setVisible(visible: boolean): void
}

interface GooglePickerBuilder {
  setDeveloperKey(key: string): GooglePickerBuilder
  setOAuthToken(token: string): GooglePickerBuilder
  addView(view: GooglePickerDocsView): GooglePickerBuilder
  setCallback(fn: (data: PickerCallbackData) => void): GooglePickerBuilder
  build(): GooglePickerInstance
}

interface Window {
  gapi?: {
    load(api: string, callback: () => void): void
  }
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (response: {
            access_token?: string
            expires_in?: number
            error?: string
          }) => void
        }): { requestAccessToken(cfg?: { prompt?: string }): void }
      }
    }
    picker?: {
      PickerBuilder: new () => GooglePickerBuilder
      DocsView: new () => GooglePickerDocsView
    }
  }
}
