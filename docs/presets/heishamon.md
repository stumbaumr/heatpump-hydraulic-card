# HeishaMon preset (Panasonic Aquarea)

Source: [HeishaMon](https://github.com/heishamon/HeishaMon) firmware and the [heishamon-homeassistant](https://github.com/kamaradclimber/heishamon-homeassistant) integration. Entity ids follow the MQTT topics (`sensor.<prefix>_main_main_outlet_temp`, …); the prefix is detected automatically.

## Mapped

- Error chip from TOP44 "Last Error" (`sensor.<prefix>_main_error`). "No error" is no error; an H/F code (H76, F12 …) stays until the error is reset.
- Electricity and heat total (`energy_total`, `heat_total`) from `sensor.aquarea_pump_total_consumption_total` and `sensor.aquarea_pump_total_production_total` (kWh). They also fill the energy, heat and total COP tiles. The tiles per mode get `sensor.aquarea_heat_power_consumed_total`, `…_heat_power_produced_total`, `…_dhw_power_consumed_total`, `…_dhw_power_produced_total` and the cooling totals, so all periods come from the long-term statistics.
- Refrigerant circuit in the details drawer, in heating mode:
  - evaporation (`evap_temp`) from the outdoor heat exchanger pipe, `…_main_outside_pipe_temp`
  - suction gas (`suction_temp`) from the evaporator outlet, `…_main_eva_outlet_temp`
  - liquid line (`liquid_temp`) from the indoor (plate heat exchanger) pipe, `…_main_inside_pipe_temp`
  - the card computes the superheat from suction gas and evaporation
- Heating curve shift (`hc_curve_offset`) from `number.<prefix>_main_z1_heat_request_temp` (`z2_` for circuit 2). Only with the heating mode "compensation curve" (`sensor.<prefix>_main_heating_mode`): there the value shifts the curve by −5 to +5 K. `…_z1_water_target_temp` already contains the shift (both change in the same second), so the card shows "Target 36 °C (curve 34 °C + 2 K shift)" above the circuit flow pipe. In direct mode the number is the flow target itself and is left out. The mode is read when the card is built; reload the dashboard after a change of the heating mode.
- Water pump (`unit_pump: true`): the Aquarea water pump sits in the outdoor unit (monobloc) or the hydro module (split) and also runs for hot water. The card draws it on the flow pipe next to the heat pump block, centred under the flow temperature and over the flow rate, and turns it while `…_main_pump_flow` (TOP1) is above 0. The single zone has no pump of its own; `unit_pump: false` draws the pump in the circuit again.
- Zone water temperature (`hc_flow`) only with a zone sensor. Without one HeishaMon reports about −78 to −128 °C; the preset then leaves `hc_flow` out and the circuit shows the heat pump's flow (direct system). With the heating curve shift the circuit then shows no flow temperature of its own; the heat pump's flow stands at the VL label.

## Deliberately not mapped

- `dhw_heater`: `…_main_dhw_heater_state` (TOP58) and `…_room_heater_state` (TOP59) show if the heater is *permitted*, not if it runs.
- `hc_pump`: `…_main_z1_pump_state` (TOP124) is the zone pump of the zone kit; on a single-zone system without that kit it stays `off` while the heat pump's pump runs.
- `hc_pressure`: `…_main_water_pressure` (TOP115) exists only on K/L series. heishamon-homeassistant 2.12.0 enables it (and the other K/L-series entities TOP116 to TOP118 and the DHW sensor selection) by default when it detects a K/L model; before that it was disabled. The id is taken from the integration source and not checked on a real installation, so it is still not mapped.
- `cond_temp`: no condensation temperature sensor, so the card computes no subcooling.
- `mode`, `status`, `room_target`, cut-outs, daily statistics: no matching value.
- S0 meters (`sensor.<prefix>_s0_watt_<port>`): which port measures what depends on the wiring. Set them as `power` (one entity or a list).

## Evidence

- Real installation: Panasonic WH-MDC05J3E5 (J generation), HeishaMon with S0 meters for heat pump and internal heater, no zone sensor. Diagnostic reports and history in https://github.com/heishamon/HeishaMon/discussions/1025.
- The kWh totals: the integration creates them as `IntegrationSensor` (left Riemann sum, `max_sub_interval` 5 min) from its W sensors, see https://github.com/Sturmi77/heatpump-hydraulic-card/issues/56.
- Refrigerant roles: in heating the outdoor pipe value follows the evaporation temperature, the evaporator outlet is a few kelvin above it, and the indoor pipe is near the flow temperature. A second HeishaMon user found the values plausible in the pull request.

## Known limits

- The kWh totals are not counters of the heat pump. They start when the integration was set up, stop while HeishaMon gets no data, and keep the 200 W steps of the reported power. On the installation above they were about 8 % (electricity) and 13 % (heat) lower than the meters over one year. For measured electricity set `energy_total` to an S0 meter, but only if `heat_total` covers the same time range.
- The refrigerant roles hold only in heating. In defrost and cooling the circuit runs backwards, so the card shows '–' for the three values and the superheat while the defrost entity is on or the mode is defrost or cooling (`heating_roles` in the preset). An entity set in the config keeps its value.
