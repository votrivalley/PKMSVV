# Google Online for PC/Android — first working milestone

Both native clients remain offline-first and preserve every existing local save.

The game now shows a launch choice, plus a main-menu button, offering to use the hosted Google-enabled Web Edition. Electron opens the fixed Votri Valley URL through shell.openExternal with sender validation. Android opens the same URL through an Android ACTION_VIEW intent, outside the WebView. This avoids unsupported Google OAuth popups inside embedded webviews.

**Not native cloud save yet:** Google sign-in and synchronized cloud progress currently occur in the system browser using the Web Edition. The .exe and APK local save is separate; no automatic or silent save import, merge, or overwrite is implemented. Native-to-Web multiplayer is also not implemented. Do not describe the clients as fully cloud-enabled.

For true in-app cloud save, plan native Google SDK sign-in on Android (including package SHA fingerprint configuration), system-browser OAuth PKCE on Windows, a safe verified credential bridge, account-bound Firestore reads/writes, manual conflict resolution and save backups. Do not put tokens in URLs or include server credential secrets in apps.

QA: Launch apps with existing save, choose Offline, verify save. Choose Google Online, verify the OS browser opens https://pkmsvv-b84d2.web.app/ and Google login + cloud save work there. Return to native offline and verify old save remains. Test without Internet: Offline stays usable.
