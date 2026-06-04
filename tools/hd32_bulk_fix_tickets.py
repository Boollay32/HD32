#!/usr/bin/env python3
# =============================================================================
#  HD32 — correct the Tickets bulk "Set status" block
# =============================================================================
#  The first pass shipped the ticket bulk options with the wrong labels
#  ('On Hold'/'Solved') and posted the label as the value. Real ticket statuses
#  are int-keyed: Open=1, In Progress=2, Pending=3, Resolved=4, Closed=5
#  (per FilterBoxViewModel.ForTickets). This rewrites the block so it shows the
#  correct labels and posts the integer status id — matching the Tasks block,
#  which already posts a code. Idempotent; run from the repo root.
# =============================================================================
import io, os, sys

PATH = "wwwroot/js/Pages/Ticket/TicketPage.js"

OLD = """            bulk: [
                {
                    id: 'status', label: 'Set status',
                    options: ['Open', 'Pending', 'On Hold', 'Closed', 'Solved'],
                    apply: async (value, rows) => {
                        await API.post('Ticket/BulkUpdate', API.authPayload({
                            ids: rows.map(r => r.ticketID), field: 'status', value
                        }));
                    }
                },
            ],"""

NEW = """            bulk: [
                {
                    id: 'status', label: 'Set status',
                    options: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'],
                    apply: async (value, rows) => {
                        const code = { Open: 1, 'In Progress': 2, Pending: 3, Resolved: 4, Closed: 5 }[value];
                        await API.post('Ticket/BulkUpdate', API.authPayload({
                            ids: rows.map(r => r.ticketID), field: 'status', value: code
                        }));
                    }
                },
            ],"""

def main():
    if not os.path.exists(PATH):
        sys.exit("Run from the repo root — %s not found." % PATH)
    src = io.open(PATH, encoding="utf-8-sig").read()
    if NEW in src:
        print("Already corrected — nothing to do."); return
    if OLD not in src:
        sys.exit("Couldn't find the original bulk block to replace (was it edited?).")
    with io.open(PATH, "w", encoding="utf-8", newline="") as f:
        f.write(src.replace(OLD, NEW, 1))
    print("Corrected the Tickets bulk status block:", PATH)

if __name__ == "__main__":
    main()
