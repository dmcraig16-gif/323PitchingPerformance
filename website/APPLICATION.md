# 323 Application (Tally)

Build this in Tally, then put the form's share link in `applicationUrl` in `index.html`. About 5 minutes to fill out. Three pages so it never feels long on a phone.

## Hidden fields

Add these first (Tally: type `/hidden fields`). The website fills them in automatically.

| Field name | Filled with |
|---|---|
| `program` | The program button they clicked (`Complete Pitching Program` or `Mental Game Mentorship`). Empty from general Apply buttons |
| `utm_source` | Where they came from, e.g. `instagram` |
| `utm_medium` | e.g. `bio` |
| `utm_campaign` | Optional campaign tag |

## Page 1: Contact

Title: **Apply to 323 Pitching Performance**
Intro text: *About five minutes. When you submit, you'll pick a time for a free 20 to 30 minute call with your athlete and a parent.*

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Who's filling this out? | Multiple choice: Parent or guardian / Athlete | Yes |
| 2 | Parent or guardian full name | Short text | Yes |
| 3 | Parent or guardian email | Email | Yes |
| 4 | Parent or guardian phone | Phone | Yes |
| 5 | Athlete full name | Short text | Yes |
| 6 | Athlete age | Number | Yes |
| 7 | Graduation year | Dropdown: 2026 / 2027 / 2028 / 2029 / 2030 / 2031 | Yes |
| 8 | City and state | Short text. Help text: *So we can schedule calls in your time zone.* | Yes |

## Page 2: The athlete

| # | Question | Type | Required |
|---|---|---|---|
| 9 | Current level | Multiple choice: Middle school / High school JV / High school varsity / Travel or showcase only / Other | Yes |
| 10 | School and travel team | Short text | No |
| 11 | Throws | Multiple choice: Right / Left | Yes |
| 12 | Fastball velocity | Short text. Help text: *A best guess is fine, or "not sure."* | No |
| 13 | Pitches thrown | Checkboxes: 4-seam / 2-seam or sinker / Cutter / Slider / Curveball / Changeup / Splitter / Other | No |
| 14 | What does your athlete do now for throwing and lifting? | Multiple choice: Nothing structured / Team program only / Private lessons or a facility / Another online program | Yes |
| 15 | Any current or past arm injuries? | Long text. Help text: *Write "none" if none.* | Yes |

## Page 3: Goals and fit

| # | Question | Type | Required |
|---|---|---|---|
| 16 | Which program are you interested in? | Multiple choice: Complete Pitching Program / Mental Game Mentorship / Not sure yet. Help text: *Not sure? That's what the call is for.* | Yes |
| 17 | What's the biggest goal for the next 6 to 12 months? | Long text | Yes |
| 18 | What's getting in the way right now? | Long text. Help text: *Mechanics, velocity, confidence, a bad outing that sticks, anything.* | No |
| 19 | When is the athlete's season? | Checkboxes: High school spring / Summer travel / Fall ball / Off-season right now | Yes |
| 20 | Days per week available to train | Multiple choice: 2 / 3 / 4 / 5 or more | Yes |
| 21 | Commitment | Checkbox: *I understand the Complete Pitching Program has a 6-month minimum and Mental Game Mentorship has a 3-month minimum.* | Yes |
| 22 | How did you hear about 323? | Multiple choice: Instagram / 323 Community on Skool / Friend or teammate / Coach / Other | Yes |
| 23 | Anything else we should know? | Long text | No |

Optional: if Tally lets you set question 16's default answer from the hidden field (`@program`), do it, so it's pre-picked when someone came from a program's Apply button. Either way, the hidden field records which button they clicked.

## After submit: send them to the call

Settings > **Redirect on completion**, to the Calendly discovery call. Tally can pass answers into the link so Calendly is already filled in. Insert the answers with Tally's `@` mentions:

```
https://calendly.com/323mperformance/3-23-performance-discovery-call?name=@Parent or guardian full name&email=@Parent or guardian email&a1=@Current level&a2=@Which program are you interested in?
```

- `name` and `email` fill Calendly's contact fields.
- `a1` answers Calendly's first question ("Age/ Level of play.").
- `a2` answers its second ("What are you interested in?"). The Tally answers `Complete Pitching Program` and `Mental Game Mentorship` match Calendly's choices exactly. "Not sure yet" leaves it blank for them to pick.

If you'd rather show a thank-you page than redirect, use this text and put the Calendly link on the button:

> **Application received.** One last step: pick a time for your free discovery call. It's 20 to 30 minutes with your athlete and a parent.
> [Book your call]
> While you wait, join the free 323 Community on Skool: https://www.skool.com/323-pitching-performance-1445/about

## Where submissions go

Tally keeps every submission in the form's **Submissions** tab and can email you each one (Settings > Notifications). To keep them in a spreadsheet, connect Google Sheets under Integrations.

## The Skool community after booking

A redirect skips Tally's thank-you page, so put the Skool link where people land next: Calendly's confirmation page and confirmation email (event settings > Confirmation page, and Notifications). Suggested line:

> You're booked. While you wait, join the free 323 Community on Skool: https://www.skool.com/323-pitching-performance-1445/about
