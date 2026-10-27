# Bosch/Buderus Home Comfort

This preset is for the [Bosch/Buderus Home Comfort integration](https://github.com/SoftwareSchmied/ha-bosch-buderus-heating), domain `bosch_buderus_heating`, using the PointT cloud API. It is separate from the EMS-ESP MQTT preset.

```yaml
type: custom:heatpump-hydraulic-card
preset: bosch_buderus_heating
```

The preset selects the Bosch outdoor-unit drawing. Choose `source_type: brine` for a ground-source installation, and adjust the drawing and emitter type to match the installation. The preset does not identify the exact outdoor-unit model.

## Evidence and test status

I maintain the Home Comfort integration. I checked a manual configuration of card version 0.11.0 against live data on my Buderus installation with an MX400 gateway and Home Comfort 0.8.2-beta.7. That check covered the saved mappings and their display. It did not exercise the controls or every operating mode through the card.

I built this preset from that mapping and the integration's [sensor identities and value semantics](https://github.com/SoftwareSchmied/ha-bosch-buderus-heating/blob/fbe84bfb46383722d1a2757e7e778463db67f6f0/custom_components/bosch_buderus_heating/sensor.py). The [resource catalog](https://github.com/SoftwareSchmied/ha-bosch-buderus-heating/blob/fbe84bfb46383722d1a2757e7e778463db67f6f0/custom_components/bosch_buderus_heating/resource_catalog.py) describes the optional circuit measurements. The new automatic preset remains marked **untested on a real installation** until it has its own installation test. The demo and automated tests use invented identifiers and values.

I also ran the original preset resolver against my actual entity registry without using current states or making writes. All 15 existing schematic/detail mappings matched the manual configuration, and its original 17 automatically selected controls belonged to the existing control list. I have since reduced the defaults to the two circuit modes and one-time DHW charge. The earlier comparison verifies the original identity lookup; it is not an installation or control test of this revision.

## Detection and several gateways

Entity names and entity ids can change with language, device renaming or manual edits. The preset resolves the integration's stable `unique_id` resource keys through Home Assistant's local entity registry. It supports both the retained `gateway:` identities and current resource-path identities.

Only this preset requests `config/entity_registry/list`. The card and editor share the request within the same Home Assistant connection. The result is refreshed when the frontend entity registry changes; ordinary state updates do not repeat it. This adds no PointT cloud requests. Gateway identifiers stay in the local resolver and are not written into the card configuration or its diagnostic report.

For state updates, the card and editor share a cache of this integration's enabled entity ids. They check whether those states are present without enumerating every state in Home Assistant. Added or removed entities, renamed entities and changed registry metadata refresh the mappings, including when the number of available entities stays the same.

In the [Home Assistant 2026.10.3 source](https://github.com/home-assistant/core/blob/2026.10.3/homeassistant/components/config/entity_registry.py#L39-L64), the read-only registry list command has no administrator requirement. I have not yet verified this preset in a real non-admin session. If registry access fails, the manual mappings described below remain usable.

When several gateways expose a heat pump, select the gateway's device in the card editor or provide its Home Assistant device id:

```yaml
type: custom:heatpump-hydraulic-card
preset: bosch_buderus_heating
device: YOUR_HOME_ASSISTANT_DEVICE_ID
```

The device selection scopes measurements, counters and controls to one gateway. Without an unambiguous selection the preset leaves automatic mappings empty. If the registry request fails, manual `entities`, `controls` and `details` still work. Reload the page to retry after restoring registry access.

This first preset covers one heat pump per gateway. Cascades with several reported heat sources and `index.hp` values other than 1 require manual mappings because the available compressor status and energy totals describe the gateway as a whole.

## Mapped values

| Card value | Home Comfort resource or stable identity |
|---|---|
| Operating mode | `heatSources:compressor:status` |
| Flow, return, outdoor temperature | `gateway:supply_temperature`, `gateway:return_temperature`, `gateway:outdoor_temperature`, with their resource-path equivalents |
| DHW temperature and target | Selected `dhwCircuits:dhwN:actualTemp` and `currentSetpoint`; retained DHW1 temperature identity supported |
| Circuit flow temperature | Selected `heatingCircuits:hcN:actualSupplyTemperature`, if available |
| Room temperature and target | Selected `heatingCircuits:hcN:roomtemperature` and `currentRoomSetpoint`, if available |
| Heating pressure and modulation | `gateway:system_pressure` and `gateway:modulation`, with resource-path equivalents |
| Compressor starts and runtime | `heatSources:hs1:numberOfStarts:total` and `heatSources:hs1:workingTime:total` |
| Electricity, heat and environmental energy | Retained gateway identities and `heatSources:emon:totalConsumption` component identities |
| Holiday indicator and fault chip | `holiday_active` and `system_fault` binary sensors |

Use `index: {hc: 2, dhw: 2}` to select a different circuit. Set `hc_count` to show further hydraulic circuits; their individual flow readings are mapped when the integration supplies them. The room display and quick controls refer to the circuit selected by `index.hc`; a missing circuit never falls back to HC1. Set the count explicitly because this preset does not infer it from temperature settings.

The statistics catalog receives total electricity and heat for heating/DHW, total auxiliary electricity, environmental energy, compressor starts by operating mode and total runtime. A complete cooling electricity total is used when available. A compressor-only cooling counter stays in Details, since it does not establish total electrical consumption. Calendar-period tiles need the corresponding Home Assistant long-term statistics; cumulative values are never substituted for a daily reading.

Energy counters describe the gateway's complete heating or DHW operation. Selecting `index.hc` or `index.dhw` changes the circuit temperatures and controls; it does not apportion gateway energy totals to that circuit.

General start counts, total system runtime, separate compressor/auxiliary electricity, per-mode runtime and TC3 condenser-outlet water temperature remain additional values in Details. They are distinct from the compressor's total starts/runtime and refrigerant condensing temperature.

## Controls

By default, the preset offers only three controls, when they are available and enabled: the selected heating circuit's operating mode, the selected DHW circuit's operating mode and one-time DHW charge. The duplicate climate/water-heater mode selectors are omitted. No temperature sliders, flow limits, silent mode, auxiliary-heater, season or away controls appear automatically.

The editor can change the selection. To add temperatures or other settings, explicitly select their existing entities or provide a `controls` list. Controls use the available `select`, `number` and `switch` entities, with options, bounds and steps supplied by those entities. A configured list replaces the entire preset list, so include any default controls you want to keep. Custom labels and order are preserved; `controls: []` hides all quick controls. Likewise, `details` replaces the preset's additional values and `details: []` hides them. Rendering or updating the card does not call control services.

## Upstream changes

I list the integration files that define resource identities, state values, control availability, units and labels in `upstream/bosch_buderus_heating.json`. The upstream watcher reports changes to those files for review. The recorded source version is Home Comfort 0.8.2-beta.7; it does not claim an installation test of this preset.

## Deliberate gaps

- A cumulative kWh counter is not an instantaneous W measurement. Without suitable external power and flow sensors, live COP, heat output and a PV/battery/grid split remain unavailable.
- An operating-mode setting does not prove a running circuit pump. The preset does not map those settings as pump signals.
- The auxiliary heater's textual status is shown in Details. It is not mapped to the card's binary/numeric heater-level input.
- `pool` and `pool_heat` remain raw status labels. They do not animate space heating on a schematic without a pool circuit.
- `alarm` stops compressor animation. The separate `system_fault` entity supplies the fault chip.
- Gateway metadata, personal identifiers, event timestamps and holiday dates are not automatically added to the hydraulic display.

## Suggested installation checks

After installing a build containing the preset, compare the resolved mappings with the existing manual card. Check heating, DHW, standby, defrost and any available cooling mode; verify the timeline and fault/holiday indicators. Check renamed entities and device selection if several gateways are present. A control test should be a deliberate, reversible change to the intended circuit, followed by verification in Home Assistant and the manufacturer's app. Report which checks were actually performed.
