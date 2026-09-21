# Analysis engine

Sequence of `GET /api/analysis?home=&away=&league=`. The endpoint first resolves the real fixture
between the two teams (so the caller does not have to invent a date) and then computes the three
signals over the same stored match rows. The signals are returned side by side and are never fused,
weighted against each other or reduced to a single score.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Page as AnalysisPage
    participant Hook as useAnalysis
    participant Svc as analysis.service
    participant Ctrl as analysis.controller
    participant Engine as analysisEngine
    participant Repo as matches.repository
    participant Fixture as fixture.service
    participant Form as form.service
    participant HA as homeAway.service
    participant Sched as schedule.service
    participant Stand as standings.service

    User->>Page: open /match/:league/:homeId/:awayId
    Page->>Hook: useAnalysis({ home, away, league })
    Hook->>Svc: getAnalysis({ home, away, league })
    Svc->>Ctrl: GET /api/analysis?home=&away=&league=
    Ctrl->>Ctrl: analysisQuerySchema.safeParse(req.query)

    alt invalid or missing home/away (or home === away)
        Ctrl-->>Svc: 400 Invalid query parameters
        Svc-->>Hook: error
        Hook-->>Page: error state
    else valid query
        Ctrl->>Engine: analyzeMatch({ homeTeamId, awayTeamId, league })
        Engine->>Repo: findByTeams([home, away], league)
        Repo-->>Engine: match rows for both teams (league-scoped)

        Engine->>Fixture: resolveFixture(matchList, home, away, now)
        Note over Fixture: next meeting still to be played,<br/>otherwise the most recent one played,<br/>matching the exact home/away orientation
        Fixture-->>Engine: real fixture, or null
        Engine->>Engine: effectiveDate = matchDate ?? fixture.utcDate ?? now

        opt league given
            Engine->>Repo: findByLeague(league)
            Repo-->>Engine: all league matches
            Engine->>Stand: buildStandings(leagueMatches)
            Stand-->>Engine: sorted table
            Engine->>Stand: teamStanding(table, home) / (table, away)
            Stand-->>Engine: position or null
        end

        par Independent signals
            Engine->>Form: weightedForm(matchList, { teamId: home })
            Form-->>Engine: form.home (decayed weighted score)
        and
            Engine->>Form: weightedForm(matchList, { teamId: away })
            Form-->>Engine: form.away
        and
            Engine->>HA: homeAwaySplit(matchList, home, "HOME")
            HA-->>Engine: homeAway.home
        and
            Engine->>HA: homeAwaySplit(matchList, away, "AWAY")
            HA-->>Engine: homeAway.away
        and
            Engine->>Sched: congestionSignal(matchList, home, effectiveDate)
            Sched-->>Engine: schedule.home
        and
            Engine->>Sched: congestionSignal(matchList, away, effectiveDate)
            Sched-->>Engine: schedule.away
        end

        Engine-->>Ctrl: { form, homeAway, schedule, fixture, standings } unmerged
        Ctrl-->>Svc: 200 analysis
        Svc-->>Hook: analysis
        Hook-->>Page: analysis
        Page-->>User: fixture banner + three separate signal cards
    end
```

Signals at a glance:

| Signal | Module | What it answers | Defaults |
| --- | --- | --- | --- |
| Recent form | `form.service.js` | How good has each team been lately? | 5 matches, 0.7 decay per match of age |
| Home vs away | `homeAway.service.js` | How does each team perform in the venue this game is played in? | season-to-date, exact venue |
| Schedule congestion | `schedule.service.js` | How heavy is the run-up to this kickoff? | 14-day window, 3-match threshold |

The analysis page also shows each team's league position (from `standings.service.js`) inside the
Home vs away card, and the fixture banner shows the resolved match's status, date and matchday.

When a signal lacks enough history it says so explicitly instead of guessing: `form.weightedScore`
is `null` with zero matches analyzed, `homeAway` reports zero matches, and `schedule` reports "no
previous matches in the window". A pairing with no meeting on record returns `fixture: null` and
the analysis still computes the signals from whatever matches each team has.

There used to be a fourth signal, head-to-head, removed because it rarely had enough data and the
external cross-season endpoint was not reliable enough to show as fact (see
[`../scope.md`](../scope.md)).
