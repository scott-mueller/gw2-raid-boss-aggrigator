# Command List

### Guild management Commands
    >guild create {name} {tag}
    >guild remove {ID}
    >guild {ID} member add {accountName}
    >guild {ID} member remove {accountName}
    >guild {ID} view

### Player management Commands
    >player account add {apiKey}
    >player account remove {accountName}
    >player account view

### Stats commands
    >stats {ID} {bossName} {sortMetric} {direction}
    >stats-deep {ID} {bossName}
    >encounter-summary {encounterId}

    >player summary global
    >player summary {bossName}

    >raid-report {ID} {week}
        - Week allows: current, previous, mm/dd/yyyy
        - mm/dd/yyyy chooses the week that date is a part of

