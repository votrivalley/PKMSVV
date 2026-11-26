# Royal V2 price proposal — QA only

Current pinned catalog remains purchaseEnabled:false, all prices null and artApproved:false. The proposal lives exclusively in tests/fixtures/research-royal-pricing.cjs, not in runtime. Copper prototypes remain unavailable in the priced fixture.

| Station | Proposed Co-op coins |
|---|---:|
| Support | 320 |
| Mega | 480 |
| Berry | 320 |
| Companion | 400 |
| Fossil | 640 |
| Total | 2160 |

Configured fossil mission rewards: 200 first clear, 120 replay, optional 0–40, expected 8 minutes. From zero and no other spending, a complete set requires 13–18 successful missions including first clear (104–144 minutes of mission time). This is a theoretical estimate from configuration, not a measured live farming rate. No changes to mission reward settlement. A gold Pippi statue stays 9999 coins in the existing separate legacy catalog. All prices are provisional and require user approval.

Browser persistence QA intercepts the catalog only within a fresh synthetic local browser context. Verify individual purchase prices, Copper still locked, full five-station set saved to localStorage and Guardian, zero-balance re-equip, original legacy decor preserved. Tests also cover exactly enough money and one coin short. No public deployment or player save mutation. CI pending.
