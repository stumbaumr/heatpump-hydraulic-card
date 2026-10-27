# Heatpump Hydraulic Card

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Sturmi77/heatpump-hydraulic-card/main/docs/logo/logo-dark.svg">
  <img src="https://raw.githubusercontent.com/Sturmi77/heatpump-hydraulic-card/main/docs/logo/logo-light.svg" alt="Logo: heat pump, diverter valve, hot water tank and radiator as a small schematic" width="128" align="right">
</picture>

[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://www.hacs.xyz/docs/use/repositories/dashboard/#search-repositories)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Validate](https://github.com/Sturmi77/heatpump-hydraulic-card/actions/workflows/validate.yml/badge.svg)](https://github.com/Sturmi77/heatpump-hydraulic-card/actions/workflows/validate.yml)
[![GitHub release](https://img.shields.io/github/v/release/Sturmi77/heatpump-hydraulic-card)](https://github.com/Sturmi77/heatpump-hydraulic-card/releases)

[![Open your Home Assistant instance and open this repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Sturmi77&repository=heatpump-hydraulic-card&category=plugin)

![Heat Pump Hydraulic Card overview with the animated schematic and feature callouts](docs/social-preview.png)

An **animated hydraulic schematic** for heat pumps in Home Assistant: air, ground (brine) and groundwater sources.

It shows electricity flowing from **PV, battery and grid** into the heat pump, the **diverter valve** switching between hot water and heating, colour-coded **tanks**, the **heating circuit** and your rooms. Animation speed follows the real flow rate. The core is vendor-neutral: **presets** make it zero-config for popular heat pumps:

| Preset | Brands / models | Integration | Outdoor-unit schematic | Status |
|---|---|---|---|---|
| `lambda` | **Lambda** (EU-L series) | [lambda_heat_pumps](https://github.com/GuidoJeuken-6512/lambda_heat_pumps) (HACS) | Lambda EU-L | tested on a real installation |
| `heishamon` | **Panasonic** Aquarea (H, J, K, L generation; monoblock, split, all-in-one) | [HeishaMon](https://github.com/heishamon/HeishaMon) + [heishamon-homeassistant](https://github.com/kamaradclimber/heishamon-homeassistant) (HACS) | Panasonic Aquarea | confirmed on a real installation |
| `kronoterm` | **Kronoterm** (ADAPT, ETERA, VERSI, WPLV …) | [Kronoterm](https://github.com/Favio25/Kronoterm-homeassistant) (HACS), Cloud API or Modbus | generic (no Kronoterm drawing yet) | Cloud API confirmed on a real installation; Modbus from the integration source |
| `vicare` | **Viessmann** (Vitocal) | [ViCare](https://www.home-assistant.io/integrations/vicare/) (core) | Viessmann Vitocal 250-A | untested |
| `open3e` | **Viessmann** (Vitocal) | [Open3E](https://github.com/MojoOli/open3e-ha) (HACS, MQTT) | Viessmann Vitocal 250-A | untested |
| `vaillant` | **Vaillant** (aroTHERM, aroTHERM plus), **Saunier Duval**, **Bulex**, **Glow-worm**, **DemirDöküm** | [myPyllant](https://github.com/signalkraft/mypyllant-component) (HACS) | Vaillant aroTHERM plus by default; Saunier Duval GeniaAir Mono by manual override | untested |
| `emsesp` | **Bosch**, **Buderus**, **Junkers**, **Nefit**, **Worcester**, **Sieger**, **elm.leblanc**, **iVT** – EMS/EMS+ heat pumps such as Buderus Logatherm WLW, Bosch Compress, Nefit EnviLine | [EMS-ESP](https://github.com/emsesp/EMS-ESP32) gateway (MQTT discovery) | Bosch Compress 5800i/6800i AW | untested |
| `ebusd` | **Vaillant** aroTHERM / aroTHERM plus (HMU) with a VWZ hydraulic station and sensoCOMFORT / multiMATIC controller | [ebusd](https://github.com/john30/ebusd) with Home Assistant MQTT discovery | Vaillant aroTHERM plus | mapped from and checked live on one real installation (aroTHERM plus cascade, two circuits) |
| `wolf` | **Wolf** air/water heat pumps (CHA monoblock) with a WOLF Link gateway | [Wolf SmartSet Service](https://www.home-assistant.io/integrations/wolflink/) (core, `wolflink`) or [Wolf SmartSet (read/write)](https://github.com/tibuntu/homeassistant-wolf-smartset) (HACS, `wolf_smartset`) | generic fan | untested |
| `luxtronik` | **Alpha Innotec**, **Novelan**, **Roth**, **Siemens**, **Elco**, **Buderus**, **Nibe**, **Wolf** heat pumps with a Luxtronik controller | [Luxtronik](https://github.com/BenPru/luxtronik) (HACS, `luxtronik2`) | generic fan, loop symbol with `source_type` | untested |
| `samsung` | **Samsung** EHS (Mono, Split, TDM) on the NASA bus | [esphome-samsung-nasa](https://github.com/Beormund/esphome-samsung-nasa) (ESPHome) | Samsung EHS Mono HT Quiet | tested on a real installation |

Additional real-installation reports with manual entity mappings are tracked separately from preset validation:

| System | Data source | Test status | Follow-up |
|---|---|---|---|
| Intergas Xtend hybrid heat pump + gas boiler | ESPHome | Manual mapping reported working on a real installation ([community report, 2026-10-25](https://community.home-assistant.io/t/card-heatpump-flow-card-animated-hydraulic-schematic-for-heat-pumps-lambda-viessmann-vaillant-bosch-buderus-panasonic/1029598/9)); no preset | Please verify `error_ok`, period tiles from `total_increasing` counters and the automatic Energy-dashboard power split. A separate boiler block for bivalent operation is tracked in [#51](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/51). |
| Viessmann Vitocal 333-G NC brine-to-water | Optisplitter (ViCare as backup) | Manual mapping offered in the [community discussion (2026-10-25)](https://community.home-assistant.io/t/card-heatpump-flow-card-animated-hydraulic-schematic-for-heat-pumps-lambda-viessmann-vaillant-bosch-buderus-panasonic/1029598/9); not yet validated with this card | Please test `source_type: brine` with the buffer entities cleared. This should show the ground loop without an air-source fan or defrost effects and keep the direct heating path connected. |

> [!NOTE]
> The **Viessmann**, **Open3E**, **Vaillant**, **EMS-ESP**, **Wolf** and **Luxtronik** presets are **not yet tested with a real installation**. They are built from the source code of the respective integrations (Wolf also from the entity states of one CHA installation) and checked with simulated data. Feedback is very welcome: please [open a preset feedback issue](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/new?template=preset_feedback.yml) and paste the card's diagnostic report after reviewing its entity ids for private names. The Lambda and HeishaMon presets have been confirmed on real installations.
> Manual mappings reported above confirm that the vendor-neutral configuration can cover those systems; they do not validate any zero-config preset.

![Animated Lambda demo: heating, hot water, defrost and standby with timeline, quick controls and statistics](docs/demo.gif)

**[Try the live demo](https://sturmi77.github.io/heatpump-hydraulic-card/demo/)**: every preset in heating, hot water, defrost and standby, the automatic/night/contrast card themes, English, German and an example custom Dutch translation, with the matching card configuration. Runs in the browser with simulated data, no Home Assistant needed.

## Current status

The current release is **[0.12.0](https://github.com/Sturmi77/heatpump-hydraulic-card/releases/tag/v0.12.0)**. Its HACS, quality, Chromium and Firefox checks pass, including 833 browser self-tests. The shipped presets and features are covered with simulated data; Lambda and HeishaMon have also been confirmed on real installations.

Release 0.12.0 adds the presets Wolf, Kronoterm, ebusd, Open3E, Luxtronik and Samsung, up to six heating circuits, the circuit return label and room temperature per circuit; the new presets are listed as untested above unless a real installation has confirmed them. Real-installation feedback for Viessmann (ViCare, Open3E), Vaillant, EMS-ESP, Wolf and Luxtronik is therefore the highest-priority follow-up; reports from additional HeishaMon models and generations remain welcome. Please use the [tester issue](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/1) or the [preset feedback form](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/new?template=preset_feedback.yml) and review the diagnostic report for private entity names before posting it.

The completed release history and the prioritized post-0.12.0 backlog are maintained in the [development plan](docs/ROADMAP.md).

## Features

- **Power sources:** PV / battery / grid → heat pump, animated whenever more than 10 W flow. Taken automatically from your **Energy dashboard** (its power sensors), or from your own sensors.
- **Heat pump:** the fan spins while the compressor runs, faster at higher compressor modulation (or higher power, when the integration has no modulation value); the circuit pumps and the flow lines follow the modulation as well. Shows mode and sub-state, electrical power → heat output, and live COP. Defrost is shown with a snowflake, restrained vapour and an icy flow line. The frame of the block is orange while heating, red for hot water and blue while defrosting or cooling, grey in standby. A long status line wraps into mode and status. A backup / inline heater (`heater`) glows inside the unit while it runs.
- **Unit drawing:** the heat pump block can show simplified, logo-free outdoor units for Lambda, Viessmann, Vaillant, Bosch/Buderus, Panasonic, Saunier Duval and Samsung. Presets select a style where the integration identifies the product family; every style is also available manually. The fan spins, the blades turn blue while running, and each fan gets its own snowflake while defrosting.
- **Heat source:** air (the outdoor temperature is shown under the unit; default), **ground** with a brine loop or **groundwater** with two wells (`source_type`), with source inlet and outlet temperatures and the source flow rate. Optional brine and heating-circuit pressures are normalized to bar and can show warning/critical thresholds with text symbols as well as colour.
- **Diverter valve:** shows DHW or heating; the active circuit is animated.
- **Tanks:** DHW tank and buffer with a top/bottom temperature gradient, optionally refined by a middle sensor (`dhw_middle`, `buffer_middle`; blue = cold, then cyan and orange, red = hot), target, mode, a heat-exchanger coil while charging, and the circulation pump. **Heater rods** (`dhw_heater`, `buffer_heater`) glow orange while on, red at stage 2 or higher.
- **Heating circuits:** up to **six circuits** (`hc_count`), each with a pump and an **underfloor loop**, **panel radiator** or **column radiator** with rising heat waves (`hc_type`, `hc2_type` to `hc6_type`), flow and target, plus a house with room temperature, target and outdoor temperature. Circuits 2 to 6 can show a room temperature and target of their own under their emitter, for houses with one circuit per floor. The heating surface fades from the flow colour to the return colour, so you see the water cooling down.
- **Solar thermal:** with `solar_collector` and `solar_pump` a collector sits on the roof edge of the house and feeds a loop into the DHW tank; the loop runs while the solar pump runs. ViCare preset only, **not yet tested on a real installation**.
- **Heating program:** a chip for eco, night / setback, party and holiday, from the `program` entity or, without one, from the heating circuit mode (e.g. Lambda `ECO`).
- **Flow rates:** shown on the heating-side loop, at the circuit pump (`hc_volume`) and at the source (`source_volume`). Units l/h, l/min and m³/h are converted automatically.
- **Estimated heat output:** without a heat output sensor, the card calculates it from flow rate × spread (≈ marker) and derives the COP from it.
- **Statistics row:** COP heating/DHW today, energy today with PV share, compressor starts, spread, flow rate, plus your own tiles. With `tiles` you pick the tiles, their order and the period (today, yesterday, week, month, year, total) from a **catalog of more than 40 tiles** that the preset fills in: COP per mode and period, electricity, environmental energy and heat, defrost and standby energy, cycles, runtime per start and more. Integrations that only report totals get today, month and so on from Home Assistant's long-term statistics.
- **Status chips:** mode, freely defined badges (e.g. "Boost"), error chip when any error code is ≠ 0.
- **Timeline** (`timeline: true`): a slim strip under the schematic with what the heat pump did over the last 24 hours: heating, hot water, defrost, blocked, standby, from the history of the operating mode. A tap or the arrow keys show start, end and duration of a period. With `timeline_marks: true` every badge (for example a Boost switch) gets a thin lane under the bar that shows when it was on; a list of entities works too.
- **Quick controls** (`controls`): switches and booleans as toggle buttons, buttons and scripts as push buttons, selects, water heater and climate modes as dropdowns, numbers as input fields, directly on the card.
- **Details drawer:** a collapsible section below the statistics with operating hours, total starts, total electricity, environmental energy and heat, the total COP, the **refrigerant circuit** (compressor speed, evaporation, condensation, suction gas, hot gas, liquid line, pressures, expansion valve, superheat, subcooling) and your own values (`details`). Presets fill it where the integration provides the data. Without a delivered-heat counter, total COP can use environmental energy plus electricity.
- **Local diagnostic report:** the document button copies the resolved preset, entity mappings, states, units, errors and controls to the clipboard. Nothing is uploaded automatically.
- **Full screen:** the expand button opens the same live card in a keyboard-accessible overlay; Escape, the close button or the backdrop returns to the dashboard.
- **Languages:** English and German are built in; further languages are welcome as a contribution, see [docs/TRANSLATING.md](docs/TRANSLATING.md). For your own wording or a language of your own, use `texts`; missing labels fall back to English.
- **Card themes:** follow the Home Assistant theme (`auto`), or select the fixed `night` or `contrast` theme per card.
- **Layouts and colours:** `layout: compact` for narrow columns, `layout: wide` puts controls, tiles and details beside the schematic, `layout: wall` adds large type and hides the quick controls until you touch the card (wall tablets). Every colour is a CSS variable (`--hfc-*`) that a theme or card-mod can change.
- **Keyboard and screen readers:** every clickable part is a button you can reach with Tab, move through with the arrow keys and activate with Enter or Space; a focus frame shows where you are, and the parts of the schematic announce their name and value.
- **Optional blocks:** whatever you don't have (buffer, DHW tank, power sources, house) is simply not drawn.
- **UI editor** with grouped entity pickers. **English and German**, following the HA language. Light/dark via your theme. Every element opens the more-info dialog, or runs your own tap, hold or double-tap action (`actions`). `prefers-reduced-motion` is respected.

| Viessmann preset, radiators | Vaillant preset, DHW run | Lambda zero-config, DHW run |
|---|---|---|
| ![](docs/vicare-radiator.png) | ![](docs/vaillant-dhw.png) | ![](docs/zero-config-dhw.png) |

| Details drawer and quick controls | Ground source, two circuits, heater rod | EMS-ESP preset (Buderus) | HeishaMon preset (Panasonic), radiators | Other brand, minimal setup | Dark theme |
|---|---|---|---|---|---|
| ![](docs/details.png) | ![](docs/ground-source.png) | ![](docs/emsesp-heating.png) | ![](docs/heishamon-radiator.png) | ![](docs/other-brand-minimal.png) | ![](docs/dark.png) |

| Live on a real Lambda installation |
|---|
| ![Live view while heating](docs/live-heating.jpg) |

![One card from phone to wall tablet: phone light and dark, compact, wide and wall layout](docs/layouts.png)

### Outdoor-unit style coverage

![Overview of all outdoor-unit schematics and their primary brand coverage](docs/unit-styles.png)

| `unit_style` | Schematic based on | Brands / families covered | Automatic selection |
|---|---|---|---|
| `generic` | Neutral fan symbol | Any air-source heat pump | Fallback without a known style, also `preset: wolf`; ground and groundwater sources show their loop symbol instead |
| `lambda` | Lambda EU-L | Lambda | `preset: lambda` |
| `viessmann` | Viessmann Vitocal 250-A | Viessmann Vitocal | `preset: vicare`, `preset: open3e` |
| `vaillant` | Vaillant aroTHERM plus | Vaillant; default fallback for the shared myPyllant brands | `preset: vaillant` |
| `saunier` | Saunier Duval GeniaAir Mono | Saunier Duval | Manual override because myPyllant does not identify the brand reliably |
| `bosch` | Bosch Compress 5800i/6800i AW | Bosch, Buderus, Junkers, Nefit, Worcester, Sieger, elm.leblanc and iVT through EMS-ESP | `preset: emsesp` |
| `panasonic` | Panasonic Aquarea | Panasonic Aquarea | `preset: heishamon` |
| `samsung` | Samsung EHS Mono HT Quiet | Samsung EHS Mono / Mono HT Quiet | `preset: samsung` |

These are deliberately simplified original drawings without manufacturer logos. Related brands can share an integration even when their enclosures differ; set `unit_style` explicitly whenever the automatic family drawing does not match the installed unit.

| Keyboard focus |
|---|
| ![Focus frame around the hot water tank](docs/keyboard-focus.png) |

## Installation

### HACS (recommended)

1. Open **HACS** in Home Assistant.
2. Search for **Heat Pump Hydraulic Card**. If needed, filter the repository type to **Dashboard**.
3. Open the repository, select **Download**, keep the newest version selected and reload the browser afterwards.

The **Open in HACS** button above opens the repository directly.

#### Custom repository fallback

If the standard HACS entry is not available in your installation, open HACS → ⋮ → **Custom repositories**, add `https://github.com/Sturmi77/heatpump-hydraulic-card` as type **Dashboard**, then install **Heat Pump Hydraulic Card** and reload the browser.

### Upgrading an installation from before the rename

The repository was called `heatpump-flow-card` until version 0.9.3. If you installed the card under that name, HACS keeps its old folder `/config/www/community/heatpump-flow-card/` and does **not** change the dashboard resource by itself. The new files then land next to the old ones, while the resource still loads the old file. You keep running an old version, and the card editor and new options are missing. Do the following once:

1. Open **HACS**, find **Heat Pump Hydraulic Card** (it is listed under the new name, with an old version number) and choose ⋮ → **Remove**. HACS deletes the old folder.
2. Open *Settings → Dashboards → ⋮ → Resources*. Delete every entry whose address contains `heatpump-flow-card`. If you manage resources in YAML, remove the line there.
3. In HACS, search for **Heat Pump Hydraulic Card** again, select **Download** and keep the newest version selected.
4. Check *Settings → Dashboards → ⋮ → Resources*: there must be exactly one entry for the card, `/hacsfiles/heatpump-hydraulic-card/heatpump-hydraulic-card.js`, type **JavaScript module**. If HACS did not add it, add it yourself.
5. Reload the browser with a hard refresh (Ctrl+F5, or clear the cache in the companion app).

Your dashboards need no change: `type: custom:heatpump-flow-card` keeps working, and `type: custom:heatpump-hydraulic-card` is the same card under its own, unique name (see [Other cards with the same name](#other-cards-with-the-same-name)). To check what you are running, open `/hacsfiles/heatpump-hydraulic-card/heatpump-hydraulic-card.js` in the browser and look for `HFC_VERSION` near the top of the file. The version that HACS lists is the installed one, not necessarily the one your browser runs: the browser console line `HEATPUMP-FLOW-CARD x.y.z` and the "Loaded from" line of the card's diagnostic report show what is actually loaded.

If you installed the card manually as `/local/heatpump-flow-card.js`, replace the file by `dist/heatpump-hydraulic-card.js` from the latest release and change the resource address to match.

### Manual
Copy `dist/heatpump-hydraulic-card.js` to `/config/www/` and add `/local/heatpump-hydraulic-card.js` as a JavaScript module under *Settings → Dashboards → Resources*.

### Other cards with the same name
Several cards on GitHub are called "Heatpump Flow Card" and register the same element name, `heatpump-flow-card`. A browser keeps only the first definition, so with two of them installed the one that loads first answers to `type: custom:heatpump-flow-card`, and the other cannot be reached by that name.

This card therefore also registers under its own names, **Heatpump Hydraulic Card**:

```yaml
type: custom:heatpump-hydraulic-card   # instead of custom:heatpump-flow-card
preset: lambda
```

Both types are the same card with the same options. If you only use this card, nothing changes. If another card already owns the generic name, this card says so in the browser console and the card picker lists it as "Heatpump Hydraulic Card"; use that type in your configuration.

## Quick start

### Lambda (lambda_heat_pumps)
```yaml
type: custom:heatpump-flow-card
preset: lambda
```
That's it. The card finds your entities itself, including the 2nd heating stage as backup heater, total starts, energy and heat, and the refrigerant circuit values for the details drawer (`sensor.<prefix>_hp1_…` with legacy naming, or `sensor.hp1_…` with the new naming). If you have several heat pumps or the detection picks the wrong one, set the prefix explicitly (`prefix: eu08l`) or the unit numbers (`index: {hp: 2, hc: 2}`).

PV, battery and grid come from your Energy dashboard automatically, as long as it has power sensors configured (Settings → Dashboards → Energy). If you already have sensors for the heat pump's share of PV, battery and grid, or want a room average, add them yourself; own `pv` / `battery` / `grid` sensors replace the Energy dashboard:
```yaml
type: custom:heatpump-flow-card
preset: lambda
title: Heat pump
entities:
  room: sensor.living_room_temperature
  pv: sensor.heatpump_power_from_pv          # W
  battery: sensor.heatpump_power_from_battery
  grid: sensor.heatpump_power_from_grid
  energy_today: sensor.heatpump_energy_today # kWh
badges:
  - entity: input_boolean.heatpump_boost
    label: Boost
  - entity: binary_sensor.heat_pump_utility_lock
    label: Utility lock
```

Manual power-source sensors use positive values for power flowing **to the heat pump**:

| Key | Positive value means |
|---|---|
| `pv` | supplied by PV |
| `battery` | battery discharging into the house / heat pump |
| `grid` | imported from the grid |

If an inverter reports battery charging as positive, invert it with a template sensor before assigning it:

```yaml
template:
  - sensor:
      - name: Heat pump battery power
        unit_of_measurement: W
        device_class: power
        state_class: measurement
        state: "{{ states('sensor.inverter_battery_power') | float(0) * -1 }}"
```

For automatic detection, each configured Energy-dashboard source needs a power sensor (`stat_rate`), not only a kWh counter. The card and editor name sources that are missing one. If exactly one configured source has no usable live power, its displayed share is the remainder between heat-pump power and the known sources.

### Viessmann Vitocal (ViCare) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: vicare
hc_type: radiator
```
Entities are found through the entity registry (platform `vicare` + translation key), so entity ids and the HA language don't matter. If you have several Viessmann devices, pick one with `device:` (device id, or use the editor).

What you get:
- flow and return of the secondary circuit
- source temperature and flow rate
- DHW tank top and bottom, buffer
- compressor phase, with DHW recognised via "DHW charging"
- compressor running and circulation pump
- COP heating and DHW, energy today, compressor starts
- details: compressor hours and starts, heater rod hours, compressor modulation, inlet/outlet temperatures and pressures, liquid line, subcooling and superheat

ViCare has no live electrical power, so add `power` from a meter if you have one; the heat output is estimated from flow rate × spread. For a Vitocal with a ground source, set `source_type: brine`: the primary circuit supply and return become brine in and out. Circuits 2 and 3 share the same translation keys in ViCare, so map their entities manually (`hc2_flow`, …).

### Viessmann Vitocal (Open3E) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: open3e
hc_type: radiator
```
For the [Open3E Home Assistant integration](https://github.com/MojoOli/open3e-ha), which connects to the Open3E server over MQTT. The server communicates with the Vitocal over CAN. The preset uses the integration's entity-registry translation keys, so entity IDs and the Home Assistant language do not matter. If you have multiple Open3E devices, set `device:` to the Vitocal device ID.

It maps the refrigeration-circuit mode, compressor and diverter valve; system electrical and thermal power; flow and return temperatures; DHW and buffer temperatures; and the first heating circuit, room temperature, and target. Daily COP and energy sensors, compressor and additional-heater counters, and available refrigerant sensors are mapped as well. Open3E's `hot_water` valve state is recognized as DHW operation. Add a power meter if your installation does not expose `power_consumption_system`.

### Vaillant, Saunier Duval, Bulex, Glow-worm, DemirDöküm (myPyllant) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: vaillant
```
The home name prefix is detected from `sensor.<home>_energy_manager_state`.

What you get:
- the energy manager state (standby, heating, DHW, cooling) as the mode
- system flow temperature
- DHW tank and buffer
- circuit 0 flow, setpoint and state
- zone room temperature and target
- device power and heating efficiency
- trouble codes

The Vaillant cloud API has no return temperature and no compressor state, and values update every few minutes. Use `index: {hc: 1, dhw: 1}` for a second circuit or DHW system.

### Bosch, Buderus, Junkers, Nefit, Worcester, Sieger, elm.leblanc, iVT (EMS-ESP) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: emsesp
```
For heat pumps on the EMS bus via the [EMS-ESP](https://github.com/emsesp/EMS-ESP32) gateway with Home Assistant MQTT discovery. The entity ids come from the EMS-ESP short names (`boiler_hpactivity`, `boiler_hptc1`, …), so the EMS-ESP language does not matter for the ids. An instance prefix from the "multiple instances" entity format (e.g. `sensor.ems_esp_boiler_…`) is detected automatically. Compressor activity texts are understood in English and German.

What you get:
- compressor activity (heating, hot water, cooling, defrost) as the mode
- compressor running, 3-way valve, current compressor power
- heat carrier flow and return (TC1/TC0, falling back to the boiler flow and return)
- flow rate PC0
- air inlet (TL2), or brine inlet and outlet for ground source heat pumps (`source_type: brine`)
- auxiliary heater status as the backup heater
- outdoor temperature
- DHW temperature, target and circulation
- mixer circuit 1 flow and pump
- thermostat room temperature and target
- details: compressor operating time and starts, total energy consumed and supplied, compressor speed, refrigerant temperatures (PL1, PH1, TR3, TR5, TR6)

Without a heat output sensor, the heat output is estimated from flow rate × spread. With `hc_count: 2` (up to 6) the mixer and thermostat entities of the further circuits are added; `index: {hc: 2}` starts at circuit 2 instead.

### Panasonic Aquarea (HeishaMon) – confirmed on a real installation; more feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: heishamon
```
For Panasonic Aquarea heat pumps with a [HeishaMon](https://github.com/heishamon/HeishaMon) board and the [heishamon-homeassistant](https://github.com/kamaradclimber/heishamon-homeassistant) integration. Entity ids follow the MQTT topics (`sensor.panasonic_heat_pump_main_main_outlet_temp`, …); a different MQTT prefix is detected automatically.

[Real-installation feedback](https://github.com/heishamon/HeishaMon/discussions/1025#discussioncomment-19174931) confirms that the default MQTT mapping is detected correctly. That installation uses a combined/layered store, which is outside the card's supported topology; its remaining entities were easy to assign manually. This confirms the preset on one real installation, not every Aquarea generation, so additional model reports remain useful.

What you get:
- outlet and inlet temperature
- pump flow (L/min, converted)
- compressor frequency as "running"
- 3-way valve (Room/Tank)
- defrost
- total power consumption and production (heating, hot water and cooling, `sensor.<prefix>_consumption` / `_production` of the integration), giving a live COP; without them the heating power sensors
- outdoor temperature
- DHW temperature and target
- zone 1 water and room temperature; zone 2 becomes heating circuit 2 with `hc_count: 2`. The room temperature is `…_main_z1_temp` when the zone sensor setting is "Internal Thermostat" or "Thermistor"; otherwise `z1_temp` is the zone water temperature and the card uses the remote control sensor `…_main_room_thermostat_temp`
- heating curve shift (`hc_curve_offset`) in the heating mode "compensation curve": the circuit label shows the target with its parts, for example "Target 36 °C (curve 34 °C + 2 K shift)", from the heat request temperature (`number.<prefix>_main_z1_heat_request_temp`, `z2_` for circuit 2). The heating mode is read when the card is built, so reload the dashboard after changing it; in direct mode the entity is the flow target itself and is not used
- internal backup heater
- details: operating hours and counter, heater hours, compressor frequency, discharge temperature, high and low pressure, expansion valve

Notes from real installations:
- The integration reads the Power and the Energy topic of each value, depending on the firmware, so the entity ids contain either `…_heat_power_consumption` or `…_heat_energy_consumption`. The preset accepts both. The schematic prefers the total sensors `sensor.<prefix>_consumption` and `sensor.<prefix>_production`, then `sensor.aquarea_energy_consumption` and `sensor.aquarea_energy_production` (all including hot water); the period tiles use the heating, hot water and cooling sensors.
- `sensor.<prefix>_main_z1_temp` is the zone *water* temperature when the zone sensor setting is "Water Temperature", and reads −128 °C without a room sensor. The preset then prefers `…_main_room_thermostat_temp`; if that value is not a room temperature either, remove it with `entities: {room: null}`.
- Some models report a low pressure of 0.0 permanently; hide it with `entities: {low_pressure: null}`.
- The heating setpoint is the zone target temperature. The outlet target (`main_target_temp`) follows the hot-water target while the 3-way valve is on the tank and is only used when no zone target exists.

S0 kWh meters on the HeishaMon board measure the real electrical power, which is more exact than the value the heat pump reports. The integration creates `sensor.<prefix>_s0_watt_<port>`; which port measures what depends on the wiring, so the preset does not use them. Set them as `power`, as one entity or as a list for several meters (for example heat pump and internal heater):

```yaml
entities:
  power:
    - sensor.panasonic_heat_pump_s0_watt_1
    - sensor.panasonic_heat_pump_s0_watt_2
```

HeishaMon has no "current activity" value: the card shows heating while the compressor runs, hot water when the valve is on "Tank", and defrost from the defrost state. If you use HeishaMon with your own MQTT YAML instead of the integration, map the entities manually (see below).

### Samsung EHS (esphome-samsung-nasa)
```yaml
type: custom:heatpump-flow-card
preset: samsung
```
For Samsung EHS heat pumps (Mono, Split, TDM) with an ESP32 on the F1/F2 (NASA) bus and Beormund's [esphome-samsung-nasa](https://github.com/Beormund/esphome-samsung-nasa) component. The preset is based on its message mapping and builds on top of it: the entity names come from its `example.yaml` and README, plus the names of the installation the preset was tested on (EHS Mono AE050JXYDEH). ESPHome entity ids are `<node>_<name>`, and the names are set in your own YAML, so the node prefix is detected from the 3-way valve together with the error code (`sensor.<node>_3_way_valve`, `sensor.<node>_error_code`). If you named your sensors differently, map those entities manually; the preset fills in the rest.

What you get:
- outlet and return water temperature, flow rate
- compressor status (or the compressor frequency) and defrost
- 3-way valve (`Room (Heating)` / `Tank (DHW)` as a text sensor, or 0/1 as a plain sensor)
- power consumed and produced (last minute), giving a live COP
- outdoor temperature
- DHW tank temperature and target, booster heater in the tank, backup heater
- zone 1 room temperature and target, water law target as the circuit setpoint
- away (outing) mode as the holiday chip
- error code: "No Error" is fine, any other text shows the error chip
- tiles: energy, heat and COP today from the template sensors of `example.yaml`, totals from the NASA counters
- details: total energy consumed and produced, compressor frequency, discharge temperature, expansion valve

Samsung has no "current activity" value: like HeishaMon, the card shows heating while the compressor runs, hot water when the valve is on the tank, and defrost from the defrost sensor. The primary water pump runs for hot water as well, so the heating circuit follows the valve. Some values are not fitted on every unit (no flow sensor, no wattmeter); they stay unknown. Without a wattmeter, add `power` from a meter of your own.

### Vaillant aroTHERM (ebusd) – checked on one real installation; more feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: ebusd
hc_count: 2
```
For Vaillant aroTHERM and aroTHERM plus outdoor units (eBUS circuit `hmu`) read by [ebusd](https://github.com/john30/ebusd) with its Home Assistant MQTT discovery, together with the VWZ hydraulic station (`vwzio`) and a sensoCOMFORT or multiMATIC controller (`ctlv2`, `ctlv3`, `ctls2`). Entity ids follow `<topic prefix>_<circuit>_<message>`, for example `sensor.ebusd_hmu_rundatastatuscode`. Home Assistant may put the device name in front (`sensor.heating_ebusd_hmu_…`); both forms are found. A different topic prefix than `ebusd` is set with `prefix`.

What you get:
- operating state from `RunDataStatuscode` (heating, hot water, cooling, defrost, blocked, frost protection; fault codes show as text)
- flow, return, building-circuit flow rate, air inlet and outdoor temperature
- electrical power and heat output of the outdoor unit, giving a live COP
- compressor speed as "running", diverter valve from the hydraulic station
- DHW temperature and target, heating circuits with flow, target and pump from the controller, zone room temperature and target
- heating-circuit pressure (outdoor unit, else controller)
- details and tiles: compressor hours and starts, heater hours, electricity per mode, environmental energy, evaporation, suction and hot-gas temperature, high pressure, expansion valve, superheat

Notes:
- The controller reports every circuit it knows, inactive ones included, so set `hc_count` yourself.
- The buffer is not mapped: which VR 70 / VR 71 sensor sits in it depends on the hydraulic scheme. Add `buffer_top` (and `buffer_bottom`) under `entities`.
- In a cascade of two outdoor units, ebusd reads only the unit on the bus; power, heat and the counters belong to that unit.
- Older geoTHERM and other units on the `ehp` circuit are not covered yet (#24).

### Kronoterm (Kronoterm integration) – confirmed with the Cloud API, Modbus feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: kronoterm
```
For Kronoterm heat pumps (ADAPT, ETERA, VERSI, WPLV …) with the [Kronoterm](https://github.com/Favio25/Kronoterm-homeassistant) integration, connected through the Kronoterm Cloud API or locally through Modbus. Entities are found through the entity registry (platform `kronoterm` + translation key), so entity ids and the HA language don't matter. With several Kronoterm heat pumps, pick one with `device:`. The hot water heat pumps of the separate Kronoterm DHW cloud are not covered. Details and the full mapping: [docs/presets/kronoterm.md](docs/presets/kronoterm.md).

What you get:
- the working function (heating, hot water, cooling, pool, thermal disinfection, standby, remote deactivation) as the mode, defrost from the defrost status
- the HP load as compressor running and modulation
- flow (HP outlet) and return (HP inlet), outdoor temperature
- electrical power and heat output, giving a live COP
- hot water tank temperature and target: the tank sensor and current setpoint with Modbus, the DHW thermostat with the Cloud API
- the hot water circulator as the diverter valve, the DHW circulation pump, the reserve source as the backup heater
- loops 1 to 4 as heating circuits with their pumps and flow temperatures (`hc_count: 2` and more); room temperature and target from the thermostat of the first circuit
- heating system pressure (the measured pressure needs Kronoterm 1.7.3 or newer with the Cloud API; 1.7.2 and older report the setting of the low-pressure alarm under the same name), the error/warning sensor, ECO mode as the eco chip
- tiles: electricity today in total and per heating, hot water and heater (Cloud API), week, month and year from the electricity counter, COP total from the SCOP, compressor starts for heating and hot water
- details: total electricity, HP load, evaporation and compressor (hot gas) temperature, heater hours

Notes from the reference installation (Hydro S 2 + ADAPT 0312, Cloud API):
- With the Cloud API the hot water temperature exists only on the climate entity "DHW Thermostat". The card reads its `current_temperature` and its target `temperature`.
- The working function keeps reporting heating while the unit defrosts; the defrost status switches the card to defrost. Power and heat output read 0 W during a defrost, so no COP is shown then.
- The heat counter `heating_energy_heating_dhw` is not mapped: it reads a tenth of the heat that the electricity counter and the SCOP imply (4,728 kWh against 13,762 kWh of electricity at an SCOP of 3.43). The total COP therefore comes from the SCOP sensor.
- Loops with a room thermostat report the room temperature as their Cloud loop temperature, so that value is never used as the circuit flow. The loop's inlet temperature is the measured flow into the loop.
- Compressor hours exist per heating and hot water only. Add them to the details if you want them (entity ids as on the reference installation):
  ```yaml
  details:
    - sensor.kronoterm_heat_pump_operating_hours_compressor_heating
    - sensor.kronoterm_heat_pump_operating_hours_compressor_dhw
  ```
- The reservoir has no tank sensor (the Cloud reports a calculated value, Modbus the HP return), so no buffer is drawn.

### Wolf (wolflink, wolf_smartset) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: wolf
```
For Wolf air/water heat pumps such as the CHA monoblock with a WOLF Link home gateway and the core [Wolf SmartSet Service](https://www.home-assistant.io/integrations/wolflink/) integration. Entity ids are `sensor.<device>_<parameter name>`; the device slug is detected from `sensor.<device>_compressor_status`. Wolf gas and oil boilers use the same integration but have no compressor status, so they are not taken for a heat pump. With several Wolf devices, set `prefix:` (the device slug, e.g. `zuhause`) or pick one with `device:`. The parameter names follow the language of the Wolf portal; the preset expects English names. With another language the entity ids differ, so map them manually.

The same preset also serves the custom [Wolf SmartSet (read/write)](https://github.com/tibuntu/homeassistant-wolf-smartset) integration (HACS, `wolf_smartset`, version 0.3.0 or newer). Its entities are found through the entity registry by translation key, so entity ids and the language do not matter, and `prefix:` is not needed. When both integrations are installed, `wolf_smartset` is used. Leave `device:` unset for it: its entities are spread over several Home Assistant devices (heater, operating module, mixer module, the system). Differences: one mixer circuit only, no party or holiday program and no fault code (set `errors` by hand), and the DHW target comes from the adjustable number. Details and the full mapping for both integrations: [docs/presets/wolf.md](docs/presets/wolf.md).

What you get:
- operating mode (heating, hot water, run-on, defrost, standby; cooling and frost protection where the unit reports them) and compressor status
- compressor frequency as "running", compressor capacity (%) for the animation speed
- electrical power (heat pump and electric heater) and heat output in kW, giving a live COP
- heat pump flow and return, flow rate (L/min, converted)
- diverter valve heating / hot water and the electric booster heater
- outdoor temperature, DHW temperature and effective DHW target
- mixer circuit flow, pump and status; room temperature and day target; holiday mode as the program chip
- system pressure, sub fault code as error
- tiles: heat for heating, hot water and cooling (totals, so today, week, month and year come from the long-term statistics), heat yesterday / this month / this year, compressor and heater hours

Not mapped on purpose:
- **Buffer:** the header sensor (`header_temperature`, "Sammler") sits in the buffer on some installations and in a hydraulic separator without a buffer on others. If yours is in the buffer, add it:
  ```yaml
  entities:
    buffer_top: sensor.<device>_header_temperature
  ```
- **Electricity counters and DPF/MPF/SPF:** Wolf reports 0 for them without an energy meter at the heat pump, which would give 0 kWh tiles and no COP. With a meter, add them as free entity tiles (see [Stat tiles](#stat-tiles)).
- **Repeated parameter names** (`…_2`, `…_3`, e.g. `day_temperature_2`, `prog_select_2`): their order is not fixed, so the preset never uses them.

On/off parameters report `ein` / `aus`; the card understands `ein` as on for pumps, heaters and badges. The integration polls the Wolf cloud once a minute, and all its entities can be `unavailable` for a minute or two at a time; the card then shows dashes until the next update.

### Luxtronik (Alpha Innotec, Novelan, Roth …) – untested, feedback welcome
```yaml
type: custom:heatpump-flow-card
preset: luxtronik
source_type: brine   # air (default), brine or water
```
For heat pumps with a Luxtronik controller and the [Luxtronik](https://github.com/BenPru/luxtronik) integration (HACS, platform `luxtronik2`). The integration names these manufacturers as users of the controller:

- Alpha Innotec
- Novelan
- Roth
- Siemens
- Elco
- Buderus
- Nibe
- Wolf Heiztechnik

The controller sits in air, brine and water heat pumps alike, so the card draws the generic fan for air units and the ground or water loop for `source_type: brine` or `water`; there is no manufacturer-specific outdoor-unit drawing yet.
 Entities are found through the entity registry (platform + translation key), so entity ids and the HA language don't matter. The controller does not tell the heat source, so set `source_type` for brine and water heat pumps. Details and the full mapping: [docs/presets/luxtronik.md](docs/presets/luxtronik.md).

What you get:
- the operating status (heating, hot water, defrost, cooling, grid lock, idle) as the mode, the compressor as running
- flow (Vorlauf) and return (Rücklauf), heating flow rate, outdoor temperature, heat source in and out
- electrical power and heat output, giving a live COP: enable "Current power consumption" and "Current heat output" in the integration, both are disabled by default. Not every controller reports them: on an Alpha Innotec WWC 100 H/X the heat output stays 0 and the power value does not exist ([#75](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/75)). In that case use your own electricity meter and drop the heat sensor, so that the card estimates the heat output from flow rate and spread (needs a flow rate from the controller):
  ```yaml
  entities:
    power: sensor.my_heat_pump_power
    heat: none
  ```
- hot water temperature and target, solar collector and pump where installed, the additional heat generator as the backup heater
- mixing circuits 1 to 3 as heating circuits (`hc_count`), only where they report a flow and a target; room unit temperature and target; the heating mode (party, holidays) as the program chip
- refrigerant circuit in the details: hot gas, suction gas, superheat, high and low pressure
- tiles from the kWh counters per use (heating, hot water, cooling), the heat amount, compressor hours and impulses, each as a total with the periods from long-term statistics

Not mapped: the last error (it stays after a reset), the circulation pump (the integration names it ambiguously), the buffer and multifunction storage (not exposed). Add them with `entities` if you want them.

### Any other heat pump
Map your entities and translate your mode states to the card's normalized modes:
```yaml
type: custom:heatpump-flow-card
title: Heat pump
entities:
  mode: sensor.hp_operating_mode
  flow: sensor.hp_flow_temperature
  return: sensor.hp_return_temperature
  power: sensor.hp_power
  dhw_top: sensor.dhw_temperature
  outdoor: sensor.outdoor_temperature
  hc_pump: binary_sensor.heating_circuit_pump
mode_map:
  Heating: heating
  Hot water: dhw
  Defrost: defrost
  Standby: idle
```
Normalized modes: `heating`, `dhw`, `cooling`, `defrost`, `idle`, `blocked`, `frost`, `circulate`, `off` (plus `legionella`, `trailing` for the DHW tank). If your heat pump has a diverter-valve sensor, use `valve` (binary, on = DHW) instead of a DHW mode.

## Configuration

Everything can be set in the **UI editor**. With a preset, the editor shows whether the integration was detected and fills in every entity the preset found ("Found by the preset"). Only your changes are saved: pick another entity to override one, clear a field to hide it (saved as `null`).

| Option | Description |
|---|---|
| `preset` | `lambda`, `vicare`, `vaillant`, `emsesp`, `heishamon`, `wolf`, `kronoterm`, `ebusd`, `open3e`, `luxtronik`, `samsung` or omit. Fills entities, mode maps and error sensors. |
| `prefix` | Preset prefix (Lambda device name, Vaillant home slug, EMS-ESP instance prefix, HeishaMon MQTT prefix, Wolf device slug (`wolflink` only), ebusd topic prefix). Omit for auto-detection, `""` for unprefixed Lambda ids. |
| `device` | Device id: restricts preset detection to one device (several heat pumps of the same brand). |
| `index` | Unit numbers for presets: `{hp, dhw, buffer, hc}` (default 1; Vaillant counts from 0). |
| `hc_type` | Circuit 1: `underfloor` (default), `radiator` (panel radiator) or `column` (column radiator). |
| `hc_count` | Number of heating circuits, 1 (default) to 6. Presets fill the further circuits with the next circuit numbers. The schematic grows by one row per circuit. |
| `hc2_type` to `hc6_type` | Emitter of circuits 2 to 6 (default `underfloor`). |
| `hc_name`, `hc2_name` to `hc6_name` | Circuit titles (default "Heating circuit 1", "Heating circuit 2", …). |
| `hc_return_label` | Show the return temperature of each heating circuit under its return pipe, from `hc_return`, `hc2_return` … (default `false`). Only the circuit's own return sensor is shown; narrow cards hide the label. The prefix `RL` is the text `return_short`. |
| `source_type` | `air` (default), `brine` (ground loop) or `water` (groundwater wells). |
| `title` | Card title (default: "Heat pump" / "Wärmepumpe"). |
| `language` | `auto` (default), `en`, `de`, or a lowercase language code defined in `texts`. |
| `texts` | YAML-only nested language map for custom labels/translations. Missing labels fall back to English; see [Custom texts and languages](#custom-texts-and-languages). |
| `theme` | `auto` (default, follows Home Assistant), `night` or `contrast`. |
| `fullscreen` | Show the full-screen button (default `true`). Set to `false` to hide it. |
| `power_threshold` | Counts as running above this electrical power in W (default 100). |
| `power_sources` | `auto` (default): PV / battery / grid from the Energy dashboard unless `pv`, `battery` or `grid` are set. `manual`: only your own sensors. |
| `entities` | Entity overrides (see below). `null` removes a preset entity. A list of entities for `power`, `heat`, `pv`, `battery` or `grid` shows the sum of their values. |
| `mode_map`, `dhw_mode_map`, `buffer_mode_map`, `hc_mode_map` | Raw state → normalized mode, merged over the preset. |
| `running_states` | Raw `status` values that count as compressor running. |
| `errors` | List of error-code sensors. A number ≠ 0 or state `on` shows the error chip. `unknown`, `unavailable`, `off`, `0` and empty do not. Other text is ignored unless `error_ok` is set. |
| `error_ok` | Text states that mean "no error", for example `["No Error", "OK"]` (case-insensitive). With this list, any other known non-numeric text from an error entity shows the chip. Presets may provide this list. |
| `badges` | `[{entity, label}]` chips shown while the entity is on; each can carry `tap_action`, `hold_action` and `double_tap_action`. |
| `program_map` | Raw state of the program entity → `eco`, `night`, `party`, `holiday` or `none`, merged over the preset. Without an entry the card recognises common words (eco, reduced, setback, absenk…, party, holiday, urlaub …). |
| `compressor_speed_max` | Hz or rpm that count as full speed when `compressor_speed` is not a percentage (default: 100 Hz, 6000 rpm). Sets the pace of the animation. |
| `animations` | `auto` (default, respects reduced motion), `always` or `off`. |
| `flow_speed` | Multiplier for all animation speeds, from `0.2` to `3` (default `1`). |
| `source_spread` | Show `source_in − source_out` on a running ground/groundwater loop (default `true`). |
| `brine_pressure_min`, `brine_pressure_crit`, `brine_pressure_max` | Optional brine-pressure thresholds in bar. Below `crit` is critical; below `min` or above `max` is a warning. |
| `hc_pressure_min`, `hc_pressure_crit`, `hc_pressure_max` | Optional heating-pressure thresholds in bar, with the same warning/critical logic. |
| `unit_style` | Drawing of the outdoor unit: `auto` (default, uses the preset style), `generic`, `lambda`, `viessmann`, `vaillant`, `saunier`, `bosch`, `panasonic` or `samsung`. Ground and groundwater sources keep their loop symbol. See [Outdoor-unit style coverage](#outdoor-unit-style-coverage). |
| `unit_size` | Vaillant aroTHERM plus class: `small` (3.5 and 5.5 kW, one fan, low), `medium` (7.5 kW, one fan, default) or `large` (10.5 and 12.5 kW, two fans). |
| `timeline` | `true` shows a strip with the operating mode of the last hours under the schematic (needs the `mode` entity, or the `compressor` and optionally the `valve`, and the Home Assistant history). |
| `timeline_hours` | Length of the timeline in hours, 3 to 72 (default 24). |
| `timeline_marks` | `true` adds a lane under the timeline for every badge, showing when it was on (for example Boost). A list of entities or `{ entity, label }` entries does the same for other switches, inputs and sensors with an on/off state. Needs the Home Assistant history. |
| `layout` | `default`, `compact` (tighter spacing for narrow columns), `wide` (controls, tiles and details beside the schematic when the card is at least 760 px wide) or `wall` (wide, with large type; the quick controls and the details toggle fade out until the card is touched). |
| `wall_timeout` | Seconds the controls of the `wall` layout stay visible after the last touch or mouse move (default 10, `0` = always visible). |
| `actions` | Tap, hold and double-tap actions per element, keyed by entity key: `{dhw_top: {tap_action: {…}}}`. See [Layout, actions and colours](#layout-actions-and-colours). |
| `controls` | Quick controls: list of entity ids or `{entity, name}`. Supported: `switch`, `input_boolean`, `light`, `fan`, `automation` (toggle), `button`, `input_button`, `script`, `scene` (press), `select`, `input_select`, `water_heater`, `climate` (dropdown), `number`, `input_number` (input). |
| `details` | Extra rows in the details drawer: list of entity ids or `{entity, name, unit, decimals}`. |
| `details_open` | Open the details drawer by default (default `false`). |
| `tiles` | Your own tile selection, in this order: catalog keys with an optional period (`cop_heating`, `cop_heating:month`, `{key, period, name, decimals, unit}`) and free entities (`{entity, name, unit, decimals}`). Every tile can carry `tap_action`, `hold_action` and `double_tap_action`. Without `tiles` the default tiles are shown; `tiles: []` hides the row. See [Stat tiles](#stat-tiles). |
| `price` | Electricity price per kWh for the `cost` tile: a number or an entity (e.g. a dynamic tariff; ct/kWh and per-MWh prices are converted). `currency` overrides the currency from the HA settings. |
| `stats` | Extra tiles `[{entity, name, unit, decimals}]`, added after the default tiles or after `tiles`; also with `tap_action`, `hold_action`, `double_tap_action`. |

**Entity keys:**
- **Heat pump:** `mode`, `status`, `compressor` (binary, or frequency/speed > 0), `defrost` (binary), `power` (W or kW), `heat` (kW or W), `flow`, `return`, `volume`, `source_volume`, `source_in`, `source_out`, `brine_pressure` (bar, kPa, Pa, hPa, MPa or psi), `outdoor`, `valve` (binary, or a state like `Tank`/`DHW`), `heater` (backup / inline heater)
- **Storage:** `dhw_top`, `dhw_middle`, `dhw_bottom`, `dhw_target`, `dhw_mode`, `circulation`, `dhw_heater`, `buffer_top`, `buffer_middle`, `buffer_bottom`, `buffer_mode`, `buffer_heater`, `solar_collector`, `solar_pump` (needs the DHW tank)
- **Heating circuit and house:** `hc_flow`, `hc_return`, `hc_setpoint`, `hc_mode`, `hc_pump`, `hc_volume`, `hc_curve_offset` (shift of the heating curve in K, see HeishaMon; also `hc2_` to `hc6_`), `hc_pressure` (bar, kPa, Pa, hPa, MPa or psi), `room`, `room_target`, `program` (eco, night, party, holiday)
- **Direct systems:** without a buffer and without circuit-specific temperature sensors, circuit 1 uses the heat pump's `flow` and `return` and remains connected in the schematic.
- **Thermostats as temperature sources:** a temperature key also takes a `climate` or `water_heater` entity. The card reads its `current_temperature`, and its target `temperature` for `dhw_target`, `room_target` and the `_setpoint` keys. One DHW thermostat can serve as `dhw_top` and `dhw_target`.
- **Circuits 2 to 6:** the same keys with `hc2_` to `hc6_` (`hc2_flow`, `hc6_pump`, …)
- **Room of circuits 2 to 6:** `hc2_room` to `hc6_room` and `hc2_room_target` to `hc6_room_target`, for example a room sensor of its own on each floor. They appear in the status line under the emitter of their circuit, "Heating · Room 21.4 °C · Target 22.0", as a part of their own that opens the room sensor (or the target without one). Without a room sensor the target stands alone ("Room target 22.0 °C"); where mode and room do not fit side by side (long mode texts, narrow cards), the target is left out. `room` and `room_target` stay the room of circuit 1, shown in the house. Presets do not fill these keys yet.
- **Heaters** (`heater`, `dhw_heater`, `buffer_heater`): binary or on/off, a power value (on above 0) or a stage number (1-3)
- **Power sources (W):** `pv`, `battery`, `grid` – the heat pump's power from each source. Optional: without them the card uses the Energy dashboard.
- **Sums:** `power`, `heat`, `pv`, `battery` and `grid` also accept a list of entities. The card adds the values of the members that report a number (W and kW mixed); the first entity opens on tap and stands for the key in the editor warnings. Example: two meters for compressor and heater rod, `power: [sensor.heat_pump_meter_power, sensor.heater_meter_power]`.
- **Statistics:** `cop_heating_today`, `cop_dhw_today`, `energy_today`, `pv_share_today`, `starts_today`
- **Details, operation:** `hours`, `starts_total`, `aux_hours`, `energy_total`, `env_energy` (heat taken from air, ground or water), `heat_total`
- **Details, refrigerant circuit:** `compressor_speed`, `evap_temp`, `cond_temp`, `suction_temp`, `hot_gas`, `liquid_temp`, `low_pressure`, `high_pressure`, `eev`, `superheat`, `subcooling`
- **Details, cut-out counters:** `cutout_high_pressure`, `cutout_low_pressure`, `cutout_temperature`. These are cumulative **counts of cut-out events** from your integration, not pressures or temperatures. They appear in their own drawer section "Cut-outs (number of events)" as whole numbers with a times sign (for example "3 ×"), separate from the refrigerant circuit values above. No preset fills them yet; map them yourself until entity meaning and units are verified for an integration.

A house with one circuit per floor, each with a room sensor of its own:
```yaml
hc_count: 2
hc_name: Ground floor
hc2_name: Attic
entities:
  room: sensor.living_room_temperature   # circuit 1, shown in the house
  hc2_room: sensor.attic_temperature     # circuit 2, shown under its emitter
  hc2_room_target: sensor.attic_target   # optional
```

### Stat tiles
In the UI editor, switch on **Own tile selection**. The editor then offers only the tiles your installation can fill; drag them to sort. Enter an electricity price (a number or an entity) to get the cost tile. In YAML:

```yaml
price: sensor.epex_spot_price   # or a number, e.g. 0.30
tiles:
  - cop_heating               # without a period: today if possible, else the current value or the total
  - cop_heating:month
  - key: energy
    period: today
  - env_energy:month          # environmental energy from a total counter's long-term statistics
  - starts
  - defrosts:yesterday
  - cost:month                # electricity × price, currency from the HA settings
  - key: energy_heating
    period: month
    tap_action:               # any Home Assistant action; default: more-info
      action: navigate
      navigation_path: /energy
    hold_action:
      action: more-info
  - entity: sensor.my_value   # any entity as a tile
    name: My value
```

**Cost:** with a fixed price, cost = electricity of the period × price. With a price entity that has long-term statistics (`state_class: measurement`, true for most tariff sensors), the card bills every hour at that hour's mean price, from Home Assistant's long-term statistics. The current hour, which is not yet in the statistics, is billed at the current price. For the year the card uses daily values and for the total monthly values, so these are marked **≈**. A price entity without statistics is applied to the whole period at its current price, also marked **≈**. A tile can have its own `price` and `currency`. If your tariff sensor once changed its unit (for example from ct/kWh to €/kWh), its older statistics keep the old values and the cost for longer periods comes out too high. In that case, fix the statistics under Developer tools > Statistics.

**Actions:** a tap opens the more-info dialog of the tile's entity. `tap_action`, `hold_action` (500 ms) and `double_tap_action` accept every Home Assistant action (`more-info`, `navigate`, `url`, `toggle`, `perform-action`, `assist`, `none`, with `confirmation`). Tiles with their own name, entity, price or action are edited in YAML.

Periods: `now`, `today`, `yesterday`, `week`, `month`, `year`, `total`. A tile is only shown when the installation can fill it. Values come from, in this order:
1. the preset's own entity for that period (e.g. Lambda `hp1_heating_cop_monthly`)
2. for the default tiles' entities (`cop_heating_today` …): "today"
3. the change over the period from Home Assistant's **long-term statistics** of a total counter (needs `state_class: total_increasing`, true for most energy counters). This gives EMS-ESP and others "today", "this month" and so on, although they only report totals.
4. computed from other tiles, marked **≈**: COP = heat ÷ electricity, or without heat = (environmental energy + electricity) ÷ electricity; runtime per start = hours ÷ starts.

| Group | Tile keys |
|---|---|
| Efficiency | `cop_live`, `cop_heating`, `cop_dhw`, `cop_cooling`, `cop_total`, `spf` (year) |
| Electricity | `energy`, `energy_heating`, `energy_dhw`, `energy_cooling`, `energy_defrost`, `energy_standby`, `energy_aux` (heater) |
| Environmental energy | `env_energy` |
| Heat | `heat`, `heat_heating`, `heat_dhw`, `heat_cooling`, `heat_defrost` |
| Starts and runtime | `starts`, `cycles_heating`, `cycles_dhw`, `cycles_cooling`, `defrosts`, `hours`, `hours_per_start`, `load_classes`, `aux_hours`, `aux_starts` |
| Live | `spread`, `volume`, `heat_estimated`, `power`, `heat_live`, `compressor_speed`, `source_spread`, `outdoor`, `dhw_top`, `room`, `brine_pressure`, `hc_pressure`, `pv_share` |
| Other | `pv_production`, `solar_thermal` (ViCare), `cost` |

What the presets provide:
- **Lambda:** COP heating/DHW/cooling per day, month, year and in total; electricity and heat per mode including defrost and standby; starts, heating/DHW/cooling cycles and defrosts per day and yesterday.
- **ViCare:** COP and SPF, electricity per day, week, month and year (total, heating, DHW, cooling), compressor hours, starts and load classes, heater rod hours and starts, PV and solar thermal yield.
- **EMS-ESP:** totals for electricity, heat, starts and hours per mode; other periods from long-term statistics.
- **HeishaMon:** heat and electricity per mode as current power, so the COP tiles work for "now"; operating hours and starts.
- **Samsung:** electricity, heat and COP today (template sensors of `example.yaml`) and in total; other periods from long-term statistics.
- **Vaillant:** daily electricity and heat for heating and DHW.
- **Kronoterm:** electricity today in total and per heating, DHW and heater (Cloud API); week, month and year from the electricity counter; COP total from the SCOP; heating, DHW and cooling compressor starts as totals.

### Layout, actions and colours
**Layout.** `layout: compact` reduces padding and type sizes for narrow dashboard columns. `layout: wide` shows the schematic on the left and controls, tiles and the details drawer on the right once the card is at least 760 px wide (below that it falls back to the normal stacked layout), which suits wall tablets. `layout: wall` is the wide layout with about 30 % larger type for reading from a distance. The quick controls and the details toggle are invisible and not clickable until a touch or mouse move wakes the card; after `wall_timeout` seconds (default 10) they fade out again and an open details drawer closes. A control in use, such as an open dropdown, keeps the card awake. All layouts are also in the editor.

**Animations.** `animations: auto` (default) respects the operating system's reduced-motion preference. Use `animations: always` to animate anyway or `animations: off` for a static schematic. `flow_speed` scales all movement from `0.2` to `3` (`1` is the default); sensor-driven fan, pump and flow differences are preserved. Both options are in the editor.

**Full screen.** The expand button opens the existing card instance in an overlay, so it does not duplicate entity subscriptions, history requests or control state. Close it with Escape, the close button or a click outside the card; keyboard focus stays inside the overlay and returns to the expand button afterwards. Set `fullscreen: false` to remove the button. The overlay follows viewport changes and safe areas on phones and tablets.

**Card theme.** `theme: auto` keeps the dashboard's Home Assistant theme and all `--hfc-*` overrides. `theme: night` dims fixed colours for dark rooms. `theme: contrast` uses stronger black/white surfaces, role colours, thicker pipes and more visible focus outlines. These are fixed per-card choices; automatic time- or entity-based switching is deliberately outside this option.

For ground and groundwater sources, the loop shows `ΔT` while the compressor runs when both `source_in` and `source_out` are available. Set `source_spread: false` to hide it; the source-spread tile remains available independently.

**Actions on elements.** Every element of the schematic shows an entity, and a tap opens its more-info dialog. To change that, give the entity key of the element (see "Entity keys") its own actions. They accept every Home Assistant action, the same as the tiles: `more-info`, `navigate`, `url`, `toggle`, `perform-action`, `assist`, `none`, with `confirmation`. A hold takes 500 ms.

```yaml
actions:
  dhw_top:                      # the hot water tank
    tap_action:
      action: navigate
      navigation_path: /lovelace/hot-water
    hold_action:
      action: more-info
  mode:                         # the heat pump block and the mode chip
    double_tap_action:
      action: perform-action
      perform_action: script.heat_pump_boost
badges:
  - entity: input_boolean.boost
    label: Boost
    tap_action:
      action: toggle
```

An action for a key the card has no entity for does nothing; the browser console says so. Actions are edited in YAML.

**Narrow cards.** The type size follows the width of the schematic, not the screen: below about 640 px the labels grow, below about 500 px (phones, narrow columns) they grow further and secondary labels (flow rates, tank bottom temperature, the VL / RL prefixes, valve and circulation labels, the hot water target line) are left out, so the important numbers stay readable. Chip text takes the colour of your theme text, so it reads in light and dark themes.

**Colours.** The card draws with these CSS variables. Set them in a theme or per card with card-mod; without a value the default applies.

| Variable | Default | Used for |
|---|---|---|
| `--hfc-heat` | `#f97316` | running heat pump, heating chip, heater rod, impeller, heat waves |
| `--hfc-hot` | `#dc2626` | hot water chip, error chip, second heater stage |
| `--hfc-cool` | `#38bdf8` | fan blades while running, groundwater |
| `--hfc-cool-strong` | `#0ea5e9` | snowflake, circulation pump |
| `--hfc-defrost` | `#7dd3fc` | flow pipe while defrosting or cooling |
| `--hfc-flow-cold`, `--hfc-flow-hot` | `#fb923c`, `#dc2626` | flow pipes, 25 to 55 °C |
| `--hfc-return-cold`, `--hfc-return-hot` | `#7dd3fc`, `#2563eb` | return pipes, 20 to 45 °C |
| `--hfc-tank-cold`, `--hfc-tank-cool`, `--hfc-tank-warm`, `--hfc-tank-hot` | `#3b82f6`, `#22d3ee`, `#f97316`, `#ef4444` | tank gradient in four steps, 20 to 58 °C |
| `--hfc-anthracite` | `#3b4148` | dark casings: Lambda unit, dark panel of the Vaillant unit |
| `--hfc-casing` | `#e6e9ec` | light casing of the Vaillant unit |
| `--hfc-pv`, `--hfc-battery`, `--hfc-grid` | `#f59e0b`, `#10b981`, `#94a3b8` | power sources and their flow lines |
| `--hfc-good` | `#16a34a` | live COP |
| `--hfc-badge` | `#a855f7` | badge chips |
| `--hfc-brine`, `--hfc-ground` | `#60a5fa`, `#a16207` | brine pipes, ground loop |
| `--hfc-flow-dash` | `rgba(255,255,255,.9)` | the moving dashes in the pipes |

```yaml
type: custom:heatpump-flow-card
preset: lambda
card_mod:
  style: |
    :host {
      --hfc-heat: #14b8a6;
      --hfc-tank-hot: #f43f5e;
    }
```

### Custom texts and languages

The built-in English and German text can be overridden or extended in YAML. Select the language with `language`; every omitted key falls back to English, so a translation can start small:

```yaml
type: custom:heatpump-flow-card
preset: lambda
language: nl
texts:
  nl:
    title: Warmtepomp
    modes:
      heating: Verwarming
    tiles:
      cop_heating: COP verwarming
```

Language codes must be lowercase (`nl`, `pt-br`). Values are treated as plain text and escaped before they are rendered. The stable key tree and placeholder rules are documented in [`docs/TEXTS.md`](docs/TEXTS.md). The visual editor preserves `texts`, but editing the nested map remains YAML-only, and the editor itself stays English or German.

Would you like your language built in for everybody, including the editor? Translations are welcome and can be partial: [docs/TRANSLATING.md](docs/TRANSLATING.md).

### Diagnostic report

The document button in the card header copies a plain-text diagnostic report to the clipboard. It includes the card and Home Assistant versions, language, resolved preset and prefix, layout/source choices, every known entity mapping with its current state and unit, unmapped keys, error sensors and quick controls. It does not include a registry or attribute dump and never sends data anywhere.

Entity ids can still contain room, person or installation names. Read the report and remove anything private before sharing it in an issue. The report is the preferred input for preset testing and bug reports because it shows both detected and missing mappings without requiring screenshots of Developer Tools.

### Keyboard and screen readers
The card works without a mouse or touch screen.
- **Tab** goes through the header chips, then the schematic, the quick controls, the tiles and the details toggle. The schematic, the tiles and the details are one tab stop each: inside them the **arrow keys** move to the next or previous part, **Home** and **End** jump to the first and last. A frame (in the theme's primary colour) marks the focused part.
- **Enter** or **Space** runs the tap action (by default the more-info dialog), **Shift+Enter** runs the hold action and **Alt+Enter** the double-tap action, so `tap_action`, `hold_action` and `double_tap_action` are all reachable from the keyboard.
- Parts of the schematic are buttons with a label made of the entity name and its current value, for example "Flow temperature: 32.4 °C". Parts without a value (empty labels, labels hidden on narrow cards) are skipped.
- The quick controls and the details toggle are ordinary buttons, dropdowns and inputs. With `layout: wall` the controls appear as soon as one of them gets the focus.

## Where the numbers come from
The card shows what your integration provides and does not invent values. Where it has to derive something, this is how:

| Value | Source |
|---|---|
| Temperatures, power, flow rate, daily COP, energy, starts | Read directly from the entities. Units are converted (W/kW, l/h, l/min, m³/h); nothing else is changed. |
| Spread | Flow minus return temperature. |
| Heat output | The heat output entity if there is one. Otherwise **estimated** as flow rate × spread × 1.163 Wh/(l·K) (water) and marked with **≈**. With glycol in the circuit the estimate is slightly too high. |
| Live COP | Heat output ÷ electrical power while the compressor runs. Marked with **≈** when the heat output is estimated. |
| Running | Compressor entity on (or frequency/speed > 0), electrical power above `power_threshold` (default 100 W), or a running status from the preset. |
| Mode | The operating-mode entity, translated by the preset's `mode_map`. An active `defrost` entity shows defrost even when the mode entity keeps reporting heating (e.g. Kronoterm). Without a mode entity (e.g. HeishaMon): compressor off = standby, defrost entity on = defrost, valve on DHW = hot water, otherwise heating. |
| Diverter valve | The valve entity (on, `Tank` or `DHW` = hot water), otherwise the mode. |
| Heating circuit active | Circuit pump, else circuit mode, else "heat pump is heating". |
| PV / battery / grid flows | Your own `pv` / `battery` / `grid` sensors if set. Otherwise **estimated** from the Energy dashboard and marked with **≈**: the heat pump's power is split by the house's current supply mix (PV used in the house, battery discharge, grid import); PV first covers battery charging and export. Needs the power sensors of the Energy dashboard and the heat pump's `power`. A flow is animated above 10 W. |
| Superheat, subcooling | The integration's value if there is one. Otherwise superheat = suction gas − evaporation and subcooling = condensation − liquid line. |
| Environmental energy | The `env_energy` counter is the heat taken from air, ground or water, not the delivered heat. Wh, kWh and MWh are converted. Calendar-period tiles use its long-term-statistics change. |
| COP total | Total heat ÷ total electricity, marked with **≈**. If `heat_total` is missing but `env_energy` exists, delivered heat is taken as environmental energy + electricity. All counters must cover the same time range. If one started later, create Home Assistant helpers that count them from a shared starting point; the card does not guess offsets. |
| Tiles for a period | The integration's own entity for the period, otherwise the change of a total counter over the calendar period from the long-term statistics (refreshed every 5 minutes). A COP for a period without an own entity is heat ÷ electricity, or `(environmental energy + electricity) ÷ electricity` when delivered heat is unavailable, and is marked with **≈**. |
| Cost | Electricity × price. With a dynamic tariff: every hour at its mean price from the long-term statistics, the current hour at the current price; year and total from daily or monthly values (**≈**). |
| Details drawer | Entities that are unknown or unavailable are left out, so values a model does not report do not show up. |
| Heater rods | On for a binary on / "On", for power above 0, or for a stage number above 0; stage 2 or higher is drawn red. |
| Error chip | Any error entity of the preset (or `errors`) with a number ≠ 0 or state `on`. `unknown`, `unavailable`, `off`, `0` and empty are ignored. Set `error_ok` for text sensors; any other known text then counts as an error. |

Each preset section above lists the entities it uses.

![UI editor](docs/editor.jpg)

## Topology
The layout is fixed on purpose: one heat pump (air, brine or groundwater), a diverter valve, an optional DHW tank, an optional buffer and up to six heating circuits (underfloor, panel or column radiators). That covers most single-family installations. Combined/layered storage is not drawn (yet).

## Adding a preset
Presets live in `HFC_PRESETS` in `dist/heatpump-hydraulic-card.js`. A preset consists of:
- `detect(ctx)`, which returns a prefix, or `undefined` when the integration is missing
- `entities(prefix, index, ctx)`, which returns the entity map; values may be candidate lists, and the first existing entity wins
- optional `errors` and `error_ok` for text error sensors
- the mode maps
- `running_states`, `status_labels` and `stat_labels`
- optional `tiles(prefix, index, ctx)`, which returns `{ tile: { period: entity } }` for the stat tile catalog; a `total` counter with long-term statistics also covers today, yesterday, week, month and year

`ctx.key(platform, domain, translation_key)` looks entities up in the entity registry, independent of language and entity ids. `ctx.match(regex, platform)` matches entity ids by pattern.

Pull requests for other brands are very welcome. Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first: documentation of a new preset goes into `docs/presets/`, the changelog entry into `changelog.d/`, and the README stays untouched.

## Feedback
- **Your heat pump works (or not) with a preset?** Please use the [preset feedback form](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/new?template=preset_feedback.yml) – "works" reports help as much as bug reports. Copy the diagnostic report from the document button, review its entity ids for private names, then paste it into the form.
- **Another brand?** Use the same form with "Request a new brand" and paste the reviewed diagnostic report plus any entities the card has not mapped yet.
- **Something broken?** [Bug report](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/new?template=bug_report.yml).
- **Questions, ideas, showing off your setup?** Join the [Home Assistant Community thread](https://community.home-assistant.io/t/card-heatpump-flow-card-animated-hydraulic-schematic-for-heat-pumps-lambda-viessmann-vaillant-bosch-buderus-panasonic/1029598).

## Development
The prioritized bug-first release and feature plan is in [`docs/ROADMAP.md`](docs/ROADMAP.md).

`demo/index.html` renders the card with simulated installations and scenarios (heating, DHW, defrost, standby with error, automatic/night/contrast themes, English/German and example custom Dutch text) without Home Assistant. It is published as the [live demo](https://sturmi77.github.io/heatpump-hydraulic-card/demo/) via GitHub Pages. The simulated installations live in `demo/setups.js`.

Use Node.js 22 or newer. The first setup installs the locked development dependency and both test browsers; `npm run dev` serves the demo at <http://127.0.0.1:4173/demo/>:
```bash
npm ci
npm run browsers:install
npm run dev
```

`test/selftest.html` runs every installation in every scenario, broken entity states, edge-case configs, preset detection (gas boilers must not be detected as heat pumps) and the computed values. `npm run check` runs syntax and release-contract checks plus the self-test in Chromium and Firefox. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for focused and interactive commands and failure diagnostics.

## Deutsch (Kurzfassung)
Animiertes Hydraulikschema für Wärmepumpen mit Luft, Erdreich (Sole) oder Grundwasser als Quelle: Strom aus PV, Akku und Netz (automatisch aus dem Energie-Dashboard oder aus eigenen Sensoren) → Wärmepumpe → Umschaltventil → Warmwasser bzw.
Puffer → Heizkreis.
Voreinstellungen erkennen die Entitäten automatisch für: Lambda; Viessmann (ViCare); Vaillant, Saunier Duval, Bulex, Glow-worm, DemirDöküm (myPyllant); Bosch, Buderus, Junkers, Nefit, Worcester, Sieger, elm.leblanc, iVT (EMS-ESP); Panasonic Aquarea (HeishaMon); Wolf-Wärmepumpen wie CHA (wolflink oder wolf_smartset); Kronoterm (Kronoterm-Integration, Cloud oder Modbus); Vaillant aroTHERM über ebusd; Luxtronik-Regler (Alpha Innotec, Novelan, Roth, Siemens, Elco, Buderus, Nibe, Wolf).
Samsung EHS über esphome-samsung-nasa.
Lambda, HeishaMon und Kronoterm (Cloud-API) sind inzwischen mit echten Anlagen bestätigt; Viessmann, Vaillant, EMS-ESP, Wolf und Luxtronik warten noch auf diesen Praxistest – Rückmeldungen gern über das Preset-Formular mit dem zuvor geprüften Diagnosebericht.
Andere Hersteller werden über `entities` und `mode_map` angebunden.
Schnellbedienung (Schalter, Tasten, Auswahl, Zahlen) und ein aufklappbarer Detailbereich mit Betriebsstunden, Zählern und Kältekreis.
Die Kacheln unter dem Schema lassen sich aus einem Katalog mit über 40 Kennzahlen zusammenstellen (COP, Strom und Wärme je Betriebsart, Abtauungen, Laufzeit pro Start …), jeweils für heute, gestern, Woche, Monat, Jahr oder gesamt; fehlende Zeiträume kommen aus der Langzeitstatistik von Home Assistant.
Eine Kostenkachel rechnet mit festem Preis oder bei dynamischem Tarif stundengenau ab; jede Kachel und jedes Element des Schemas kann eine eigene Tipp-, Halte- oder Doppeltipp-Aktion haben.
Heizprogramme (Eco, Nacht, Party, Urlaub) erscheinen als Chip, die Animation folgt der Verdichterleistung, und eine Solarthermie-Anlage (noch ungetestet) wird als Kollektor am Dach mit Kreis zum Warmwasserspeicher gezeichnet.
Das Außengerät wird als vereinfachte, logofreie Zeichnung für Lambda, Viessmann, Vaillant, Bosch/Buderus, Panasonic, Saunier Duval oder Samsung dargestellt; bekannte Presets wählen die passende Familie automatisch, alle Stile lassen sich manuell auswählen.
Die Karte lässt sich per Tastatur bedienen: Tab, Pfeiltasten im Schema, Enter oder Leertaste für die Aktion (Umschalt+Enter halten, Alt+Enter doppelt tippen), mit sichtbarem Fokusrahmen und Beschriftungen für Screenreader.
Das Layout gibt es kompakt (schmale Spalten), breit (Kacheln neben dem Schema), als Wanddisplay und im Vollbild; die festen Karten-Themes `night` und `contrast` ergänzen das automatische Dashboard-Theme.
Eigene Texte oder Sprachen werden über `texts` ergänzt, fehlende Beschriftungen fallen auf Englisch zurück; weitere eingebaute Sprachen sind als Beitrag willkommen (docs/TRANSLATING.md).
Bis zu drei Heizkreise, jeweils als Flächenheizung oder Heizkörper.
Wärmequelle Luft, Erdreich (Sole) oder Grundwasser; Heizstäbe in Speicher und Puffer sowie ein Zusatzheizer werden angezeigt.
Volumenströme werden angezeigt, die Wärmeleistung wird bei Bedarf daraus berechnet.
Grafischer Editor und Oberfläche auf Deutsch und Englisch.
Ausprobieren ohne Installation: [Live-Demo](https://sturmi77.github.io/heatpump-hydraulic-card/demo/).

## License
MIT © 2026 Sturmi77
