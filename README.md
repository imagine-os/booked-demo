<p align="center">
  <img src="assets/brand-hero.svg" alt="Booked — Make time for good things. Original calendar and growing-plant illustration." width="100%">
</p>

<p align="center">
  <strong>A little less scheduling. A little more living.</strong><br>
  An original, playful booking prototype for the catch-ups, big ideas, and hellos that matter.
</p>

<p align="center">
  <a href="#a-little-look-around">Explore the demo</a> ·
  <a href="#try-it-locally">Run locally</a> ·
  <a href="features.csv">Feature overview</a> ·
  <a href="#room-to-grow">Roadmap</a>
</p>

---

## A little look around

Start with a friendly product story, then step into a working fictional workspace. Create an event, choose your open hours, and try the whole guest booking journey.

<table>
  <tr>
    <td width="74%"><img src="assets/event-dashboard.jpg" alt="Fictional Booked workspace with three event types, sunshine-yellow actions, and an original calendar illustration." width="100%"></td>
    <td width="26%"><img src="assets/guest-booking.jpg" alt="Mobile guest booking demo with a fictional host, calendar, available times, and timezone selector." width="100%"></td>
  </tr>
  <tr>
    <td align="center"><sub>A calm little home for your conversations.</sub></td>
    <td align="center"><sub>A clear path to a good moment.</sub></td>
  </tr>
</table>

Every screenshot uses fictional demo content. No real calendar or invitation is involved.

## Thoughtful in the little details

| Make room | Change plans | Set a boundary |
| --- | --- | --- |
| Create event types and choose weekly UTC hours. | Find another open time or send a counterproposal. | Give an invitation an expiry, a use limit, or both. |
| Set notice, booking windows, meeting gaps, and date overrides. | Accept or decline suggestions in the fictional host workspace. | Previewing a link never uses it up. |
| See unavailable times and display guest times in an IANA timezone. | Reschedule or cancel through a separate management link. | Expiry stops new bookings; confirmed meetings stay put. |

Also included: searchable event cards, downloadable demo calendar files, keyboard navigation, interactive product-story previews, and reduced-motion support. The demo makes no external API calls and loads no remote fonts or tracking.

> **A working demo, with clear boundaries.** All calendars and free/busy data here are fictional. Activity lives in your browser. Booking links, expiry rules, and use limits do not sync across people or devices and are not production enforcement.

## Try it locally

You only need Python 3 to serve these static files:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`, then:

1. Choose **Find your little moment** to enter the workspace.
2. Create a booking link from an event card and try the guest flow.
3. Book, suggest another time, reschedule, or cancel using fictional details.
4. Return to **Meetings** to review counterproposals as the fictional host.

Use a fictional name and an `example.test` email address. No email is sent. Keep the confirmation’s private management link if you want to change that booking later.

To let a friend explore, share the homepage after it is hosted. Each browser gets its own fictional workspace; a guest link from one browser does not create a shared reservation in another. Clear this site’s browser storage to reset demo activity.

## Room to grow

The current demo is designed to make the booking experience tangible. The next chapter needs real services and careful integration:

- Calendar connections and synchronized free/busy.
- Confirmation emails, reminders, and reliable notification delivery.
- Accounts, permissions, and a shared durable booking service.
- Host-local recurring schedules with DST handling, teams, and routing.

Google Calendar, OAuth, real invitations, accounts, payments, reminders, and team scheduling are **not connected**. Host recurrence is UTC; guest timezone display is separate. Booking retry keys cover retries within the active form session. This is an original Booked prototype, not full Calendly parity.

See [the feature overview](features.csv) for the current demo and planned work.

---

<p align="center"><strong>Make time for good things.</strong><br><sub>Original Booked artwork and copy. Booked.com is the product name; it does not imply ownership of a custom domain.</sub></p>
