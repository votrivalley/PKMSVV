# V3.1 shop browser QA follow-up

Correct the station heading tuple indices and avoid the legacy locale replacement of `Chưa mở` inside Vietnamese shop labels. Add a fresh-context Chromium paid-flow test, intercepting the shipped closed registry with a 100-coin fixture; no sale flags or real prices change. DB.commit is mocked in that context only, and reload is exercised by loading the captured state into a fresh page load, not a real persisted profile. Test ownership, independent station equip, reset, failed-commit rollback and duplicate prevention. The real catalog remains closed.
