# Role eligibility and language checks

Use this shared guidance alongside the active profile's evaluation framework.
It applies to existing local profiles without rewriting their personal files.

Read the role's actual requirements and the candidate's documented status.
Distinguish right to work, sponsorship needs, hours/start-date restrictions,
role-specific nationality requirements and security vetting. Never infer any
of these from a name, birthplace, language, or where someone studied.

- **PASS:** the documented candidate facts meet the stated requirement.
- **FAIL:** a confirmed, explicit requirement conflicts with a confirmed fact.
  Quote the requirement and explain the conflict; allow the user to correct
  incomplete profile data. A genuine hard requirement is a shortlist veto.
- **FLAG:** the posting, employer policy or profile is incomplete/ambiguous.
  State what needs confirmation and continue triage with that uncertainty visible.

In the UK, needing security clearance does not by itself prove that a non-British
candidate is ineligible. Verify the specific role, clearance and residency rules.
Likewise, right to work and citizenship are different questions. Do not assume
all noncitizens need sponsorship, or that a general company sponsorship policy
applies to every role. Check current official guidance when evaluating a real
case: [right to work](https://www.gov.uk/prove-right-to-work) and
[UK security vetting](https://www.gov.uk/government/publications/vetting-explained-and-our-vetting-charter/vetting-explained).

For language requirements, compare the language used in the role with documented
proficiency, not the language the advert happens to use. An unrecorded language
is unknown: ask or FLAG, rather than asserting the candidate cannot speak it.
Clearly insufficient confirmed proficiency for an explicit mandatory requirement
is FAIL; a flexible or ambiguous level is FLAG. Do not invent proficiency.

Report separate `location_verdict`, `language_gate` and `eligibility_gate` values
with evidence. Unknown facts must not become a silent PASS or automatic rejection.
