# Motor de análisis

Secuencia de `GET /api/analysis?home=&away=&league=`. El endpoint primero resuelve el partido real
entre los dos equipos (así quien llama no tiene que inventar una fecha) y luego calcula las tres
señales sobre las mismas filas de partidos almacenadas. Las señales se devuelven una al lado de la
otra y nunca se fusionan, se ponderan entre sí ni se reducen a una única puntuación.

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

    User->>Page: abre /match/:league/:homeId/:awayId
    Page->>Hook: useAnalysis({ home, away, league })
    Hook->>Svc: getAnalysis({ home, away, league })
    Svc->>Ctrl: GET /api/analysis?home=&away=&league=
    Ctrl->>Ctrl: analysisQuerySchema.safeParse(req.query)

    alt home/away inválidos o ausentes (o home === away)
        Ctrl-->>Svc: 400 Invalid query parameters
        Svc-->>Hook: error
        Hook-->>Page: estado de error
    else query válida
        Ctrl->>Engine: analyzeMatch({ homeTeamId, awayTeamId, league })
        Engine->>Repo: findByTeams([home, away], league)
        Repo-->>Engine: filas de partidos de ambos equipos (acotado a la liga)

        Engine->>Fixture: resolveFixture(matchList, home, away, now)
        Note over Fixture: el próximo enfrentamiento por jugarse,<br/>si no el más reciente ya jugado,<br/>respetando la orientación exacta local/visitante
        Fixture-->>Engine: partido real, o null
        Engine->>Engine: effectiveDate = matchDate ?? fixture.utcDate ?? now

        opt se dio una liga
            Engine->>Repo: findByLeague(league)
            Repo-->>Engine: todos los partidos de la liga
            Engine->>Stand: buildStandings(leagueMatches)
            Stand-->>Engine: tabla ordenada
            Engine->>Stand: teamStanding(table, home) / (table, away)
            Stand-->>Engine: posición o null
        end

        par Señales independientes
            Engine->>Form: weightedForm(matchList, { teamId: home })
            Form-->>Engine: form.home (puntuación ponderada con decaimiento)
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

        Engine-->>Ctrl: { form, homeAway, schedule, fixture, standings } sin fusionar
        Ctrl-->>Svc: 200 analysis
        Svc-->>Hook: analysis
        Hook-->>Page: analysis
        Page-->>User: banner de fixture + tres tarjetas de señales separadas
    end
```

Las señales de un vistazo:

| Señal | Módulo | Qué responde | Valores por defecto |
| --- | --- | --- | --- |
| Forma reciente | `form.service.js` | ¿Qué tan bien viene jugando cada equipo? | 5 partidos, decaimiento de 0.7 por partido de antigüedad |
| Local vs visitante | `homeAway.service.js` | ¿Cómo rinde cada equipo en la sede donde se juega este partido? | temporada en curso, sede exacta |
| Congestión de calendario | `schedule.service.js` | ¿Qué tan cargado viene el calendario previo a este pitido inicial? | ventana de 14 días, umbral de 3 partidos |

La vista de análisis también muestra la posición en la tabla de cada equipo (desde
`standings.service.js`) dentro de la tarjeta Local vs visitante, y el banner de fixture muestra el
estado, la fecha y la jornada del partido resuelto.

Cuando a una señal le falta historial suficiente lo dice explícitamente en vez de adivinar:
`form.weightedScore` es `null` con cero partidos analizados, `homeAway` reporta cero partidos, y
`schedule` reporta "sin partidos previos en la ventana". Un enfrentamiento sin ningún cruce
registrado devuelve `fixture: null` y el análisis igual calcula las señales con los partidos que
tenga cada equipo.

Hubo una cuarta señal, historial directo (head-to-head), eliminada porque casi nunca tenía datos
suficientes y el endpoint externo entre temporadas no era lo bastante fiable para mostrarlo como un
hecho (ver [`../scope.es.md`](../scope.es.md)).
