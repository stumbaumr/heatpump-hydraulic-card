/*
 * Heatpump Flow Card
 * Animated hydraulic schematic for heat pumps (air, ground or groundwater source) in Home Assistant:
 * power sources (PV / battery / grid) → heat pump → diverter valve → DHW tank / buffer → heating circuit.
 * Vendor-neutral core with built-in presets for several brands (list: README preset table).
 *
 * https://github.com/Sturmi77/heatpump-hydraulic-card · MIT License
 */
const HFC_VERSION = '0.12.0';
// Address this file was loaded from: shows at once when a dashboard resource still points to an old file.
const HFC_SCRIPT_URL = (() => {
  try {
    if (document.currentScript?.src) return document.currentScript.src;
    return performance.getEntriesByType('resource').map((r) => r.name).find((n) => /heatpump-(flow|hydraulic)-card[^/?]*\.js/.test(n)) || '';
  } catch (e) { return ''; }
})();

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */
// A preset maps a heat pump integration onto the card:
//   detect(ctx)                → prefix (string, may be '') or undefined when the integration is not present
//   entities(prefix, idx, ctx) → { key: entity_id | [candidates…] }  (first existing candidate wins)
//   errors(prefix, idx, ctx)   → error sensors (numeric ≠ 0 or binary "on" shows the error chip)
//   error_ok                   → text states that mean "no error"; any other known text shows the chip
//   tiles(prefix, idx, ctx)    → { tile: { period: entity_id | [candidates…] } } for the stat tile catalog (HFC_TILES);
//                                a "total" counter with long-term statistics also gives today, yesterday, week, month and year
//   *_mode_map                 → raw state → normalized mode
// ctx.key(platform, domain, translation_key) finds entities via the entity registry (language-independent),
// ctx.match(regex, platform) finds the first entity id matching a pattern, ctx.state(entity_id) reads a current state.
// Wolf: the prefix '' marks the wolf_smartset branch (sensors by translation key), a device slug the wolflink branch (entity ids).
const hfcWolfSensor = (p, ctx) => (p === '' ? (tk) => ctx.key('wolf_smartset', 'sensor', tk) : (name) => `sensor.${p}_${name}`);
const HFC_PRESETS = {
  lambda: {
    name: 'Lambda (lambda_heat_pumps)',
    tested: true,
    unit_style: 'lambda',
    // Legacy naming: sensor.<prefix>_hp1_…; new naming (no prefix): sensor.hp1_…
    detect: (ctx) => {
      const re = new RegExp(`^sensor\\.(?:(.+)_)?hp${ctx.idx.hp}_operating_state$`);
      const id = ctx.match(re, 'lambda_heat_pumps');
      return id === undefined ? undefined : (id.match(re)[1] || '');
    },
    entities: (p, i) => {
      const x = p ? `${p}_` : '';
      const hp = `sensor.${x}hp${i.hp}`;
      const boil = `sensor.${x}boil${i.dhw}`;
      const buff = `sensor.${x}buff${i.buffer}`;
      const hc = `sensor.${x}hc${i.hc}`;
      return {
        mode: `${hp}_operating_state`,
        status: `${hp}_state`,
        power: `${hp}_inverter_power_consumption`,
        heat: `${hp}_actual_heating_capacity`,
        flow: `${hp}_flow_line_temperature`,
        return: `${hp}_return_line_temperature`,
        volume: `${hp}_volume_flow_heat_sink`,
        source_volume: `${hp}_volume_flow_energy_source`,
        source_in: `${hp}_energy_source_inlet_temperature`,
        source_out: `${hp}_energy_source_outlet_temperature`,
        heater: `${hp}_relais_state_2nd_heating_stage`,
        outdoor: `sensor.${x}ambient_temperature_calculated`,
        dhw_top: `${boil}_actual_high_temperature`,
        dhw_bottom: `${boil}_actual_low_temperature`,
        dhw_target: `${boil}_target_high_temperature`,
        dhw_mode: `${boil}_operating_state`,
        circulation: `${boil}_actual_circulation_pump_state`,
        buffer_top: `${buff}_actual_high_temperature`,
        buffer_bottom: `${buff}_actual_low_temperature`,
        buffer_mode: `${buff}_operating_state`,
        hc_flow: `${hc}_flow_line_temperature`,
        hc_return: `${hc}_return_line_temperature`,
        hc_setpoint: `${hc}_flow_line_temperature_setpoint`,
        hc_mode: `${hc}_operating_state`,
        room: `${hc}_room_device_temperature`,
        room_target: `${hc}_target_room_temperature`,
        cop_heating_today: `${hp}_heating_cop_daily`,
        cop_dhw_today: `${hp}_hot_water_cop_daily`,
        starts_today: `${hp}_compressor_start_cycling_daily`,
        starts_total: `${hp}_compressor_start_cycling_total`,
        energy_total: `${hp}_compressor_power_consumption_accumulated`,
        heat_total: `${hp}_compressor_thermal_energy_output_accumulated`,
        compressor_speed: `${hp}_compressor_unit_rating`,
        evap_temp: `${hp}_evaporation_temperature`,
        cond_temp: `${hp}_condensation_temperature`,
        suction_temp: `${hp}_suction_gas_temperature`,
        hot_gas: `${hp}_hot_gas_temperature`,
        subcooling: `${hp}_subcooling_temperature`,
        eev: `${hp}_expansion_valve_opening_angle`,
      };
    },
    tiles: (p, i) => {
      const hp = `sensor.${p ? `${p}_` : ''}hp${i.hp}`;
      const per = (base, periods = { today: 'daily', month: 'monthly', year: 'yearly', total: 'total' }) =>
        Object.fromEntries(Object.entries(periods).map(([k, v]) => [k, `${hp}_${base}_${v}`]));
      const cyc = { today: 'daily', yesterday: 'yesterday', total: 'total' };
      return {
        cop_heating: per('heating_cop'), cop_dhw: per('hot_water_cop'), cop_cooling: per('cooling_cop'),
        energy: { total: `${hp}_compressor_power_consumption_accumulated` }, heat: { total: `${hp}_compressor_thermal_energy_output_accumulated` },
        energy_heating: per('heating_energy'), energy_dhw: per('hot_water_energy'), energy_cooling: per('cooling_energy'),
        energy_defrost: per('defrost_energy'), energy_standby: per('stby_energy'),
        heat_heating: per('heating_thermal_energy'), heat_dhw: per('hot_water_thermal_energy'),
        heat_cooling: per('cooling_thermal_energy'), heat_defrost: per('defrost_thermal_energy'),
        starts: per('compressor_start_cycling', { today: 'daily', yesterday: 'yesterday', month: 'monthly', total: 'total' }),
        cycles_heating: per('heating_cycling', cyc), cycles_dhw: per('hot_water_cycling', cyc),
        cycles_cooling: per('cooling_cycling', cyc), defrosts: per('defrost_cycling', cyc),
      };
    },
    errors: (p, i) => {
      const x = p ? `${p}_` : '';
      return [`sensor.${x}hp${i.hp}_error_number`, `sensor.${x}boil${i.dhw}_error_number`,
        `sensor.${x}buff${i.buffer}_error_number`, `sensor.${x}hc${i.hc}_error_number`, `sensor.${x}ambient_error_number`];
    },
    mode_map: {
      STBY: 'idle', CH: 'heating', DHW: 'dhw', CC: 'cooling', DEFROST: 'defrost',
      'TIME-BLOCK': 'blocked', 'RESTART-BLOCK': 'blocked', 'STBY-FROST': 'frost',
      CIRCULATE: 'circulate', OFF: 'off',
    },
    dhw_mode_map: { STBY: 'idle', DHW: 'dhw', LEGIO: 'legionella', 'TRAILING-STOP': 'trailing', OFF: 'off' },
    buffer_mode_map: { STBY: 'idle', HEATING: 'heating', COOLING: 'cooling', OFF: 'off' },
    hc_mode_map: { HEATING: 'heating', ECO: 'heating', COOLING: 'cooling', STBY: 'idle', OFF: 'off' },
    running_states: ['START COMPRESSOR', 'PRE-REGULATION', 'REGULATION', 'DEFROSTING'],
    status_labels: {
      de: {
        READY: 'bereit', 'START PUMPS': 'Pumpen starten', 'START COMPRESSOR': 'Verdichter startet',
        'PRE-REGULATION': 'Vorregelung', REGULATION: 'Regelung', STOPPING: 'stoppt',
        'RESTART-BLOCK': 'Wiederanlaufsperre', REFERENCE: 'Referenzfahrt', DEFROSTING: 'Abtauen',
      },
      en: {
        READY: 'ready', 'START PUMPS': 'starting pumps', 'START COMPRESSOR': 'starting compressor',
        'PRE-REGULATION': 'pre-regulation', REGULATION: 'regulating', STOPPING: 'stopping',
        'RESTART-BLOCK': 'restart block', REFERENCE: 'reference run', DEFROSTING: 'defrosting',
      },
    },
  },

  // Viessmann Vitocal via the core ViCare integration. Entities are found by translation_key,
  // so entity ids and the HA language do not matter. Restrict to one device with `device:`.
  vicare: {
    name: 'Viessmann (ViCare)',
    unit_style: 'viessmann',
    // Gas boilers also report outside_temperature, so only compressor entities count as a heat pump.
    detect: (ctx) => (ctx.key('vicare', 'binary_sensor', 'compressor') || ctx.key('vicare', 'sensor', 'compressor_phase')
      || ctx.key('vicare', 'sensor', 'compressor_starts') ? '' : undefined),
    entities: (p, i, ctx) => {
      const s = (...tks) => tks.map((tk) => ctx.key('vicare', 'sensor', tk)).filter(Boolean);
      const b = (tk) => ctx.key('vicare', 'binary_sensor', tk);
      return {
        mode: s('compressor_phase'),
        compressor: b('compressor'),
        valve: b('domestic_hot_water_charging'),
        flow: s('secondary_circuit_supply_temperature', 'supply_temperature'),
        return: s('secondary_circuit_return_temperature', 'return_temperature'),
        volume: s('volumetric_flow'),
        source_in: s('primary_circuit_supply_temperature'),
        source_out: s('primary_circuit_return_temperature'),
        outdoor: s('outside_temperature'),
        dhw_top: s('dhw_storage_top_temperature', 'dhw_storage_temperature'),
        dhw_bottom: s('dhw_storage_bottom_temperature'),
        circulation: b('domestic_hot_water_circulation_pump'),
        buffer_top: s('buffer_top_temperature', 'buffer_main_temperature'),
        buffer_bottom: s('buffer_bottom_temperature'),
        hc_pump: b('circulation_pump'),
        cop_heating_today: s('cop_heating'),
        cop_dhw_today: s('cop_dhw'),
        energy_today: s('power_consumption_today'),
        starts_today: s('compressor_starts'),
        hours: s('compressor_hours'),
        aux_hours: s('heating_rod_hours'),
        compressor_speed: s('compressor_modulation'),
        solar_collector: s('collector_temperature'),
        solar_pump: b('solar_pump'),
        suction_temp: s('compressor_inlet_temperature'),
        hot_gas: s('compressor_outlet_temperature'),
        low_pressure: s('compressor_inlet_pressure', 'suction_gas_pressure'),
        high_pressure: s('compressor_outlet_pressure', 'hot_gas_pressure'),
        liquid_temp: s('condenser_liquid_temperature'),
        subcooling: s('condenser_subcooling_temperature'),
        superheat: s('evaporator_overheat_temperature'),
      };
    },
    tiles: (p, i, ctx) => {
      const s = (tk) => ctx.key('vicare', 'sensor', tk);
      const per = (base, periods) => Object.fromEntries(Object.entries(periods).map(([k, v]) => [k, s(`${base}${v}`)]));
      const summary = { today: 'currentday', week: 'lastsevendays', month: 'currentmonth', year: 'currentyear' };
      return {
        cop_heating: { total: s('cop_heating') }, cop_dhw: { total: s('cop_dhw') }, cop_cooling: { total: s('cop_cooling') },
        cop_total: { total: s('cop_total') }, spf: { year: s('spf_total') },
        energy: { today: s('power_consumption_today'), week: s('power_consumption_this_week'), year: s('power_consumption_this_year') },
        energy_heating: { ...per('energy_summary_consumption_heating_', summary), year: [s('energy_summary_consumption_heating_currentyear'), s('energy_consumption_heating_this_year')] },
        energy_dhw: { ...per('energy_dhw_summary_consumption_heating_', summary), year: [s('energy_dhw_summary_consumption_heating_currentyear'), s('energy_consumption_dhw_this_year')] },
        energy_cooling: per('energy_consumption_cooling_', { today: 'today', month: 'this_month', year: 'this_year' }),
        starts: { total: s('compressor_starts') }, hours: { total: s('compressor_hours') },
        ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`load_class${n}`, { total: s(`compressor_hours_loadclass${n}`) }])),
        aux_hours: { total: s('heating_rod_hours') }, aux_starts: { total: s('heating_rod_starts') },
        pv_production: per('photovoltaic_energy_production_', { today: 'today', week: 'this_week', month: 'this_month', year: 'this_year', total: 'total' }),
        solar_thermal: per('solar_power_production_', { today: 'today', week: 'this_week', month: 'this_month', year: 'this_year' }),
      };
    },
    mode_map: {
      heating: 'heating', cooling: 'cooling', defrost: 'defrost', passive_defrost: 'defrost',
      pause: 'idle', ready: 'idle', preparing: 'idle', off: 'off',
    },
    stat_labels: {
      cop_heating_today: { de: 'COP Heizen', en: 'COP heating' },
      cop_dhw_today: { de: 'COP Warmwasser', en: 'COP DHW' },
      starts_today: { de: 'Verdichterstarts', en: 'Compressor starts' },
    },
  },

  // Viessmann Vitocal via the Open3E MQTT integration. The integration exposes stable
  // translation keys; entity ids include the device name and serial number.
  open3e: {
    name: 'Viessmann (Open3E)',
    unit_style: 'viessmann',
    index: { hc: 1 },
    detect: (ctx) => (ctx.key('open3e', 'sensor', 'refrigeration_circuit_mode')
      || ctx.key('open3e', 'binary_sensor', 'heat_pump_compressor_active') ? '' : undefined),
    entities: (p, i, ctx) => {
      const s = (...tks) => tks.map((tk) => ctx.key('open3e', 'sensor', tk)).filter(Boolean);
      const b = (...tks) => tks.map((tk) => ctx.key('open3e', 'binary_sensor', tk)).filter(Boolean);
      return {
        mode: s('refrigeration_circuit_mode'),
        compressor: b('heat_pump_compressor_active'),
        valve: s('four_three_way_valve_position'),
        power: s('power_consumption_system'),
        heat: s('thermal_power'),
        flow: s('flow_temperature'),
        return: s('return_temperature'),
        source_in: s('primary_inlet_temperature'),
        outdoor: s('outside_temperature'),
        brine_pressure: s('water_pressure'),
        dhw_top: s('dhw_buffer_top_temperature', 'domestic_hot_water_temperature'),
        dhw_middle: s('dhw_buffer_mid_temperature'),
        dhw_bottom: s('dhw_buffer_bottom_temperature'),
        dhw_target: s('domestic_hot_water_temperature_setpoint'),
        dhw_mode: s('domestic_hot_water_status'),
        buffer_top: s('heating_buffer_temperature', 'heating_cooling_buffer_temperature'),
        buffer_mode: ctx.key('open3e', 'select', 'buffer_operation_mode'),
        heater: b('additional_heater_active'),
        hc_flow: s(`flow_circuit${i.hc}_temperature`),
        hc_setpoint: s(`flow_circuit_${i.hc}_supply_temp_setpoint`),
        hc_mode: ctx.key('open3e', 'climate', `climate_circuit_${i.hc}`),
        hc_pump: b(`circuit_${i.hc}_pump`),
        room: s(`room${i.hc}_temperature`),
        cop_heating_today: s('cop_heating_today'),
        cop_dhw_today: s('cop_dhw_today'),
        energy_today: s('energy_consumption_total_today'),
        starts_total: s('compressor_starts'),
        hours: s('compressor_operating_hours'),
        compressor_speed: s('compressor_speed_percentage'),
        evap_temp: s('evaporation_vapor_temperature'),
        suction_temp: s('compressor_inlet_temperature'),
        hot_gas: s('compressor_outlet_temperature'),
        low_pressure: s('compressor_inlet_pressure'),
        high_pressure: s('compressor_outlet_pressure'),
        eev: s('expansion_valve1_position'),
      };
    },
    tiles: (p, i, ctx) => {
      const s = (tk) => ctx.key('open3e', 'sensor', tk);
      return {
        cop_heating: { today: s('cop_heating_today') }, cop_dhw: { today: s('cop_dhw_today') },
        cop_cooling: { today: s('cop_cooling_today') }, cop_total: { today: s('cop_total_today') },
        energy: { today: s('energy_consumption_total_today') },
        energy_heating: { today: s('energy_consumption_central_heating_today') },
        energy_dhw: { today: s('energy_consumption_domestic_hot_water_today') },
        energy_cooling: { today: s('energy_consumption_cooling_today') },
        heat_heating: { today: s('thermal_output_today') }, heat_dhw: { today: s('warm_water_output_today') },
        starts: { total: s('compressor_starts') }, hours: { total: s('compressor_operating_hours') },
        aux_hours: { total: s('additional_heater_operating_hours') }, aux_starts: { total: s('additional_heater_starts') },
      };
    },
    mode_map: { off: 'off', shutdown: 'idle', heating: 'heating', cooling: 'cooling', defrost: 'defrost', grid_lock: 'blocked' },
    // domestic_hot_water_status reports idle, active and postrun
    dhw_mode_map: { idle: 'idle', active: 'dhw', postrun: 'idle' },
    buffer_mode_map: { heating: 'heating', cooling: 'cooling' },
    hc_mode_map: { heat: 'heating', cool: 'cooling', off: 'off', auto: 'idle' },
  },

  // Vaillant aroTHERM via myPyllant (HACS). Names are fixed English strings prefixed with the
  // home name, so entity ids follow sensor.<home>_…; indices start at 0 (circuit_0, domestic_hot_water_0).
  vaillant: {
    name: 'Vaillant (myPyllant)',
    index: { hc: 0, dhw: 0 },
    unit_style: 'vaillant',
    detect: (ctx) => {
      const id = ctx.match(/^sensor\.(.+)_energy_manager_state$/, 'mypyllant')
        || ctx.match(/^sensor\.(.+)_system_flow_temperature$/, 'mypyllant');
      return id === undefined ? undefined : id.replace(/^sensor\./, '').replace(/_(energy_manager_state|system_flow_temperature)$/, '');
    },
    entities: (p, i, ctx) => {
      const s = `sensor.${p}`;
      const m = (re) => ctx.match(re, 'mypyllant');
      return {
        mode: `${s}_energy_manager_state`,
        flow: `${s}_system_flow_temperature`,
        outdoor: `${s}_outdoor_temperature`,
        power: m(new RegExp(`^sensor\\.${p}_device_\\d+.*_current_power$`)),
        dhw_top: [`${s}_domestic_hot_water_${i.dhw}_tank_temperature`, `${s}_top_dhw_cylinder_temperature`],
        dhw_bottom: `${s}_bottom_dhw_cylinder_temperature`,
        dhw_target: `${s}_domestic_hot_water_${i.dhw}_setpoint`,
        buffer_top: `${s}_top_central_heating_cylinder_temperature`,
        buffer_bottom: `${s}_bottom_central_heating_cylinder_temperature`,
        hc_flow: `${s}_circuit_${i.hc}_current_flow_temperature`,
        hc_setpoint: `${s}_circuit_${i.hc}_flow_temperature_setpoint`,
        hc_mode: `${s}_circuit_${i.hc}_state`,
        room: m(new RegExp(`^sensor\\.${p}_zone_.+_current_temperature$`)),
        room_target: m(new RegExp(`^sensor\\.${p}_zone_.+_desired_temperature$`)),
        program: m(new RegExp(`^sensor\\.${p}_zone_.+_current_special_function$`)),
        cop_heating_today: m(new RegExp(`^sensor\\.${p}.*_heating_energy_efficiency$`)),
      };
    },
    // Daily energy per device and mode ("Consumed Electrical Energy Heating", "Heat Generated Domestic Hot Water" …).
    tiles: (p, i, ctx) => {
      const d = (suffix) => ctx.match(new RegExp(`^sensor\\.${p}_device_\\d+.*_${suffix}$`), 'mypyllant');
      return {
        energy_heating: { today: d('consumed_electrical_energy_heating') }, energy_dhw: { today: d('consumed_electrical_energy_domestic_hot_water') },
        heat_heating: { today: d('heat_generated_heating') }, heat_dhw: { today: d('heat_generated_domestic_hot_water') },
      };
    },
    errors: (p, i, ctx) => [ctx.match(new RegExp(`^binary_sensor\\.${p}.*_trouble_codes$`), 'mypyllant')].filter(Boolean),
    mode_map: { STANDBY: 'idle', DHW: 'dhw', HEATING: 'heating', COOLING: 'cooling' },
    hc_mode_map: { HEATING: 'heating', COOLING: 'cooling', STANDBY: 'idle' },
    stat_labels: { cop_heating_today: { de: 'Effizienz Heizen', en: 'Heating efficiency' } },
  },

  // Bosch, Buderus, Junkers, Nefit, Worcester and other EMS-bus heat pumps via the EMS-ESP gateway (MQTT discovery).
  // Entity ids come from EMS-ESP short names (boiler_hpactivity, …) and do not depend on the language;
  // the "multiple instances" entity format adds a prefix, which is detected. Enum texts follow the EMS-ESP language.
  emsesp: {
    name: 'EMS-ESP (Bosch, Buderus, Junkers, Nefit …)',
    unit_style: 'bosch',
    source_type: (e, hass) => (/hpbrinein$/.test(e.source_in || '') && hass.states[e.source_in] ? 'brine' : 'air'),
    detect: (ctx) => {
      // Gas boilers have curflowtemp as well; only heat pump entities count.
      const id = ctx.match(/^sensor\.(?:(.+)_)?boiler_(hpactivity|hptc1)$/, 'mqtt');
      return id === undefined ? undefined : (id.match(/^sensor\.(?:(.+)_)?boiler_/)[1] || '');
    },
    entities: (p, i) => {
      const x = p ? `${p}_` : '';
      const b = (k) => [`binary_sensor.${x}boiler_${k}`, `sensor.${x}boiler_${k}`];
      const s = (...ks) => ks.map((k) => `sensor.${x}${k}`);
      const hc = `hc${i.hc}`;
      return {
        mode: s('boiler_hpactivity'),
        compressor: b('hpcompon'),
        valve: b('hp3way'),
        power: s('boiler_hpcurrpower'),
        flow: s('boiler_hptc1', 'boiler_curflowtemp'),
        return: s('boiler_hptc0', 'boiler_rettemp'),
        volume: s('boiler_pc0flow'),
        source_in: s('boiler_hptl2', 'boiler_hpbrinein'),
        source_out: s('boiler_hpbrineout'),
        heater: b('auxheaterstatus').concat(s('boiler_auxheaterlevel')),
        outdoor: s('boiler_outdoortemp', 'thermostat_outdoortemp'),
        dhw_top: s('boiler_dhw_curtemp', 'boiler_wwcurtemp', 'boiler_dhw_storagetemp1'),
        dhw_bottom: s('boiler_dhw_storagetemp2'),
        dhw_target: s('boiler_dhw_seltemp', 'boiler_wwseltemp'),
        circulation: b('dhw_circ').concat(b('wwcirc')),
        hc_pump: [`binary_sensor.${x}mixer_${hc}_pumpstatus`, `sensor.${x}mixer_${hc}_pumpstatus`],
        hc_flow: s(`mixer_${hc}_flowtemphc`, `thermostat_${hc}_targetflowtemp`),
        room: s(`thermostat_${hc}_currtemp`),
        room_target: s(`thermostat_${hc}_seltemp`),
        program: s(`thermostat_${hc}_modetype`),
        hours: s('boiler_uptimecomp', 'boiler_uptimetotal'),
        starts_total: s('boiler_totalcompstarts'),
        energy_total: s('boiler_nrgconstotal'),
        heat_total: s('boiler_nrgsupptotal'),
        compressor_speed: s('boiler_hpcompspd'),
        evap_temp: s('boiler_hppl1'),
        cond_temp: s('boiler_hpph1'),
        suction_temp: s('boiler_hptr5'),
        hot_gas: s('boiler_hptr6'),
        liquid_temp: s('boiler_hptr3'),
      };
    },
    // EMS-ESP only reports totals; today, month … come from their long-term statistics.
    tiles: (p) => {
      const t = (...ks) => ({ total: ks.map((k) => `sensor.${p ? `${p}_` : ''}boiler_${k}`) });
      return {
        energy: t('nrgconstotal', 'metertotal'), energy_heating: t('nrgconscompheating', 'meterheat'), energy_dhw: t('dhw_nrgconscomp', 'dhw_meter'),
        energy_cooling: t('nrgconscompcooling', 'metercool'), energy_aux: t('auxelecheatnrgconstotal', 'metereheat'),
        heat: t('nrgsupptotal'), heat_heating: t('nrgsuppheating'), heat_dhw: t('dhw_nrgsupp'), heat_cooling: t('nrgsuppcooling'),
        starts: t('totalcompstarts'), cycles_heating: t('heatingstarts'), cycles_dhw: t('dhw_startshp'), cycles_cooling: t('coolingstarts'),
        hours: t('uptimetotal', 'uptimecompheating'),
      };
    },
    mode_map: {
      off: 'idle', heating: 'heating', cooling: 'cooling', 'hot water': 'dhw', pool: 'heating', 'pool heating': 'heating',
      defrost: 'defrost', 'compressor alarm': 'off',
      aus: 'idle', heizen: 'heating', kühlen: 'cooling', warmwasser: 'dhw', 'pool beheizen': 'heating', abtauen: 'defrost',
      'alarm kompressor': 'off',
    },
  },

  // Panasonic Aquarea via HeishaMon and the "heishamon-homeassistant" integration (domain aquarea).
  // Entity ids are slugs of the MQTT topics: sensor.<prefix>_main_<topic>, prefix default panasonic_heat_pump.
  heishamon: {
    name: 'Panasonic Aquarea (HeishaMon)',
    tested: true,
    unit_style: 'panasonic',
    // The primary pump sits in the heat pump (outdoor unit of the monobloc, hydro module of the split) and also runs for hot water.
    primary_pump: true,
    auto_circuits: false,
    detect: (ctx) => {
      const id = ctx.match(/^sensor\.(.+)_main_main_outlet_temp$/, 'aquarea');
      return id === undefined ? undefined : id.replace(/^sensor\./, '').replace(/_main_main_outlet_temp$/, '');
    },
    entities: (p, i, ctx) => {
      const m = `${p}_main_`;
      const z = `z${i.hc}`;
      // Z1_Temp is the room temperature only with a room sensor at the zone ("Internal Thermostat", "Thermistor").
      // With "Water Temperature" or "External Thermostat" it is the zone water temperature; then the remote control sensor is the room.
      const zoneRoom = ['Internal Thermostat', 'Thermistor'].includes(ctx.state(`sensor.${m}z1_sensor_settings`));
      // The zone water temperature needs a zone sensor; without one HeishaMon reports about -78 to -128 °C.
      // Then the circuit has no own flow temperature and the card uses the heat pump's flow (direct system).
      const zoneFlow = parseFloat(ctx.state(`sensor.${m}${z}_water_temp`));
      const curve = ctx.state(`sensor.${m}heating_mode`) === 'compensation curve';
      return {
        compressor: `sensor.${m}compressor_freq`,
        // The fan runs on for about a minute after the compressor stops.
        fan_speed: `sensor.${m}fan1_motor_speed`,
        valve: `sensor.${m}threeway_valve_state`,
        defrost: [`binary_sensor.${m}defrosting_state`, `switch.${m}defrosting_state`],
        heater: [`binary_sensor.${m}internal_heater_state`, `sensor.${m}internal_heater_state`],
        // The integration reads Power and Energy topics (firmware dependent), so the id has either spelling.
        // The totals (sensor.<prefix>_consumption / _production) add heating, hot water and cooling;
        // the heating values stay 0 W while the valve is on the tank.
        power: [`sensor.${p}_consumption`, 'sensor.aquarea_energy_consumption', `sensor.${m}heat_power_consumption`, `sensor.${m}heat_energy_consumption`],
        heat: [`sensor.${p}_production`, 'sensor.aquarea_energy_production', `sensor.${m}heat_power_production`, `sensor.${m}heat_energy_production`],
        flow: `sensor.${m}main_outlet_temp`,
        return: `sensor.${m}main_inlet_temp`,
        volume: `sensor.${m}pump_flow`,
        outdoor: `sensor.${m}outside_temp`,
        dhw_top: `sensor.${m}dhw_temp`,
        dhw_target: [`number.${m}dhw_target_temp`, `sensor.${m}dhw_target_temp`],
        hc_flow: zoneFlow > -50 || Number.isNaN(zoneFlow) ? `sensor.${m}${z}_water_temp` : undefined,
        // main_target_temp follows the hot-water target while the valve is on the tank, so the zone target comes first.
        hc_setpoint: [`sensor.${m}${z}_water_target_temp`, i.hc === 1 ? `sensor.${m}main_target_temp` : undefined],
        // With the compensation curve the heat request temperature shifts the curve (-5 to +5 K); in direct mode it is the target itself.
        hc_curve_offset: curve ? [`number.${m}${z}_heat_request_temp`, `sensor.${m}${z}_heat_request_temp`] : undefined,
        room: zoneRoom ? `sensor.${m}z1_temp` : [`sensor.${m}room_thermostat_temp`, `sensor.${m}z1_temp`],
        program: [`sensor.${m}holiday_mode_state`, `switch.${m}holiday_mode_state`],
        hours: `sensor.${m}operations_hours`,
        starts_total: `sensor.${m}operations_counter`,
        aux_hours: `sensor.${m}room_heater_operations_hours`,
        // kWh totals that the integration integrates from its W sensors (left Riemann sum, ids from their names). They are no
        // counters of the heat pump: they start with the integration and stop without data. Long-term statistics give the periods.
        energy_total: 'sensor.aquarea_pump_total_consumption_total',
        heat_total: 'sensor.aquarea_pump_total_production_total',
        compressor_speed: `sensor.${m}compressor_freq`,
        hot_gas: `sensor.${m}discharge_temp`,
        // Refrigerant sensors in heating mode: the outdoor heat exchanger pipe is the evaporator (evaporation temperature),
        // the evaporator outlet is the suction gas, the indoor (plate heat exchanger) pipe is the liquid line.
        evap_temp: `sensor.${m}outside_pipe_temp`,
        suction_temp: `sensor.${m}eva_outlet_temp`,
        liquid_temp: `sensor.${m}inside_pipe_temp`,
        high_pressure: `sensor.${m}high_pressure`,
        low_pressure: `sensor.${m}low_pressure`,
        eev: `sensor.${m}expansion_valve`,
      };
    },
    // The pipe sensors above have these roles only in heating: in defrost and cooling the circuit runs backwards.
    heating_roles: ['evap_temp', 'suction_temp', 'liquid_temp'],
    // TOP44 "Last Error": "No error", or an H/F code (H76, F12 …) until the error is reset.
    errors: (p) => [`sensor.${p}_main_error`],
    error_ok: ['No error'],
    // Holiday mode reports Off / Scheduled / Active as a sensor, or on / off as a switch.
    program_map: { Active: 'holiday', Scheduled: 'none', Off: 'none', on: 'holiday' },
    // Heat and electricity per mode as current power ("now") and as the integration's kWh counters ("total" and, from the
    // long-term statistics, today … year). The counter ids come from the names of the power sensors plus " Total".
    tiles: (p) => {
      const m = `sensor.${p}_main_`;
      const both = (topic) => [`${m}${topic}_power_`, `${m}${topic}_energy_`];
      const now = (topic, kind, total) => ({ now: both(topic).map((x) => x + kind), total: `sensor.aquarea_${total}_total` });
      return {
        energy_heating: now('heat', 'consumption', 'heat_power_consumed'), heat_heating: now('heat', 'production', 'heat_power_produced'),
        energy_dhw: now('dhw', 'consumption', 'dhw_power_consumed'), heat_dhw: now('dhw', 'production', 'dhw_power_produced'),
        energy_cooling: now('cool', 'consumption', 'thermal_cooling_power_consumption'),
        heat_cooling: now('cool', 'production', 'thermal_cooling_power_production'),
        starts: { total: `${m}operations_counter` }, hours: { total: `${m}operations_hours` },
        aux_hours: { total: `${m}room_heater_operations_hours` },
      };
    },
  },

  // Wolf heat pumps (CHA …) via the core wolflink integration or the custom wolf_smartset integration (both WOLF Link home and
  // the SmartSet cloud). wolflink: entity ids sensor.<device>_<parameter name> in the SmartSet language (English expected here),
  // list states as German texts or slugs (Abtaubetrieb, heizbetrieb, at_abschaltung); names that repeat get _2, _3 in no fixed
  // order and are not used. wolf_smartset: entities found by translation_key (the wolflink suffixes), list states as Wolf's
  // German texts (Heizbetrieb, AT Abschaltung, Ein). The prefix tells the branches apart: '' is wolf_smartset, a slug is wolflink.
  // wolf_smartset spreads its entities over several HA devices (Heizgerät, Bedienmodul BM-2, Mischermodul MM1, the system), so the
  // `device` option, which limits every registry lookup to one device, must stay unset for it.
  wolf: {
    name: 'Wolf (wolflink, wolf_smartset)',
    // Both integrations also serve gas and oil boilers; only heat pumps report a compressor status (Verdichterstatus).
    // wolf_smartset wins when both are installed (its README asks to disable wolflink for the same account anyway).
    detect: (ctx) => {
      if (ctx.key('wolf_smartset', 'sensor', 'compressor_status')) return '';
      const id = ctx.match(/^sensor\.(.+)_compressor_status$/, 'wolflink');
      return id === undefined ? undefined : id.replace(/^sensor\./, '').replace(/_compressor_status$/, '');
    },
    entities: (p, i, ctx) => {
      const sm = p === '';
      const s = hfcWolfSensor(p, ctx);
      // One mixer circuit only (neither the wolflink names nor the wolf_smartset keys carry a circuit number): further circuits map nothing.
      const hc = (v) => (i.hc === 1 ? v : undefined);
      return {
        mode: s('operating_mode_heater'),
        status: s('compressor_status'),
        compressor: s('compressor_frequency'),
        compressor_speed: s('current_capacity_specification_compressor'),
        power: s('power_consumption_wp_ehz'),
        heat: s('current_secondary_power'),
        flow: s('boiler_water_temperature'),
        return: s('return_temperature'),
        volume: s('hc_flow_rate'),
        outdoor: s('outside_temperature'),
        valve: s('3_way_diverter_valve_htg_dhw'),
        heater: s('electric_booster_heater'),
        dhw_top: s('dhw_temperature'),
        // wolf_smartset binds set_dhw_temperature_adjusted to the read-only "Warmwassersolltemperatur" (10 °C on the reference
        // installation) and the setting "Warmwassersolltemperatur eingestellt" to the number set_dhw_temperature, the reverse of wolflink.
        dhw_target: sm ? [ctx.key('wolf_smartset', 'number', 'set_dhw_temperature'), s('set_dhw_temperature_adjusted')] : s('set_dhw_temperature_adjusted'),
        hc_flow: hc(s('flow_temperature')),
        // In wolf_smartset "Ausgang MKP" duplicates "Mischerkreispumpe" and starts disabled, so the pump of the system tab comes first.
        hc_pump: hc(sm ? [s('mixer_circuit_pump'), s('mkp_mixer_circuit_pump')] : s('mkp_mixer_circuit_pump')),
        hc_mode: hc(s('mixer_circuit_status')),
        hc_pressure: s('system_pressure'),
        room: s('room_temperature'),
        room_target: sm ? ctx.key('wolf_smartset', 'number', 'day_temperature_mixer_circuit_1') : s('day_temperature'),
        // wolf_smartset has no party or holiday parameter yet.
        program: sm ? undefined : s('holiday_mode'),
        hours: s('compressor_operating_hours'),
        aux_hours: s('e_heating_operating_hours'),
      };
    },
    // Heat counters only: the electricity counters stay 0 without an energy meter at the heat pump, which would give empty COP tiles.
    tiles: (p, i, ctx) => {
      const s = hfcWolfSensor(p, ctx);
      return {
        heat: { yesterday: s('heat_generated_previous_day'), month: s('heat_generated_current_month'), year: s('heat_generated_current_year') },
        heat_heating: { total: s('energy_amount_htg') }, heat_dhw: { total: s('energy_amount_dhw') }, heat_cooling: { total: s('clg_energy_amount') },
        hours: { total: s('compressor_operating_hours') }, aux_hours: { total: s('e_heating_operating_hours') },
      };
    },
    // wolf_smartset has no fault code: none in its translation keys, none in the Wolf heat pump description. Configure `errors` by hand there.
    errors: (p) => (p === '' ? [] : [`sensor.${p}_sub_fault_code`]),
    // "Betriebsart Heizgerät" list items (wolf-comm parameter example for heat pumps). wolflink reports some as slugs, wolf_smartset
    // reports Wolf's texts (Heizbetrieb); the lookup is case-insensitive, so one entry serves both.
    mode_map: {
      heizbetrieb: 'heating', warmwasser: 'dhw', 'WW-Nachlauf': 'circulate', 'HZ-Nachlauf': 'circulate', Abtaubetrieb: 'defrost', standby: 'idle',
      'Aktive Kühlung': 'cooling', 'Nachlauf K': 'circulate', 'Frostschutz HK': 'frost', 'Frostschutz Warmwasser': 'frost',
      antilegionellenfunktion: 'dhw', Pool: 'heating',
    },
    // "Mischerkreis Status" list items. wolflink slugifies the four AT/RT states (at_abschaltung); wolf_smartset reports Wolf's text
    // with a space (AT Abschaltung), which lower-casing cannot bridge, so both spellings are listed.
    hc_mode_map: {
      aus: 'off', heizbetrieb: 'heating', absenkbetrieb: 'heating', eco: 'heating', absenkstop: 'heating', Kühlbetrieb: 'cooling',
      at_abschaltung: 'off', rt_abschaltung: 'off', at_frostschutz: 'frost', rt_frostschutz: 'frost', warmwasservorrang: 'idle',
      'AT Abschaltung': 'off', 'RT Abschaltung': 'off', 'AT Frostschutz': 'frost', 'RT Frostschutz': 'frost',
    },
    program_map: { aktiviert: 'holiday', deaktiviert: 'none' },
    running_states: ['Betrieb'],
    // Keys are the raw status texts: wolflink slugs (vorspulen) and wolf_smartset texts (Vorspülen).
    status_labels: {
      de: { vorspulen: 'Vorspülen', nachspulen: 'Nachspülen', Vorspülen: 'Vorspülen', Nachspülen: 'Nachspülen', Sperrzeit: 'Sperrzeit', 'EVU Sperre': 'EVU-Sperre' },
      en: { vorspulen: 'pre-flush', nachspulen: 'post-flush', Vorspülen: 'pre-flush', Nachspülen: 'post-flush', Sperrzeit: 'blocking time', 'EVU Sperre': 'utility lock' },
    },
  },

  // Kronoterm (ADAPT, ETERA, VERSI, WPLV …) via the "Kronoterm" integration (HACS), Cloud API or Modbus. Entities are
  // found by translation_key, so entity ids and the HA language do not matter. Cloud and Modbus name the circuit
  // temperatures differently (loop_1_inlet_temperature, loop_1_temp); both spellings are candidates.
  kronoterm: {
    name: 'Kronoterm',
    tested: true,
    // The hot water heat pumps of the Kronoterm DHW cloud have neither, so only heating heat pumps are detected.
    detect: (ctx) => (ctx.key('kronoterm', 'sensor', 'working_function') || ctx.key('kronoterm', 'sensor', 'hp_outlet_temperature') ? '' : undefined),
    entities: (p, i, ctx) => {
      const s = (...tks) => tks.map((tk) => ctx.key('kronoterm', 'sensor', tk)).filter(Boolean);
      const b = (tk) => ctx.key('kronoterm', 'binary_sensor', tk);
      const c = (tk) => ctx.key('kronoterm', 'climate', tk);
      const n = i.hc;
      // With a room thermostat the Cloud reports the room temperature as loop_<n>_temperature, without one the loop water.
      const thermostat = s(`loop_${n}_thermostat_temperature`);
      return {
        mode: s('working_function'),
        // HP load in %: above 0 while the compressor runs, also while it defrosts (power and heat output then read 0).
        compressor: s('hp_load'),
        defrost: b('defrost_status'),
        // Bit 1 of register 2028, the hot water circulator: on exactly while the tank is charged.
        valve: b('dhw_circulation_pump'),
        power: s('current_heating_cooling_power'),
        heat: s('current_heating_cooling_capacity'),
        flow: s('hp_outlet_temperature'),
        return: s('hp_inlet_temperature'),
        outdoor: s('temperature_outside'),
        heater: b('reserve_source_status'),
        // The Cloud has the tank temperature only as the current temperature of the DHW thermostat (climate).
        dhw_top: [...s('dhw_temperature'), c('dhw_temperature')],
        dhw_target: [...s('dhw_current_setpoint'), c('dhw_temperature')],
        circulation: b('circulation_pump'),
        hc_flow: [...s(`loop_${n}_inlet_temperature`, `loop_${n}_temp`), ...(thermostat.length ? [] : s(`loop_${n}_temperature`))],
        hc_pump: b(`circulation_loop_${n}`),
        hc_pressure: s('heating_system_pressure'),
        room: thermostat,
        room_target: thermostat.length ? [...s(`loop_${n}_room_current_setpoint`), c(`loop_${n}_temperature`)] : undefined,
        program: [ctx.key('kronoterm', 'select', 'operational_mode'), ...s('operation_program')],
        energy_today: s('energy_combined'),
        aux_hours: s('operating_hours_additional_source_1'),
        energy_total: s('electrical_energy_heating_dhw'),
        compressor_speed: s('hp_load'),
        evap_temp: s('temperature_compressor_inlet'),
        hot_gas: s('temperature_compressor_outlet'),
      };
    },
    // Today's electricity per use from the Cloud; compressor starts per use and the SCOP as totals.
    tiles: (p, i, ctx) => {
      const s = (tk) => ctx.key('kronoterm', 'sensor', tk);
      return {
        energy_heating: { today: s('energy_heating') }, energy_dhw: { today: s('energy_dhw') }, energy_aux: { today: s('energy_heater') },
        cop_total: { total: s('scop_value') },
        cycles_heating: { total: s('compressor_activations_heating') }, cycles_dhw: { total: s('activations_boiler') },
        cycles_cooling: { total: s('compressor_activations_cooling') },
        aux_hours: { total: s('operating_hours_additional_source_1') },
      };
    },
    errors: (p, i, ctx) => [ctx.key('kronoterm', 'sensor', 'error_warning')].filter(Boolean),
    // Cloud: no_error, warning, error. Modbus: no_error, warning, alarm, notice.
    error_ok: ['no_error', 'notice'],
    mode_map: {
      heating: 'heating', dhw: 'dhw', cooling: 'cooling', pool_heating: 'heating', thermal_disinfection: 'dhw',
      standby: 'idle', start: 'heating', remote_deactivation: 'blocked', protection: 'blocked',
    },
  },

  // Heat pumps with a Luxtronik controller (Alpha Innotec, Novelan, Roth, Siemens, Elco, Buderus, Nibe, Wolf) through the
  // "Luxtronik" integration (BenPru/luxtronik, HACS, domain luxtronik2). Built from the integration source, not tested on an
  // installation: the SensorKey values are the translation keys, so entity ids and the HA language do not matter. Flow (Vorlauf,
  // TVL) is flow_in_temperature and return (Rücklauf, TRL) is flow_out_temperature, "in" and "out" as seen from the heating system.
  // The mixing circuits 1 to 3 are circuits 1 to 3 of the card, but only where they report a flow and a target; without a mixing
  // circuit the card draws the heat pump flow as the circuit flow. The last error (error_reason) stays after a reset and the
  // buffer is not exposed, so neither is mapped.
  luxtronik: {
    name: 'Luxtronik (Alpha Innotec, Novelan, Roth …)',
    auto_circuits: false,
    detect: (ctx) => (ctx.key('luxtronik2', 'sensor', 'status') || ctx.key('luxtronik2', 'sensor', 'flow_in_temperature') ? '' : undefined),
    entities: (p, i, ctx) => {
      const s = (tk) => ctx.key('luxtronik2', 'sensor', tk);
      const b = (tk) => ctx.key('luxtronik2', 'binary_sensor', tk);
      const n = i.hc;
      // A mixing circuit that is not installed still has its sensors; it counts when flow and target are plain numbers.
      const mixFlow = n <= 3 ? s(`flow_in_circuit${n}_temperature`) : undefined;
      const mixTarget = n <= 3 ? s(`flow_in_circuit${n}_target_temperature`) : undefined;
      const mixer = Number.isFinite(parseFloat(ctx.state(mixFlow))) && parseFloat(ctx.state(mixTarget)) >= 10;
      return {
        mode: s('status'),
        compressor: b('compressor'),
        // Both are disabled in the integration by default: enable "Current power consumption" and "Current heat output".
        power: s('current_power_consumption'),
        heat: s('current_heat_output'),
        flow: s('flow_in_temperature'),
        return: s('flow_out_temperature'),
        volume: s('heat_amount_flow_rate'),
        source_volume: s('heat_source_flow_rate'),
        source_in: s('heat_source_input_temperature'),
        source_out: s('heat_source_output_temperature'),
        outdoor: s('outdoor_temperature'),
        heater: b('additional_heat_generator'),
        dhw_top: s('dhw_temperature'),
        dhw_target: ctx.key('luxtronik2', 'number', 'dhw_target_temperature'),
        solar_collector: s('solar_collector_temperature'),
        solar_pump: b('solar_pump'),
        hc_flow: mixer ? mixFlow : undefined,
        hc_setpoint: mixer ? mixTarget : undefined,
        hc_pump: n === 1 ? b('circulation_pump_heating') : undefined,
        room: n === 1 ? s('room_thermostat_temperature') : undefined,
        room_target: n === 1 ? s('room_thermostat_temperature_target') : undefined,
        program: ctx.key('luxtronik2', 'select', 'heating_mode'),
        hours: [s('compressor1_operation_hours'), s('operation_hours')],
        starts_total: s('compressor1_impulses'),
        aux_hours: s('additional_heat_generator_operation_hours'),
        heat_total: s('heat_amount_counter'),
        hot_gas: s('hot_gas_temperature'),
        suction_temp: s('suction_compressor_temperature'),
        superheat: s('overheating_temperature'),
        high_pressure: s('high_pressure'),
        low_pressure: s('low_pressure'),
      };
    },
    // The kWh counters per use (P1136 to P1139 and the heat amounts) exist on newer firmware only; each tile appears where its counter does.
    tiles: (p, i, ctx) => {
      const s = (tk) => ctx.key('luxtronik2', 'sensor', tk);
      return {
        energy_heating: { total: s('heat_energy_input') }, energy_dhw: { total: s('dhw_energy_input') }, energy_cooling: { total: s('cooling_energy_input') },
        energy_aux: { total: s('additional_heat_generator_energy') },
        heat: { total: s('heat_amount_counter') }, heat_heating: { total: s('heat_amount_heating') }, heat_dhw: { total: s('dhw_heat_amount') },
        heat_cooling: { total: s('cooling_heat_amount') },
        hours: { total: [s('compressor1_operation_hours'), s('operation_hours')] }, aux_hours: { total: s('additional_heat_generator_operation_hours') },
        starts: { total: s('compressor1_impulses') },
      };
    },
    // Status values (LuxOperationMode); the pool and solar mode and an external heat source count as heating.
    mode_map: {
      heating: 'heating', hot_water: 'dhw', swimming_pool_solar: 'heating', heating_external_source: 'heating', cooling: 'cooling',
      defrost: 'defrost', evu: 'blocked', no_request: 'idle',
    },
    // Heating mode select (LuxMode).
    program_map: { Automatic: 'none', Off: 'none', 'Second heatsource': 'none', Party: 'party', Holidays: 'holiday' },
  },

  // Vaillant aroTHERM / aroTHERM plus (HMU) on the eBUS via ebusd and its Home Assistant MQTT discovery.
  // Entity ids are <topic prefix>_<circuit>_<message>[_<field>]; Home Assistant may put the device name in front
  // (sensor.heating_ebusd_hmu_…), so every lookup accepts a leading part. Circuits: hmu (outdoor unit), vwzio (hydraulic
  // station), ctlv2 / ctlv3 / ctls2 (sensoCOMFORT / multiMATIC, one message set). The buffer is not mapped: which VR 70/71
  // sensor sits in it depends on the hydraulic scheme. Status texts from RunDataStatuscode in ebusd-configuration.
  ebusd: {
    name: 'ebusd (Vaillant aroTHERM, HMU)',
    unit_style: 'vaillant',
    // The controller reports all its circuits, inactive ones included, so the editor stub cannot count them.
    auto_circuits: false,
    detect: (ctx) => {
      const id = ctx.match(/^sensor\.(?:.+_)?[a-z0-9]+_hmu_rundatastatuscode$/, 'mqtt');
      return id === undefined ? undefined : id.match(/([a-z0-9]+)_hmu_rundatastatuscode$/)[1];
    },
    entities: (p, i, ctx) => {
      const x = p.replace(/[^a-z0-9_]/g, '');
      const e = (circuit, name) => ctx.match(new RegExp(`^sensor\\.(?:.+_)?${x}_${circuit}_${name}$`), 'mqtt');
      const h = (n) => e('hmu', n); const c = (n) => e('ctl[sv]\\d', n); const w = (n) => e('vwzio', n);
      return {
        mode: h('rundatastatuscode'),
        compressor: h('rundatacompressorspeed'),
        valve: w('statusdhw_dhwactive'),
        power: h('currentconsumedpower'),
        heat: h('currentyieldpower'),
        flow: h('rundataflowtemp'),
        return: h('rundatareturntemp'),
        volume: h('buildingcircuitflow'),
        source_in: h('rundataairinlettemp'),
        outdoor: [e('broadcast', 'outsidetemp'), c('displayedoutsidetemp')],
        dhw_top: [c('hwcstoragetemp'), w('statusdhw_hwcstoragetemp')],
        dhw_target: c('hwctempdesired'),
        hc_flow: c(`hc${i.hc}flowtemp`),
        hc_setpoint: c(`hc${i.hc}actualflowtempdesired`),
        hc_pump: c(`hc${i.hc}pumpstatus`),
        // One system pressure: only for the first circuit, the further ones would copy it as hc2_pressure …
        hc_pressure: i.hc === 1 ? [h('flowpressure'), c('waterpressure')] : undefined,
        room: c(`z${i.hc}roomtemp`),
        room_target: c(`z${i.hc}actualroomtempdesired`),
        hours: h('runstatscompressorhours'),
        starts_total: h('runstatscompressorstarts'),
        aux_hours: w('immersionheaterhours'),
        energy_total: h('statelectricenergysum'),
        env_energy: h('statenvironmentenergysum'),
        compressor_speed: h('rundatacompressorspeed'),
        evap_temp: h('rundataevaporationtemp'),
        suction_temp: h('rundatacompressorinlettemp'),
        hot_gas: h('rundatacompressoroutlettemp'),
        high_pressure: h('rundatahighpressure'),
        eev: h('rundataeevpositionabs'),
        superheat: h('rundataoverheatingactualvalue'),
      };
    },
    // Lifetime counters per mode; today, month … come from their long-term statistics.
    tiles: (p, i, ctx) => {
      const x = p.replace(/[^a-z0-9_]/g, '');
      const t = (name) => ({ total: ctx.match(new RegExp(`^sensor\\.(?:.+_)?${x}_hmu_${name}$`), 'mqtt') });
      return {
        energy: t('statelectricenergysum'), energy_heating: t('statelectricenergysumhc'), energy_dhw: t('statelectricenergysumhwc'),
        energy_cooling: t('statelectricenergysumcool'), env_energy: t('statenvironmentenergysum'),
        starts: t('runstatscompressorstarts'), hours: t('runstatscompressorhours'),
      };
    },
    errors: (p, i, ctx) => [ctx.match(new RegExp(`^sensor\\.(?:.+_)?${p.replace(/[^a-z0-9_]/g, '')}_hmu_currenterror_error$`), 'mqtt')].filter(Boolean),
    // Pre-run, overrun and shutdown keep the mode of their phase; the compressor speed tells whether it runs.
    // Fault codes (fan1_blocked, building_circuit_flow_too_low …) stay unmapped and show as text.
    mode_map: {
      standby: 'idle', frost_protect: 'frost', compressor_oil_heating_active: 'idle', air_purging_program_active: 'circulate',
      deicing_active: 'defrost',
      heat_prerun: 'heating', heat_compressor_active: 'heating', heat_overrun: 'heating', heat_compressor_shutdown: 'heating',
      heat_immersion_heater_active: 'heating', heat_immersion_heater_shutdown: 'heating',
      heat_compressor_blocked: 'blocked', heat_immersion_heater_blocked: 'blocked',
      hwc_prerun: 'dhw', hwc_compressor_active: 'dhw', hwc_overrun: 'dhw', hwc_immersion_heater_active: 'dhw', hwc_immersion_heater_shutdown: 'dhw',
      hwc_compressor_blocked: 'blocked', hwc_immersion_heater_blocked: 'blocked',
      cool_prerun: 'cooling', cool_compressor_active: 'cooling', cool_overrun: 'cooling', cool_compressor_shutdown: 'cooling',
      cool_compressor_blocked: 'blocked',
    },
  },

  // Samsung EHS (Mono, Split, TDM) over the NASA bus with the ESPHome component "esphome-samsung-nasa" by Beormund.
  // ESPHome entity ids are <node>_<name slug>, and the names are set in each user's YAML. The candidates are the names
  // of Beormund's example.yaml and README, then those of the installation the preset was tested on (EHS Mono AE050JXYDEH).
  samsung: {
    name: 'Samsung EHS (esphome-samsung-nasa)',
    tested: true,
    auto_circuits: false,
    // The 3-way valve (0x4067) and the error code (0x8235) together: a plain "3-way valve" alone could be any ESPHome node.
    detect: (ctx) => {
      const re = /^sensor\.(.+)_3_way_valve(?:_position)?$/;
      const id = ctx.match(re, 'esphome');
      const p = id && id.match(re)[1];
      return p && [`sensor.${p}_error_code`, `sensor.${p}_system_error_status`].some((e) => ctx.ids.includes(e)) ? p : undefined;
    },
    entities: (p, i) => {
      const s = (...ks) => ks.map((k) => `sensor.${p}_${k}`);
      const b = (...ks) => ks.map((k) => `binary_sensor.${p}_${k}`);
      const z = i.hc;
      // No hc_pump: the primary water pump (0x4089) also runs for hot water, so the circuit follows the valve instead.
      return {
        compressor: b('compressor_status', 'compressor').concat(s('compressor_frequency')),
        defrost: b('defrost', 'defrost_mode', 'defrost_status'),
        valve: s('3_way_valve', '3_way_valve_position'),
        heater: b('backup_heater'),
        power: s('power_consumed_last_minute', 'power'),
        heat: s('power_produced_last_minute', 'heat_produced_last_minute'),
        flow: s('flow_temp_out', 'flow_temperature'),
        return: s('flow_temp_return', 'return_temperature'),
        volume: s('flow_rate_sensor', 'water_flow'),
        outdoor: s('outdoor_temperature'),
        dhw_top: s('dhw_temperature', 'dhw_tank_temperature'),
        dhw_target: [`number.${p}_dhw_target_temperature`, `sensor.${p}_dhw_target_temperature`],
        dhw_heater: b('booster_heater'),
        // Without a mixing kit zone 1 is fed straight from the heat pump outlet.
        hc_flow: z === 1 ? s('flow_temp_out', 'flow_temperature') : undefined,
        hc_setpoint: z === 1 ? s('water_law_target_flow_temperature', 'water_target_in_use') : undefined,
        room: s(`zone_${z}_indoor_temp`),
        room_target: [`number.${p}_zone_${z}_target_temp`],
        program: [`switch.${p}_away_mode`, `switch.${p}_outing_mode`],
        energy_today: s('daily_energy_consumed'),
        energy_total: s('total_consumed_energy', 'energy'),
        heat_total: s('total_produced_energy', 'heat_produced_total'),
        compressor_speed: s('compressor_frequency'),
        hot_gas: s('discharge_temperature'),
        eev: s('expansion_valve_opening'),
      };
    },
    errors: (p) => [`sensor.${p}_error_code`, `sensor.${p}_system_error_status`],
    // The text sensor for 0x8235 says "No Error"; any other text is a fault. As a plain sensor it is the number (0 = none).
    error_ok: ['No Error'],
    // Away (outing) mode is a switch.
    program_map: { on: 'holiday', off: 'none' },
    // The template sensors of Beormund's example.yaml give today; the NASA counters (0x8414, 0x4427) the totals.
    tiles: (p) => {
      const s = (...ks) => ks.map((k) => `sensor.${p}_${k}`);
      return {
        energy: { today: s('daily_energy_consumed'), total: s('total_consumed_energy', 'energy') },
        heat: { today: s('daily_heat_generated'), total: s('total_produced_energy', 'heat_produced_total') },
        cop_total: { today: s('cop_daily'), total: s('cop_total') },
      };
    },
  },
};

/* ------------------------------------------------------------------ */
/* Translations                                                        */
/* ------------------------------------------------------------------ */
const HFC_I18N = {
  en: {
    not_found: 'No entities of this preset found. Check the integration and the prefix, or open the card editor.',
    title: 'Heat pump', heat_pump: 'Heat pump', dhw: 'Hot water', buffer: 'Buffer', series_tank: 'Series buffer', heating_circuit: 'Heating circuit',
    house: 'Rooms', room: 'Room', room_target: 'Room target', running: 'running', compressor_off: 'Compressor off', source_in: 'Air inlet', outdoor: 'Outdoor',
    energy_missing: 'Energy dashboard: no power sensor for {sources}; energy counters alone cannot show live flow.',
    brine_in: 'Brine in', brine_out: 'Brine out', well_in: 'Well in', well_out: 'Well out',
    details: 'Details', sec_operation: 'Operation', sec_hydraulic: 'Hydraulic pressures', sec_refrigerant: 'Refrigerant circuit', sec_cutouts: 'Cut-outs (number of events)', sec_more: 'More',
    diagnostic_copy: 'Copy diagnostic report', diagnostic_copied: 'Diagnostic report copied', diagnostic_failed: 'Could not copy diagnostic report',
    fullscreen_open: 'Open full screen', fullscreen_close: 'Close full screen',
    det: {
      hours: 'Compressor hours', starts_total: 'Compressor starts total', aux_hours: 'Heater hours', energy_total: 'Electricity total',
      cutout_high_pressure: 'High-pressure cut-outs', cutout_low_pressure: 'Low-pressure cut-outs', cutout_temperature: 'Temperature cut-outs',
      env_energy: 'Environmental energy total', heat_total: 'Heat total', cop_total: 'COP total', compressor_speed: 'Compressor', evap_temp: 'Evaporation', cond_temp: 'Condensation',
      suction_temp: 'Suction gas', hot_gas: 'Hot gas', liquid_temp: 'Liquid line', low_pressure: 'Low pressure', high_pressure: 'High pressure',
      eev: 'Expansion valve', superheat: 'Superheat', subcooling: 'Subcooling',
    },
    source_flow: 'Source', target: 'Target', curve_offset: 'curve', curve_shift: 'shift', return_short: 'RL', middle: 'middle', bottom: 'bottom', error: 'Error', circulation: 'Circ.', valve_dhw: 'DHW', solar: 'Solar',
    brine_pressure: 'Brine pressure', hc_pressure: 'Heating pressure', pressure_normal: 'normal', pressure_warning: 'warning', pressure_critical: 'critical',
    timeline_title: 'Last {h} hours', timeline_gap: 'No data', timeline_aria: 'Operating mode of the last {h} hours. Arrow keys select a period.',
    programs: { eco: 'Eco', night: 'Night', party: 'Party', holiday: 'Holiday' },
    valve_heating: 'Heating', valve_cooling: 'Cooling', bypass: 'Bypass', pv: 'PV', battery: 'Battery', grid: 'Grid',
    stat_cop_heating: 'COP heating today', stat_cop_dhw: 'COP DHW today', stat_energy: 'Energy today',
    stat_starts: 'Starts today', stat_spread: 'Spread', stat_volume: 'Flow rate', stat_heat: 'Heat output', pv_share: 'PV',
    tiles: {
      cop_live: 'COP live', cop_heating: 'COP heating', cop_dhw: 'COP DHW', cop_cooling: 'EER cooling', cop_total: 'COP total', spf: 'SPF (year)',
      energy: 'Electricity', env_energy: 'Environmental energy', energy_heating: 'Electricity heating', energy_dhw: 'Electricity DHW', energy_cooling: 'Electricity cooling',
      energy_defrost: 'Electricity defrost', energy_standby: 'Standby', energy_aux: 'Electricity heater',
      heat: 'Heat', heat_heating: 'Heat heating', heat_dhw: 'Heat DHW', heat_cooling: 'Cooling output', heat_defrost: 'Heat defrost',
      starts: 'Compressor starts', cycles_heating: 'Heating cycles', cycles_dhw: 'DHW cycles', cycles_cooling: 'Cooling cycles', defrosts: 'Defrosts',
      hours: 'Compressor hours', hours_per_start: 'Runtime per start', load_classes: 'Load classes 1-5', aux_hours: 'Heater hours', aux_starts: 'Heater starts',
      spread: 'Spread', volume: 'Flow rate', heat_estimated: 'Heat output', power: 'Power', heat_live: 'Heat output', compressor_speed: 'Compressor',
      source_spread: 'Source spread', outdoor: 'Outdoor', dhw_top: 'DHW tank', room: 'Room', brine_pressure: 'Brine pressure', hc_pressure: 'Heating pressure', pv_share: 'PV share today',
      pv_production: 'PV yield', solar_thermal: 'Solar thermal', cost: 'Cost',
    },
    periods: { now: 'now', today: 'today', yesterday: 'yesterday', week: 'week', month: 'month', year: 'year', total: 'total' },
    modes: {
      idle: 'Standby', heating: 'Heating', dhw: 'Hot water', cooling: 'Cooling', defrost: 'Defrost', blocked: 'Blocked',
      frost: 'Frost protection', circulate: 'Circulating', off: 'Off', legionella: 'Legionella', trailing: 'Run-on',
    },
  },
  de: {
    not_found: 'Keine Entitäten dieser Voreinstellung gefunden. Integration und Präfix prüfen oder den Karteneditor öffnen.',
    title: 'Wärmepumpe', heat_pump: 'Wärmepumpe', dhw: 'Warmwasser', buffer: 'Puffer', series_tank: 'Reihenpuffer', heating_circuit: 'Heizkreis',
    house: 'Wohnräume', room: 'Raum', room_target: 'Raum-Soll', running: 'läuft', compressor_off: 'Verdichter aus', source_in: 'Luft-Eintritt', outdoor: 'Außen',
    energy_missing: 'Energie-Dashboard: kein Leistungssensor für {sources}; Energiezähler allein zeigen keinen aktuellen Fluss.',
    brine_in: 'Sole ein', brine_out: 'Sole aus', well_in: 'Brunnen ein', well_out: 'Brunnen aus',
    details: 'Details', sec_operation: 'Betrieb', sec_hydraulic: 'Hydraulikdrücke', sec_refrigerant: 'Kältekreis', sec_cutouts: 'Abschaltungen (Anzahl der Ereignisse)', sec_more: 'Weitere',
    diagnostic_copy: 'Diagnosebericht kopieren', diagnostic_copied: 'Diagnosebericht kopiert', diagnostic_failed: 'Diagnosebericht konnte nicht kopiert werden',
    fullscreen_open: 'Vollbild öffnen', fullscreen_close: 'Vollbild schließen',
    det: {
      hours: 'Betriebsstunden Verdichter', starts_total: 'Verdichterstarts gesamt', aux_hours: 'Betriebsstunden Heizstab', energy_total: 'Strom gesamt',
      cutout_high_pressure: 'Hochdruck-Abschaltungen', cutout_low_pressure: 'Niederdruck-Abschaltungen', cutout_temperature: 'Temperatur-Abschaltungen',
      env_energy: 'Umweltenergie gesamt', heat_total: 'Wärme gesamt', cop_total: 'COP gesamt', compressor_speed: 'Verdichter', evap_temp: 'Verdampfung', cond_temp: 'Kondensation',
      suction_temp: 'Sauggas', hot_gas: 'Heißgas', liquid_temp: 'Flüssigkeitsleitung', low_pressure: 'Niederdruck', high_pressure: 'Hochdruck',
      eev: 'Expansionsventil', superheat: 'Überhitzung', subcooling: 'Unterkühlung',
    },
    source_flow: 'Quelle', target: 'Soll', curve_offset: 'Kurve', curve_shift: 'Verschiebung', return_short: 'RL', middle: 'Mitte', bottom: 'unten', error: 'Fehler', circulation: 'Zirk.', valve_dhw: 'WW', solar: 'Solar',
    brine_pressure: 'Soledruck', hc_pressure: 'Heizungsdruck', pressure_normal: 'normal', pressure_warning: 'Warnung', pressure_critical: 'kritisch',
    timeline_title: 'Letzte {h} Stunden', timeline_gap: 'Keine Daten', timeline_aria: 'Betriebsart der letzten {h} Stunden. Mit den Pfeiltasten einen Zeitraum wählen.',
    programs: { eco: 'Eco', night: 'Nacht', party: 'Party', holiday: 'Urlaub' },
    valve_heating: 'Heizen', valve_cooling: 'Kühlen', bypass: 'Bypass', pv: 'PV', battery: 'Akku', grid: 'Netz',
    stat_cop_heating: 'COP Heizen heute', stat_cop_dhw: 'COP WW heute', stat_energy: 'Strom heute',
    stat_starts: 'Starts heute', stat_spread: 'Spreizung', stat_volume: 'Volumenstrom', stat_heat: 'Wärmeleistung', pv_share: 'PV',
    tiles: {
      cop_live: 'COP live', cop_heating: 'COP Heizen', cop_dhw: 'COP WW', cop_cooling: 'EER Kühlen', cop_total: 'COP gesamt', spf: 'JAZ',
      energy: 'Strom', env_energy: 'Umweltenergie', energy_heating: 'Strom Heizen', energy_dhw: 'Strom WW', energy_cooling: 'Strom Kühlen',
      energy_defrost: 'Strom Abtauen', energy_standby: 'Standby', energy_aux: 'Strom Heizstab',
      heat: 'Wärme', heat_heating: 'Wärme Heizen', heat_dhw: 'Wärme WW', heat_cooling: 'Kälte', heat_defrost: 'Wärme Abtauen',
      starts: 'Verdichterstarts', cycles_heating: 'Heizzyklen', cycles_dhw: 'WW-Zyklen', cycles_cooling: 'Kühlzyklen', defrosts: 'Abtauungen',
      hours: 'Verdichterstunden', hours_per_start: 'Laufzeit pro Start', load_classes: 'Lastklassen 1-5', aux_hours: 'Heizstab-Stunden', aux_starts: 'Heizstab-Starts',
      spread: 'Spreizung', volume: 'Volumenstrom', heat_estimated: 'Wärmeleistung', power: 'Leistung', heat_live: 'Wärmeleistung', compressor_speed: 'Verdichter',
      source_spread: 'Spreizung Quelle', outdoor: 'Außen', dhw_top: 'WW-Speicher', room: 'Raum', brine_pressure: 'Soledruck', hc_pressure: 'Heizungsdruck', pv_share: 'PV-Anteil heute',
      pv_production: 'PV-Ertrag', solar_thermal: 'Solarthermie', cost: 'Kosten',
    },
    periods: { now: 'aktuell', today: 'heute', yesterday: 'gestern', week: 'Woche', month: 'Monat', year: 'Jahr', total: 'gesamt' },
    modes: {
      idle: 'Bereit', heating: 'Heizen', dhw: 'Warmwasser', cooling: 'Kühlen', defrost: 'Abtauen', blocked: 'Sperrzeit',
      frost: 'Frostschutz', circulate: 'Umwälzen', off: 'Aus', legionella: 'Legionellenschutz', trailing: 'Nachlauf',
    },
  },
};

// Translation objects are a public configuration surface. Merge them recursively so a custom language only needs to
// provide the labels it changes; every missing leaf falls back to English (and then to a built-in language, if present).
const hfcTextMerge = (...parts) => {
  const out = {};
  parts.filter((p) => p && typeof p === 'object' && !Array.isArray(p)).forEach((part) => Object.entries(part).forEach(([key, value]) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) return;
    out[key] = value && typeof value === 'object' && !Array.isArray(value) ? hfcTextMerge(out[key], value) : value;
  }));
  return out;
};

const HFC_EDITOR = {
  en: {
    preset: 'Preset', prefix: 'Prefix (empty = auto-detect)', device: 'Device (optional, restricts the preset)',
    title: 'Title', language: 'Language', power_threshold: 'Running above (W)', hc_type: 'Heat emitter',
    power_sources: 'PV / battery / grid', ps_auto: 'Energy dashboard, unless set below', ps_manual: 'Only the sensors below',
    source_type: 'Heat source', src_air: 'Air', src_brine: 'Ground (brine)', src_water: 'Groundwater',
    hc_count: 'Heating circuits', hc2_type: 'Circuit 2 emitter', hc3_type: 'Circuit 3 emitter', hc4_type: 'Circuit 4 emitter', hc5_type: 'Circuit 5 emitter', hc6_type: 'Circuit 6 emitter',
    unit_style: 'Unit drawing', unit_auto: 'Automatic (from the preset)', unit_generic: 'Generic (fan)', unit_lambda: 'Lambda EU-L', unit_vaillant: 'Vaillant aroTHERM plus', unit_panasonic: 'Panasonic Aquarea', unit_viessmann: 'Viessmann Vitocal', unit_bosch: 'Bosch / Buderus', unit_saunier: 'Saunier Duval GeniaAir', unit_samsung: 'Samsung EHS Mono',
    unit_size: 'Vaillant size', size_small: '3.5 / 5.5 kW (1 fan, low)', size_medium: '7.5 kW (1 fan)', size_large: '10.5 / 12.5 kW (2 fans)',
    timeline: 'Timeline of the operating mode', timeline_hours: 'Timeline length (hours)', timeline_marks: 'Show the badges (e.g. Boost) as extra lanes',
    layout: 'Layout', layout_default: 'Default', layout_compact: 'Compact (narrow columns)', layout_wide: 'Wide (tiles beside the schematic)', layout_wall: 'Wall display (large, controls fade out)',
    animations: 'Animations', animations_auto: 'Automatic (respect reduced motion)', animations_always: 'Always', animations_off: 'Off',
    flow_speed: 'Animation speed', source_spread: 'Show source spread',
    theme: 'Card theme', theme_auto: 'Automatic (dashboard)', theme_night: 'Night', theme_contrast: 'High contrast', fullscreen: 'Full-screen button',
    wall_timeout: 'Hide controls after (seconds, 0 = never)',
    hc_return_label: 'Show circuit return temperature', primary_pump: 'Primary pump', series_buffer: 'Series buffer in the return (with bypass valve)', hc_name: 'Circuit 1 name', hc2_name: 'Circuit 2 name', hc3_name: 'Circuit 3 name', hc4_name: 'Circuit 4 name', hc5_name: 'Circuit 5 name', hc6_name: 'Circuit 6 name',
    sec_hc2: 'Heating circuit 2', sec_hc3: 'Heating circuit 3', sec_hc4: 'Heating circuit 4', sec_hc5: 'Heating circuit 5', sec_hc6: 'Heating circuit 6', sec_details: 'Details: operation', sec_refrigerant: 'Details: refrigerant circuit', sec_cutouts: 'Details: cut-out counters',
    controls: 'Quick controls (switch, button, select, number …)', details_open: 'Details open by default',
    from_preset: 'Found by the preset',
    sum_help: 'Sum of these entities',
    sec_advanced: 'Advanced',
    tiles_custom: 'Own tile selection', tiles: 'Tiles (drag to sort)',
    tiles_custom_help: 'Off: default tiles. On: pick tiles and periods from what this installation provides; an empty list hides the row.',
    tiles_yaml: 'Some tiles have their own name, entity, price or action: edit them in YAML.',
    price_fixed: 'Electricity price per kWh', price_entity: 'Electricity price entity',
    price_help: 'Enables the cost tile. With an entity that has long-term statistics (e.g. a dynamic tariff), the cost is billed per hour.',
    untested: 'untested',
    untested_help: 'Not yet tested on a real installation. Please report whether it works: github.com/Sturmi77/heatpump-hydraulic-card/issues (Preset feedback).',
    warn_title: 'Missing in the card',
    warn_running: 'No operating mode, compressor, status or power: the card cannot tell whether the heat pump runs.',
    warn_power: 'No electrical power: no live COP, and no PV / battery / grid split from the Energy dashboard.',
    warn_energy_sources: 'Energy dashboard: no power sensor for {sources}; energy counters alone cannot show live flow.',
    warn_temps: 'No flow or return temperature: no spread and no estimated heat output.',
    warn_heat: 'No heat output and no flow rate: no live COP.',
    preset_help: 'Found entities are filled in below. Pick another entity to override one, clear a field to hide it.',
    from_energy: 'Empty: taken from the Energy dashboard',
    errors: 'Error entities', error_ok_text: 'Text states that mean no error',
    errors_help: 'Active for a number other than 0 or state on. Text needs the no-error states below; unknown, unavailable, off and empty are ignored.',
    error_ok_help: 'Comma-separated, case-insensitive; for example: No Error, OK. Any other known text then shows the error chip.',
    total_cop_help: 'Total heat, environmental energy and electricity must cover the same time range. Without total heat, COP uses environmental energy plus electricity.',
    language_help: 'Additional languages and custom labels are configured with texts in YAML; missing labels fall back to English.',
    detected: 'Detected', entities_found: 'entities', not_detected: 'Not found in this Home Assistant - check the integration, the prefix or choose another preset',
    program: 'Heating program (eco, night, party, holiday)', solar_collector: 'Solar collector temperature', solar_pump: 'Solar pump running (binary)',
    source_out: 'Source outlet temperature', heater: 'Backup / inline heater active',
    dhw_heater: 'DHW heater rod active', buffer_heater: 'Buffer heater rod active',
    hc_underfloor: 'Underfloor heating', hc_radiator: 'Panel radiators', hc_column: 'Column radiators',
    brine_pressure_min: 'Brine pressure warning below', brine_pressure_crit: 'Brine pressure critical below', brine_pressure_max: 'Brine pressure warning above',
    hc_pressure_min: 'Heating pressure warning below', hc_pressure_crit: 'Heating pressure critical below', hc_pressure_max: 'Heating pressure warning above',
    sec_hp: 'Heat pump', sec_storage: 'Storage', sec_hc: 'Heating circuit & house', sec_power: 'Power sources', sec_stats: 'Statistics',
    mode: 'Operating mode', status: 'Status / sub-state', compressor: 'Compressor running (binary or frequency)', defrost: 'Defrost active (binary)', fan_speed: 'Fan speed (rpm or binary)', power: 'Electrical power',
    heat: 'Heat output', flow: 'Flow temperature', return: 'Return temperature', volume: 'Flow rate heating side',
    source_volume: 'Flow rate source side', source_in: 'Source / air inlet temperature', outdoor: 'Outdoor temperature',
    valve: 'Diverter valve on DHW (binary or Tank/Room)', bypass_valve: 'Series buffer bypass valve (on = bypass; default: defrost)',
    dhw_top: 'DHW tank top', dhw_middle: 'DHW tank middle', dhw_bottom: 'DHW tank bottom', dhw_target: 'DHW target', dhw_mode: 'DHW mode',
    circulation: 'Circulation pump', buffer_top: 'Buffer top', buffer_middle: 'Buffer middle', buffer_bottom: 'Buffer bottom', buffer_mode: 'Buffer mode',
    hc_flow: 'Circuit flow temperature', hc_return: 'Circuit return temperature', hc_setpoint: 'Circuit flow target',
    hc_mode: 'Circuit mode', hc_pump: 'Circuit pump running (binary)', hc_volume: 'Circuit flow rate', hc_curve_offset: 'Heating curve shift (K)', hc_pressure: 'Heating circuit pressure', brine_pressure: 'Brine circuit pressure',
    cutout_high_pressure: 'High-pressure cut-outs (count of events, not a pressure)', cutout_low_pressure: 'Low-pressure cut-outs (count of events, not a pressure)', cutout_temperature: 'Temperature cut-outs (count of events, not a temperature)',
    room: 'Room temperature', room_target: 'Room target',
    env_energy: 'Environmental energy total', pv: 'Power from PV (W)', battery: 'Power from battery (W)', grid: 'Power from grid (W)',
    cop_heating_today: 'COP heating today', cop_dhw_today: 'COP DHW today', energy_today: 'Energy today (kWh)',
    pv_share_today: 'PV share today (%)', starts_today: 'Compressor starts today',
  },
  de: {
    preset: 'Voreinstellung', prefix: 'Präfix (leer = automatisch erkennen)', device: 'Gerät (optional, schränkt die Voreinstellung ein)',
    title: 'Titel', language: 'Sprache', power_threshold: 'Läuft ab (W)', hc_type: 'Wärmeabgabe',
    power_sources: 'PV / Akku / Netz', ps_auto: 'Energie-Dashboard, außer unten gesetzt', ps_manual: 'Nur die Sensoren unten',
    source_type: 'Wärmequelle', src_air: 'Luft', src_brine: 'Erdreich (Sole)', src_water: 'Grundwasser',
    hc_count: 'Heizkreise', hc2_type: 'Wärmeabgabe Heizkreis 2', hc3_type: 'Wärmeabgabe Heizkreis 3', hc4_type: 'Wärmeabgabe Heizkreis 4', hc5_type: 'Wärmeabgabe Heizkreis 5', hc6_type: 'Wärmeabgabe Heizkreis 6',
    unit_style: 'Geräte-Zeichnung', unit_auto: 'Automatisch (aus der Voreinstellung)', unit_generic: 'Allgemein (Lüfter)', unit_lambda: 'Lambda EU-L', unit_vaillant: 'Vaillant aroTHERM plus', unit_panasonic: 'Panasonic Aquarea', unit_viessmann: 'Viessmann Vitocal', unit_bosch: 'Bosch / Buderus', unit_saunier: 'Saunier Duval GeniaAir', unit_samsung: 'Samsung EHS Mono',
    unit_size: 'Vaillant-Größe', size_small: '3,5 / 5,5 kW (1 Lüfter, niedrig)', size_medium: '7,5 kW (1 Lüfter)', size_large: '10,5 / 12,5 kW (2 Lüfter)',
    timeline: 'Zeitleiste der Betriebsart', timeline_hours: 'Länge der Zeitleiste (Stunden)', timeline_marks: 'Badges (z. B. Boost) als zusätzliche Spuren zeigen',
    layout: 'Layout', layout_default: 'Standard', layout_compact: 'Kompakt (schmale Spalten)', layout_wide: 'Breit (Kacheln neben dem Schema)', layout_wall: 'Wanddisplay (groß, Bedienelemente blenden aus)',
    animations: 'Animationen', animations_auto: 'Automatisch (reduzierte Bewegung beachten)', animations_always: 'Immer', animations_off: 'Aus',
    flow_speed: 'Animationsgeschwindigkeit', source_spread: 'Quellenspreizung anzeigen',
    theme: 'Kartendarstellung', theme_auto: 'Automatisch (Dashboard)', theme_night: 'Nacht', theme_contrast: 'Hoher Kontrast', fullscreen: 'Vollbild-Schaltfläche',
    wall_timeout: 'Bedienelemente ausblenden nach (Sekunden, 0 = nie)',
    hc_return_label: 'Heizkreis-Rücklauf anzeigen', primary_pump: 'Primärpumpe', series_buffer: 'Reihenpuffer im Rücklauf (mit Bypass-Ventil)', hc_name: 'Name Heizkreis 1', hc2_name: 'Name Heizkreis 2', hc3_name: 'Name Heizkreis 3', hc4_name: 'Name Heizkreis 4', hc5_name: 'Name Heizkreis 5', hc6_name: 'Name Heizkreis 6',
    sec_hc2: 'Heizkreis 2', sec_hc3: 'Heizkreis 3', sec_hc4: 'Heizkreis 4', sec_hc5: 'Heizkreis 5', sec_hc6: 'Heizkreis 6', sec_details: 'Details: Betrieb', sec_refrigerant: 'Details: Kältekreis', sec_cutouts: 'Details: Abschaltzähler',
    controls: 'Schnellbedienung (Schalter, Taste, Auswahl, Zahl …)', details_open: 'Details standardmäßig offen',
    from_preset: 'Von der Voreinstellung gefunden',
    sum_help: 'Summe dieser Entitäten',
    sec_advanced: 'Erweitert',
    tiles_custom: 'Eigene Kachelauswahl', tiles: 'Kacheln (zum Sortieren ziehen)',
    tiles_custom_help: 'Aus: Standardkacheln. An: Kacheln und Zeiträume aus dem wählen, was diese Anlage liefert; eine leere Liste blendet die Zeile aus.',
    tiles_yaml: 'Einige Kacheln haben einen eigenen Namen, eine eigene Entität, einen Preis oder eine Aktion: im YAML bearbeiten.',
    price_fixed: 'Strompreis je kWh', price_entity: 'Strompreis-Entität',
    price_help: 'Schaltet die Kostenkachel frei. Mit einer Entität mit Langzeitstatistik (z. B. dynamischer Tarif) werden die Kosten stundengenau abgerechnet.',
    untested: 'ungetestet',
    untested_help: 'Noch nicht mit einer echten Anlage getestet. Bitte melden, ob es funktioniert: github.com/Sturmi77/heatpump-hydraulic-card/issues (Preset feedback).',
    warn_title: 'Fehlt in der Karte',
    warn_running: 'Keine Betriebsart, kein Verdichter, kein Status und keine Leistung: Die Karte kann nicht erkennen, ob die Wärmepumpe läuft.',
    warn_power: 'Keine Leistungsaufnahme: kein Live-COP und keine Aufteilung PV / Akku / Netz aus dem Energie-Dashboard.',
    warn_energy_sources: 'Energie-Dashboard: kein Leistungssensor für {sources}; Energiezähler allein zeigen keinen aktuellen Fluss.',
    warn_temps: 'Kein Vor- oder Rücklauf: keine Spreizung und keine geschätzte Wärmeleistung.',
    warn_heat: 'Keine Wärmeleistung und kein Volumenstrom: kein Live-COP.',
    preset_help: 'Gefundene Entitäten sind unten eingetragen. Andere Entität wählen zum Überschreiben, Feld leeren zum Ausblenden.',
    from_energy: 'Leer: aus dem Energie-Dashboard',
    errors: 'Fehler-Entitäten', error_ok_text: 'Textzustände ohne Fehler',
    errors_help: 'Aktiv bei einer Zahl ungleich 0 oder Zustand on. Text braucht die fehlerfreien Zustände unten; unknown, unavailable, off und leer werden ignoriert.',
    error_ok_help: 'Kommagetrennt, ohne Beachtung der Groß-/Kleinschreibung; zum Beispiel: No Error, OK. Jeder andere bekannte Text zeigt dann den Fehler-Chip.',
    total_cop_help: 'Gesamtwärme, Umweltenergie und Gesamtstrom müssen denselben Zeitraum abdecken. Ohne Gesamtwärme nutzt der COP Umweltenergie plus Strom.',
    language_help: 'Weitere Sprachen und eigene Beschriftungen werden mit texts im YAML konfiguriert; fehlende Texte fallen auf Englisch zurück.',
    detected: 'Erkannt', entities_found: 'Entitäten', not_detected: 'In diesem Home Assistant nicht gefunden - Integration und Präfix prüfen oder andere Voreinstellung wählen',
    program: 'Heizprogramm (Eco, Nacht, Party, Urlaub)', solar_collector: 'Kollektortemperatur Solarthermie', solar_pump: 'Solarpumpe läuft (binär)',
    source_out: 'Quelle Austritt', heater: 'Heizstab / Zusatzheizer aktiv',
    dhw_heater: 'Heizstab Warmwasser aktiv', buffer_heater: 'Heizstab Puffer aktiv',
    hc_underfloor: 'Flächenheizung', hc_radiator: 'Plattenheizkörper', hc_column: 'Gliederheizkörper',
    brine_pressure_min: 'Soledruck Warnung unter', brine_pressure_crit: 'Soledruck kritisch unter', brine_pressure_max: 'Soledruck Warnung über',
    hc_pressure_min: 'Heizungsdruck Warnung unter', hc_pressure_crit: 'Heizungsdruck kritisch unter', hc_pressure_max: 'Heizungsdruck Warnung über',
    sec_hp: 'Wärmepumpe', sec_storage: 'Speicher', sec_hc: 'Heizkreis & Haus', sec_power: 'Stromquellen', sec_stats: 'Kennzahlen',
    mode: 'Betriebsart', status: 'Status / Unterzustand', compressor: 'Verdichter läuft (binär oder Frequenz)', defrost: 'Abtauen aktiv (binär)', fan_speed: 'Lüfterdrehzahl (U/min oder binär)', power: 'Leistungsaufnahme',
    heat: 'Wärmeleistung', flow: 'Vorlauftemperatur', return: 'Rücklauftemperatur', volume: 'Volumenstrom Heizseite',
    source_volume: 'Volumenstrom Quelle', source_in: 'Quelle / Luft-Eintritt', outdoor: 'Außentemperatur',
    valve: 'Umschaltventil auf WW (binär oder Tank/Room)', bypass_valve: 'Bypass-Ventil Reihenpuffer (ein = Bypass; Standard: Abtauen)',
    dhw_top: 'WW-Speicher oben', dhw_middle: 'WW-Speicher Mitte', dhw_bottom: 'WW-Speicher unten', dhw_target: 'WW-Soll', dhw_mode: 'WW-Betriebsart',
    circulation: 'Zirkulationspumpe', buffer_top: 'Puffer oben', buffer_middle: 'Puffer Mitte', buffer_bottom: 'Puffer unten', buffer_mode: 'Puffer-Betriebsart',
    hc_flow: 'Heizkreis-Vorlauf', hc_return: 'Heizkreis-Rücklauf', hc_setpoint: 'Heizkreis-Vorlauf-Soll',
    hc_mode: 'Heizkreis-Betriebsart', hc_pump: 'Heizkreispumpe läuft (binär)', hc_volume: 'Volumenstrom Heizkreis', hc_curve_offset: 'Heizkurven-Verschiebung (K)', hc_pressure: 'Heizkreis-Druck', brine_pressure: 'Solekreis-Druck',
    cutout_high_pressure: 'Hochdruck-Abschaltungen (Anzahl der Ereignisse, kein Druck)', cutout_low_pressure: 'Niederdruck-Abschaltungen (Anzahl der Ereignisse, kein Druck)', cutout_temperature: 'Temperatur-Abschaltungen (Anzahl der Ereignisse, keine Temperatur)',
    room: 'Raumtemperatur', room_target: 'Raum-Soll',
    env_energy: 'Umweltenergie gesamt', pv: 'Strom aus PV (W)', battery: 'Strom aus Akku (W)', grid: 'Strom aus Netz (W)',
    cop_heating_today: 'COP Heizen heute', cop_dhw_today: 'COP WW heute', energy_today: 'Strom heute (kWh)',
    pv_share_today: 'PV-Anteil heute (%)', starts_today: 'Verdichterstarts heute',
  },
};

// Heating circuits the card can draw; circuit 1 uses the plain hc_ keys, circuits 2 to 6 hc2_ to hc6_.
const HFC_MAX_HC = 6;
const hfcHcCount = (config) => Math.min(Math.max(Math.round(+config?.hc_count) || 1, 1), HFC_MAX_HC);

const HFC_ENTITY_GROUPS = {
  sec_hp: ['mode', 'status', 'compressor', 'fan_speed', 'defrost', 'power', 'heat', 'flow', 'return', 'volume', 'source_volume', 'source_in', 'source_out', 'brine_pressure', 'outdoor', 'valve', 'heater'],
  sec_storage: ['dhw_top', 'dhw_middle', 'dhw_bottom', 'dhw_target', 'dhw_mode', 'circulation', 'dhw_heater', 'buffer_top', 'buffer_middle', 'buffer_bottom', 'buffer_mode', 'buffer_heater', 'bypass_valve', 'solar_collector', 'solar_pump'],
  sec_hc: ['hc_flow', 'hc_return', 'hc_setpoint', 'hc_mode', 'hc_pump', 'hc_volume', 'hc_curve_offset', 'hc_pressure', 'room', 'room_target', 'program'],
  // The room of circuit 1 is the house (room, room_target); circuits 2 to 6 show theirs in their status line.
  sec_hc2: ['hc2_flow', 'hc2_return', 'hc2_setpoint', 'hc2_mode', 'hc2_pump', 'hc2_volume', 'hc2_curve_offset', 'hc2_room', 'hc2_room_target'],
  sec_hc3: ['hc3_flow', 'hc3_return', 'hc3_setpoint', 'hc3_mode', 'hc3_pump', 'hc3_volume', 'hc3_curve_offset', 'hc3_room', 'hc3_room_target'],
  sec_hc4: ['hc4_flow', 'hc4_return', 'hc4_setpoint', 'hc4_mode', 'hc4_pump', 'hc4_volume', 'hc4_curve_offset', 'hc4_room', 'hc4_room_target'],
  sec_hc5: ['hc5_flow', 'hc5_return', 'hc5_setpoint', 'hc5_mode', 'hc5_pump', 'hc5_volume', 'hc5_curve_offset', 'hc5_room', 'hc5_room_target'],
  sec_hc6: ['hc6_flow', 'hc6_return', 'hc6_setpoint', 'hc6_mode', 'hc6_pump', 'hc6_volume', 'hc6_curve_offset', 'hc6_room', 'hc6_room_target'],
  sec_power: ['pv', 'battery', 'grid'],
  sec_details: ['hours', 'starts_total', 'aux_hours', 'energy_total', 'env_energy', 'heat_total'],
  sec_refrigerant: ['compressor_speed', 'evap_temp', 'cond_temp', 'suction_temp', 'hot_gas', 'liquid_temp', 'low_pressure', 'high_pressure', 'eev', 'superheat', 'subcooling'],
  sec_cutouts: ['cutout_high_pressure', 'cutout_low_pressure', 'cutout_temperature'],
  sec_stats: ['cop_heating_today', 'cop_dhw_today', 'energy_today', 'pv_share_today', 'starts_today'],
};
const HFC_DIAGNOSTIC_KEYS = [...new Set(Object.values(HFC_ENTITY_GROUPS).flat())];
// Entity domains usable as quick controls and the service each one calls.
const HFC_CONTROL_DOMAINS = ['switch', 'input_boolean', 'light', 'fan', 'automation', 'button', 'input_button', 'script', 'scene',
  'select', 'input_select', 'water_heater', 'climate', 'number', 'input_number'];
const HFC_BINARY_KEYS = ['compressor', 'valve', 'hc_pump', 'hc2_pump', 'hc3_pump', 'hc4_pump', 'hc5_pump', 'hc6_pump', 'circulation', 'defrost', 'heater', 'dhw_heater', 'buffer_heater', 'bypass_valve', 'solar_pump'];
// Climate and water heater entities keep their temperatures in attributes: the reading in `current_temperature`, the target in
// `temperature`. Keys ending in _target or _setpoint read the target, so one thermostat can serve as dhw_top and dhw_target.
const hfcTempAttr = (id, key) => (['climate', 'water_heater'].includes(String(id || '').split('.')[0])
  ? (/_(target|setpoint)$/.test(key || '') ? 'temperature' : 'current_temperature') : null);

// Stat tile catalog for the `tiles` option. kind: cop | energy (kWh, or W for period "now") | count | hours | classes | cost.
// legacy: entity key of the default tiles that serves as "today"; ratio: computed from two other tiles when the integration
// has no own entity (COP = heat ÷ electricity); live: current value from the schematic entities; periods: allowed periods.
const HFC_PERIODS = ['now', 'today', 'yesterday', 'week', 'month', 'year', 'total'];
// Periods that can be taken from the long-term statistics of a total counter: [calendar period, offset].
const HFC_STAT_PERIODS = { today: ['day', 0], yesterday: ['day', -1], week: ['week', 0], month: ['month', 0], year: ['year', 0] };
// Home Assistant actions a tile can carry (more-info, navigate, url, toggle, perform-action …).
const HFC_ACTIONS = ['tap_action', 'hold_action', 'double_tap_action'];
const HFC_LAYOUTS = ['default', 'compact', 'wide', 'wall'];
const HFC_ANIMATIONS = ['auto', 'always', 'off'];
const HFC_THEMES = ['auto', 'night', 'contrast'];
// Drawing of the outdoor unit: `auto` takes the style of the preset; `unit_size` picks the Vaillant aroTHERM plus class.
const HFC_UNIT_STYLES = ['auto', 'generic', 'lambda', 'vaillant', 'panasonic', 'viessmann', 'bosch', 'saunier', 'samsung'];
const HFC_UNIT_SIZES = ['small', 'medium', 'large'];
const HFC_EMITTERS = ['underfloor', 'radiator', 'column'];
// Wall display: seconds the quick controls and the details toggle stay visible after the last touch or mouse move.
const HFC_WALL_TIMEOUT = 10;
// Heating program shown as a chip: the first pattern that matches the raw state of the `program` entity (or the circuit mode) wins.
// A `program_map` (raw state → eco | night | party | holiday | none) takes precedence.
const HFC_PROGRAMS = ['eco', 'night', 'party', 'holiday'];
const HFC_PROGRAM_ICONS = {
  eco: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c2-5 5-8 9-10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  night: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" stroke-linejoin="round"/></svg>',
  party: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.6 6 .6-4.5 4 1.4 5.9L12 16l-5.3 3.1 1.4-5.9-4.5-4 6-.6z" stroke-linejoin="round"/></svg>',
  holiday: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="11" rx="2"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};
const HFC_PROGRAM_PATTERNS = [
  ['holiday', /holiday|vacation|urlaub|ferien|abwes|absence|away/],
  ['party', /party|boost|quick.?veto|powerful/],
  ['night', /night|nacht|setback|absenk|reduced|reduziert|lowered/],
  ['eco', /(^|[^a-z])eco|spar|economy/],
];
// Colours the card draws with. Every role can be restyled from a theme or card-mod with --hfc-<role>; the values here are the defaults.
const HFC_COLORS = {
  heat: '#f97316', hot: '#dc2626', cool: '#38bdf8', 'cool-strong': '#0ea5e9', defrost: '#7dd3fc',
  pv: '#f59e0b', battery: '#10b981', grid: '#94a3b8', good: '#16a34a', badge: '#a855f7', brine: '#60a5fa', ground: '#a16207',
  'flow-cold': '#fb923c', 'flow-hot': '#dc2626', 'return-cold': '#7dd3fc', 'return-hot': '#2563eb', 'tank-cold': '#3b82f6', 'tank-cool': '#22d3ee', 'tank-warm': '#f97316', 'tank-hot': '#ef4444',
  'flow-dash': 'rgba(255,255,255,.9)', anthracite: '#3b4148', casing: '#e6e9ec',
};
const hfcVar = (name) => `var(--hfc-${name}, ${HFC_COLORS[name]})`;
// Translucent fill and a darker text colour of the same role, for chips and highlighted controls.
const hfcTint = (name, pct) => `color-mix(in srgb, ${hfcVar(name)} ${pct}%, transparent)`;
const hfcInk = (name) => `color-mix(in srgb, ${hfcVar(name)} 47%, var(--primary-text-color, #212121))`;
const HFC_TILES = {
  cop_live: { live: true },
  cop_heating: { kind: 'cop', legacy: 'cop_heating_today', ratio: ['heat_heating', 'energy_heating'] },
  cop_dhw: { kind: 'cop', legacy: 'cop_dhw_today', ratio: ['heat_dhw', 'energy_dhw'] },
  cop_cooling: { kind: 'cop', ratio: ['heat_cooling', 'energy_cooling'] },
  cop_total: { kind: 'cop', ratio: ['heat', 'energy'] },
  spf: { kind: 'cop', ratio: ['heat', 'energy'], periods: ['year'], noSuffix: true },
  energy: { kind: 'energy', legacy: 'energy_today' }, env_energy: { kind: 'energy' },
  energy_heating: { kind: 'energy' }, energy_dhw: { kind: 'energy' }, energy_cooling: { kind: 'energy' },
  energy_defrost: { kind: 'energy' }, energy_standby: { kind: 'energy' }, energy_aux: { kind: 'energy' },
  heat: { kind: 'energy' }, heat_heating: { kind: 'energy' }, heat_dhw: { kind: 'energy' }, heat_cooling: { kind: 'energy' }, heat_defrost: { kind: 'energy' },
  starts: { kind: 'count', legacy: 'starts_today' },
  cycles_heating: { kind: 'count' }, cycles_dhw: { kind: 'count' }, cycles_cooling: { kind: 'count' }, defrosts: { kind: 'count' },
  hours: { kind: 'hours' },
  hours_per_start: { kind: 'hours', ratio: ['hours', 'starts'], perStart: true },
  load_classes: { kind: 'classes' },
  aux_hours: { kind: 'hours' }, aux_starts: { kind: 'count' },
  spread: { live: true }, volume: { live: true }, heat_estimated: { live: true }, power: { live: true }, heat_live: { live: true },
  compressor_speed: { live: true }, source_spread: { live: true }, outdoor: { live: true }, dhw_top: { live: true }, room: { live: true },
  brine_pressure: { live: true }, hc_pressure: { live: true },
  pv_share: { live: true },
  pv_production: { kind: 'energy' }, solar_thermal: { kind: 'energy' },
  cost: { kind: 'cost', periods: ['today', 'yesterday', 'week', 'month', 'year', 'total'] },
};

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
class HeatpumpFlowCard extends HTMLElement {
  static _ctx(hass, device, idx) {
    const states = hass?.states || {};
    const reg = hass?.entities || {};
    const ids = Object.keys(states);
    const onDevice = (e) => !device || reg[e]?.device_id === device;
    return {
      ids,
      idx,
      key: (platform, domain, tk) => ids.find((e) => e.startsWith(`${domain}.`) && reg[e]?.platform === platform
        && reg[e]?.translation_key === tk && onDevice(e)),
      // Without a registry entry (YAML entities) the platform cannot be checked; accept the pattern match.
      match: (re, platform) => ids.find((e) => re.test(e) && (!reg[e] || !platform || reg[e].platform === platform) && onDevice(e)),
      state: (id) => states[id]?.state,
    };
  }

  static getStubConfig(hass) {
    for (const [name, preset] of Object.entries(HFC_PRESETS)) {
      const ctx = HeatpumpFlowCard._ctx(hass, undefined, { hp: 1, dhw: 1, buffer: 1, hc: 1, ...(preset.index || {}) });
      if (hass && preset.detect(ctx) !== undefined) {
        const stub = { preset: name };
        // Further circuits count when the preset finds a different, reporting flow or mode entity for them.
        const base = HeatpumpFlowCard._resolve({ preset: name, hc_count: HFC_MAX_HC }, hass).fromPreset;
        const live = (id) => id && hass.states[id] && !['unknown', 'unavailable'].includes(hass.states[id].state);
        let n = 1;
        while (n < HFC_MAX_HC && preset.auto_circuits !== false && ['flow', 'mode', 'pump'].some((k) => live(base[`hc${n + 1}_${k}`]) && base[`hc${n + 1}_${k}`] !== base[`hc_${k}`])) n++;
        if (n > 1) stub.hc_count = n;
        if (preset.source_type) { const st = preset.source_type(base, hass); if (st && st !== 'air') stub.source_type = st; }
        return stub;
      }
    }
    return { preset: 'lambda' };
  }

  static getConfigElement() { return document.createElement('heatpump-flow-card-editor'); }

  static getConfigForm() { return HeatpumpFlowCard._formSchema(); }

  // Form schema. With a config, circuit fields and groups are limited to hc_count.
  static _formSchema(config, tiles) {
    const lang = (document.querySelector('home-assistant')?.hass?.locale?.language || navigator.language || 'en').slice(0, 2);
    const L = HFC_EDITOR[lang] || HFC_EDITOR.en;
    const hcCount = config ? hfcHcCount(config) : HFC_MAX_HC;
    const customLanguages = Object.keys(config?.texts || {}).filter((v) => !['en', 'de'].includes(v));
    const languageOptions = [{ value: 'auto', label: 'Auto' }, { value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' },
      ...customLanguages.map((value) => ({ value, label: value }))];
    const keep = (name) => { const m = /^hc([2-6])_/.exec(name); return !m || +m[1] <= hcCount; };
    const groups = Object.entries(HFC_ENTITY_GROUPS).filter(([sec]) => keep(sec.replace('sec_', '') + '_'));
    const hcTypeSel = (name) => ({ name, selector: { select: { mode: 'dropdown', options: HFC_EMITTERS.map((value) => ({ value, label: L[`hc_${value}`] })) } } });
    // A YAML list (sum of several entities) keeps a picker for several entities.
    const entitySchema = (key) => ({
      name: key,
      selector: { entity: HFC_BINARY_KEYS.includes(key) ? { domain: ['binary_sensor', 'switch', 'input_boolean', 'sensor'] }
        : Array.isArray(config?.entities?.[key]) ? { multiple: true } : {} },
    });
    return {
      schema: [
        {
          name: 'preset',
          selector: { select: { mode: 'dropdown', options: [{ value: 'none', label: '—' }, ...Object.entries(HFC_PRESETS).map(([k, p]) => ({ value: k, label: p.tested ? p.name : `${p.name} · ${L.untested}` }))] } },
        },
        {
          type: 'grid', name: '', schema: [
            { name: 'title', selector: { text: {} } },
            hcTypeSel('hc_type'),
            { name: 'hc_count', selector: { number: { min: 1, max: HFC_MAX_HC, step: 1, mode: 'box' } } },
            { name: 'layout', selector: { select: { mode: 'dropdown', options: HFC_LAYOUTS.map((v) => ({ value: v, label: L[`layout_${v}`] })) } } },
             { name: 'theme', selector: { select: { mode: 'dropdown', options: HFC_THEMES.map((v) => ({ value: v, label: L[`theme_${v}`] })) } } },
            ...['hc2_type', 'hc3_type', 'hc4_type', 'hc5_type', 'hc6_type'].filter(keep).map(hcTypeSel),
          ],
        },
        {
          name: 'controls',
          selector: { entity: { multiple: true, domain: HFC_CONTROL_DOMAINS } },
        },
        // Tile selection (editor only): a sortable list of the tiles this installation can fill.
        ...(tiles ? [{ name: 'tiles_custom', selector: { boolean: {} } }] : []),
        ...(tiles && tiles.editable && Array.isArray(config.tiles)
          ? [{ name: 'tiles', selector: { select: { multiple: true, reorder: true, mode: 'dropdown', options: tiles.options } } }] : []),
        // Price for the cost tile: a fixed number or an entity (both write `price`).
        ...(tiles && Array.isArray(config.tiles) ? [{
          type: 'grid', name: '', schema: [
            { name: 'price_fixed', selector: { number: { min: 0, max: 10, step: 0.001, mode: 'box' } } },
            { name: 'price_entity', selector: { entity: { domain: ['sensor', 'input_number', 'number'] } } },
          ],
        }] : []),
        ...groups.map(([sec, keys]) => ({
          type: 'expandable', name: 'entities', title: L[sec], schema: keys.map(entitySchema),
        })),
        {
          type: 'expandable', name: 'advanced', flatten: true, title: L.sec_advanced, schema: [{
            type: 'grid', name: '', schema: [
              { name: 'prefix', selector: { text: {} } },
              { name: 'device', selector: { device: {} } },
              { name: 'source_type', selector: { select: { mode: 'dropdown', options: ['air', 'brine', 'water'].map((v) => ({ value: v, label: L[`src_${v}`] })) } } },
              { name: 'power_sources', selector: { select: { mode: 'dropdown', options: [{ value: 'auto', label: L.ps_auto }, { value: 'manual', label: L.ps_manual }] } } },
              { name: 'errors', selector: { entity: { multiple: true } } },
              { name: 'error_ok_text', selector: { text: {} } },
              { name: 'power_threshold', selector: { number: { min: 0, max: 2000, step: 10, mode: 'box', unit_of_measurement: 'W' } } },
              { name: 'animations', selector: { select: { mode: 'dropdown', options: HFC_ANIMATIONS.map((v) => ({ value: v, label: L[`animations_${v}`] })) } } },
              { name: 'flow_speed', selector: { number: { min: 0.2, max: 3, step: 0.1, mode: 'slider' } } },
              { name: 'source_spread', selector: { boolean: {} } },
              ...['brine_pressure_min', 'brine_pressure_crit', 'brine_pressure_max', 'hc_pressure_min', 'hc_pressure_crit', 'hc_pressure_max']
                .map((name) => ({ name, selector: { number: { min: 0, max: 20, step: 0.1, mode: 'box', unit_of_measurement: 'bar' } } })),
              { name: 'language', selector: { select: { mode: 'dropdown', options: languageOptions } } },
              { name: 'fullscreen', selector: { boolean: {} } },
              { name: 'hc_return_label', selector: { boolean: {} } },
              { name: 'series_buffer', selector: { boolean: {} } },
              ...['hc_name', 'hc2_name', 'hc3_name', 'hc4_name', 'hc5_name', 'hc6_name'].filter(keep).map((name) => ({ name, selector: { text: {} } })),
              { name: 'unit_style', selector: { select: { mode: 'dropdown', options: HFC_UNIT_STYLES.map((v) => ({ value: v, label: L[`unit_${v}`] })) } } },
              ...(config && (config.unit_style === 'vaillant' || ((!config.unit_style || config.unit_style === 'auto') && config.preset === 'vaillant'))
                ? [{ name: 'unit_size', selector: { select: { mode: 'dropdown', options: HFC_UNIT_SIZES.map((v) => ({ value: v, label: L[`size_${v}`] })) } } }] : []),
              { name: 'primary_pump', selector: { boolean: {} } },
              { name: 'timeline', selector: { boolean: {} } },
              ...(config && config.timeline ? [{ name: 'timeline_hours', selector: { number: { min: 3, max: 72, step: 1, mode: 'box', unit_of_measurement: 'h' } } }, { name: 'timeline_marks', selector: { boolean: {} } }] : []),
              { name: 'details_open', selector: { boolean: {} } },
              ...(config && config.layout === 'wall' ? [{ name: 'wall_timeout', selector: { number: { min: 0, max: 600, step: 1, mode: 'box', unit_of_measurement: 's' } } }] : []),
            ],
          }],
        },
      ],
      // Keys of circuits 2 to 6 reuse the labels of circuit 1 (hc2_flow → hc_flow, hc2_room → room).
      computeLabel: (s) => L[s.name] || L[String(s.name).replace(/^hc[2-6]_/, 'hc_')] || L[String(s.name).replace(/^hc[2-6]_/, '')]
        || (HFC_I18N[lang] || HFC_I18N.en).det[s.name] || s.name,
      L,
    };
  }

  static _language(config, hass) {
    const raw = String(config?.language && config.language !== 'auto'
      ? config.language : (hass?.locale?.language || hass?.language || navigator.language || 'en')).toLowerCase().replace('_', '-');
    const exact = raw; const base = raw.split('-')[0]; const custom = config?.texts || {};
    if (HFC_I18N[exact] || custom[exact]) return exact;
    if (HFC_I18N[base] || custom[base]) return base;
    return 'en';
  }

  static _texts(config, hass) {
    const lang = HeatpumpFlowCard._language(config, hass);
    const base = lang.split('-')[0]; const custom = config?.texts || {};
    return hfcTextMerge(HFC_I18N.en, HFC_I18N[base], HFC_I18N[lang], custom[base], custom[lang]);
  }

  static _validateTexts(texts) {
    if (!texts || typeof texts !== 'object' || Array.isArray(texts)) throw new Error('texts must map language codes to text objects');
    const visit = (value, reference, path) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object`);
      Object.entries(value).forEach(([key, child]) => {
        if (!Object.prototype.hasOwnProperty.call(reference, key)) throw new Error(`Unknown text key "${path}.${key}"`);
        const expected = reference[key];
        if (expected && typeof expected === 'object') visit(child, expected, `${path}.${key}`);
        else if (typeof child !== 'string') throw new Error(`${path}.${key} must be text`);
      });
    };
    Object.entries(texts).forEach(([lang, value]) => {
      if (!/^[a-z]{2,8}(?:-[a-z0-9]{2,8})*$/.test(lang)) throw new Error(`Invalid language code "${lang}" in texts (use lowercase, for example nl or pt-br)`);
      visit(value, HFC_I18N.en, `texts.${lang}`);
    });
  }

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    if (config.preset && config.preset !== 'none' && !HFC_PRESETS[config.preset]) {
      throw new Error(`Unknown preset "${config.preset}". Available: ${Object.keys(HFC_PRESETS).join(', ')}`);
    }
    ['hc_type', 'hc2_type', 'hc3_type', 'hc4_type', 'hc5_type', 'hc6_type'].forEach((k) => {
      if (config[k] && !HFC_EMITTERS.includes(config[k])) throw new Error(`${k} must be one of: ${HFC_EMITTERS.join(', ')}`);
    });
    if (config.source_type && !['air', 'brine', 'water'].includes(config.source_type)) {
      throw new Error('source_type must be "air", "brine" or "water"');
    }
    if (config.tiles !== undefined && config.tiles !== null) {
      if (!Array.isArray(config.tiles)) throw new Error('tiles must be a list');
      config.tiles.forEach((t) => {
        const s = HeatpumpFlowCard._tileSpec(t);
        if (s && s.key !== undefined && !HFC_TILES[s.key]) throw new Error(`Unknown tile "${s.key}". Available: ${Object.keys(HFC_TILES).join(', ')}`);
        if (s && s.period !== undefined && !HFC_PERIODS.includes(s.period)) throw new Error(`Unknown tile period "${s.period}". Available: ${HFC_PERIODS.join(', ')}`);
      });
    }
    if (config.layout !== undefined && config.layout !== null && !HFC_LAYOUTS.includes(config.layout)) {
      throw new Error(`layout must be one of: ${HFC_LAYOUTS.join(', ')}`);
    }
    if (config.animations !== undefined && config.animations !== null && !HFC_ANIMATIONS.includes(config.animations)) {
      throw new Error(`animations must be one of: ${HFC_ANIMATIONS.join(', ')}`);
    }
    if (config.theme !== undefined && config.theme !== null && !HFC_THEMES.includes(config.theme)) {
      throw new Error(`theme must be one of: ${HFC_THEMES.join(', ')}`);
    }
    if (config.fullscreen !== undefined && config.fullscreen !== null && typeof config.fullscreen !== 'boolean') {
      throw new Error('fullscreen must be true or false');
    }
    if (config.series_buffer !== undefined && config.series_buffer !== null && typeof config.series_buffer !== 'boolean') {
      throw new Error('series_buffer must be true or false');
    }
    if (config.primary_pump !== undefined && config.primary_pump !== null && typeof config.primary_pump !== 'boolean') {
      throw new Error('primary_pump must be true or false');
    }
    if (config.texts !== undefined && config.texts !== null) HeatpumpFlowCard._validateTexts(config.texts);
    if (config.flow_speed !== undefined && config.flow_speed !== null && config.flow_speed !== '' && !(+config.flow_speed >= 0.2 && +config.flow_speed <= 3)) {
      throw new Error('flow_speed must be a number from 0.2 to 3');
    }
    if (config.source_spread !== undefined && config.source_spread !== null && typeof config.source_spread !== 'boolean') {
      throw new Error('source_spread must be true or false');
    }
    ['brine_pressure_min', 'brine_pressure_crit', 'brine_pressure_max', 'hc_pressure_min', 'hc_pressure_crit', 'hc_pressure_max'].forEach((key) => {
      if (config[key] !== undefined && config[key] !== null && config[key] !== '' && !(Number.isFinite(+config[key]) && +config[key] >= 0)) throw new Error(`${key} must be a number of bar, 0 or more`);
    });
    ['brine', 'hc'].forEach((kind) => {
      const critical = config[`${kind}_pressure_crit`]; const minimum = config[`${kind}_pressure_min`]; const maximum = config[`${kind}_pressure_max`];
      if (critical !== undefined && critical !== null && critical !== '' && minimum !== undefined && minimum !== null && minimum !== '' && +critical > +minimum) throw new Error(`${kind}_pressure_crit must be less than or equal to ${kind}_pressure_min`);
      if (minimum !== undefined && minimum !== null && minimum !== '' && maximum !== undefined && maximum !== null && maximum !== '' && +minimum > +maximum) throw new Error(`${kind}_pressure_min must be less than or equal to ${kind}_pressure_max`);
    });
    if (config.wall_timeout !== undefined && config.wall_timeout !== null && !(+config.wall_timeout >= 0)) {
      throw new Error('wall_timeout must be a number of seconds, 0 or more');
    }
    if (config.timeline !== undefined && config.timeline !== null && typeof config.timeline !== 'boolean') throw new Error('timeline must be true or false');
    if (config.timeline_hours !== undefined && config.timeline_hours !== null && !(+config.timeline_hours > 0)) throw new Error('timeline_hours must be a number of hours above 0 (3 to 72)');
    if (config.timeline_marks !== undefined && config.timeline_marks !== null && typeof config.timeline_marks !== 'boolean') {
      if (!Array.isArray(config.timeline_marks)) throw new Error('timeline_marks must be true or a list of entities');
      config.timeline_marks.forEach((m) => { if (!(typeof m === 'string' ? m : m && m.entity)) throw new Error('timeline_marks: every entry needs an entity'); });
    }
    if (config.unit_style !== undefined && config.unit_style !== null && !HFC_UNIT_STYLES.includes(config.unit_style)) {
      throw new Error(`unit_style must be one of: ${HFC_UNIT_STYLES.join(', ')}`);
    }
    if (config.unit_size !== undefined && config.unit_size !== null && !HFC_UNIT_SIZES.includes(config.unit_size)) {
      throw new Error(`unit_size must be one of: ${HFC_UNIT_SIZES.join(', ')}`);
    }
    if (config.program_map !== undefined && config.program_map !== null && (typeof config.program_map !== 'object' || Array.isArray(config.program_map))) {
      throw new Error(`program_map must map raw states to ${HFC_PROGRAMS.join(', ')} or none`);
    }
    if (config.errors !== undefined && (!Array.isArray(config.errors) || config.errors.some((id) => typeof id !== 'string'))) {
      throw new Error('errors must be a list of entity ids');
    }
    if (config.error_ok !== undefined && (!Array.isArray(config.error_ok) || config.error_ok.some((state) => typeof state !== 'string'))) {
      throw new Error('error_ok must be a list of text states');
    }
    if (config.compressor_speed_max !== undefined && config.compressor_speed_max !== null && !(+config.compressor_speed_max > 0)) {
      throw new Error('compressor_speed_max must be a number above 0 (the Hz or rpm that count as full speed)');
    }
    if (config.actions !== undefined && config.actions !== null) {
      if (typeof config.actions !== 'object' || Array.isArray(config.actions)) throw new Error('actions must map entity keys to actions, e.g. {dhw_top: {tap_action: {action: navigate, navigation_path: /dhw}}}');
      if (Object.values(config.actions).some((a) => !a || typeof a !== 'object')) throw new Error('every entry of actions needs tap_action, hold_action or double_tap_action');
    }
    [config, ...(config.tiles || []), ...(config.stats || []), ...(config.badges || []), ...Object.values(config.actions || {})].forEach((s) => {
      if (!s || typeof s !== 'object') return;
      if (s.price !== undefined && s.price !== null && !['number', 'string'].includes(typeof s.price)) throw new Error('price must be a number or an entity');
      HFC_ACTIONS.forEach((a) => { if (s[a] !== undefined && (!s[a] || typeof s[a] !== 'object')) throw new Error(`${a} must be an action, e.g. {action: navigate, navigation_path: /energy}`); });
    });
    if (config.fullscreen === false && this._fullscreenOpen) this._closeFullscreen(false, false);
    this._config = config;
    this._textCache = null;
    const preset = HFC_PRESETS[config.preset];
    this._preset = preset;
    this._idx = { hp: 1, dhw: 1, buffer: 1, hc: 1, ...(preset?.index || {}), ...(config.index || {}) };
    this._maps = {
      mode: { ...(preset?.mode_map || {}), ...(config.mode_map || {}) },
      dhw: { ...(preset?.dhw_mode_map || {}), ...(config.dhw_mode_map || {}) },
      buffer: { ...(preset?.buffer_mode_map || {}), ...(config.buffer_mode_map || {}) },
      hc: { ...(preset?.hc_mode_map || {}), ...(config.hc_mode_map || {}) },
    };
    this._runningStates = config.running_states || preset?.running_states || [];
    this._statusLabels = preset?.status_labels || {};
    this._statLabels = preset?.stat_labels || {};
    this._errorOk = (config.error_ok || preset?.error_ok || []).map((state) => state.trim().toLowerCase()).filter(Boolean);
    this._badges = config.badges || [];
    this._layout = HFC_LAYOUTS.includes(config.layout) ? config.layout : 'default';
    this._animations = HFC_ANIMATIONS.includes(config.animations) ? config.animations : 'auto';
    this._theme = HFC_THEMES.includes(config.theme) ? config.theme : 'auto';
    this._flowSpeed = +config.flow_speed >= 0.2 && +config.flow_speed <= 3 ? +config.flow_speed : 1;
    this._sourceSpread = config.source_spread !== false;
    this._hcType = config.hc_type || preset?.hc_type || 'underfloor';
    this._hcCount = hfcHcCount(config);
    this._hcTypes = [this._hcType, ...[2, 3, 4, 5, 6].map((n) => config[`hc${n}_type`] || 'underfloor')];
    this._sourceType = config.source_type || 'air';
    this._threshold = Number.isFinite(+config.power_threshold) && config.power_threshold !== '' && config.power_threshold !== undefined ? +config.power_threshold : 100;
    this._needsBuild = true;
    this._lastTry = 0;
    this._rendered = false;
    this._e = this._e || {};
    this._tileMap = this._tileMap || {};
    this._errors = this._errors || [];
    if (this.shadowRoot && this._hass) { try { this._build(); this._render(); this._update(); } catch (err) { this._fail(err); } }
  }

  // Resolves preset + user entities. Needs hass for detection and registry lookups.
  // Resolves preset and user entities. Used by the card and by the editor (which shows what the preset found).
  static _resolve(config, hass) {
    const preset = HFC_PRESETS[config.preset];
    const idx = { hp: 1, dhw: 1, buffer: 1, hc: 1, ...(preset?.index || {}), ...(config.index || {}) };
    const hcCount = hfcHcCount(config);
    const ctx =HeatpumpFlowCard._ctx(hass, config.device, idx);
    let prefix = config.prefix;
    let ready = true;
    if (preset && (prefix === undefined || prefix === null || prefix === '' || prefix === 'auto')) {
      prefix = preset.detect ? preset.detect(ctx) : '';
      if (prefix === undefined) { prefix = ''; ready = false; }
    }
    prefix = String(prefix || '').trim().toLowerCase();
    const fromPreset = {};
    const take = (k, v) => {
      const list = (Array.isArray(v) ? v : [v]).filter(Boolean);
      // First candidate with a value; one that exists but is unavailable or unknown (not reported by this model) yields to a later one.
      const live = (id) => hass.states[id] && !['unknown', 'unavailable'].includes(hass.states[id].state);
      const hit = list.find(live) || list.find((id) => hass.states[id]) || list[0];
      if (hit) fromPreset[k] = hit;
    };
    if (preset) Object.entries(preset.entities(prefix, idx, ctx)).forEach(([k, v]) => take(k, v));
    for (let n = 2; preset && n <= hcCount; n++) {
      const rawN = preset.entities(prefix, { ...idx, hc: idx.hc + n - 1 }, ctx);
      // hc_pressure is the pressure of the whole heating system, drawn at circuit 1 only.
      Object.entries(rawN).filter(([k]) => k.startsWith('hc_') && k !== 'hc_pressure').forEach(([k, v]) => take(`hc${n}_${k.slice(3)}`, v));
    }
    const e = { ...fromPreset };
    const sums = {};
    // User entities override the preset; null or "none" removes a preset entity.
    // A list adds the values of its entities (power, heat and the power sources), e.g. two S0 meters; the first one stands for the key.
    Object.entries(config.entities || {}).forEach(([k, v]) => {
      if (v === null || v === 'none') delete e[k];
      else if (Array.isArray(v)) {
        const ids = v.filter(Boolean);
        if (ids.length) e[k] = ids[0];
        if (ids.length > 1) sums[k] = ids;
      } else if (v) e[k] = v;
    });
    const presetErrors = preset && preset.errors ? preset.errors(prefix, idx, ctx) : [];
    const errors = config.errors !== undefined ? config.errors : presetErrors;
    // Stat tile entities: { tile: { period: entity } }, only entities that exist.
    const tiles = {};
    if (preset && preset.tiles) {
      Object.entries(preset.tiles(prefix, idx, ctx)).forEach(([k, periods]) => Object.entries(periods || {}).forEach(([period, v]) => {
        const hit = (Array.isArray(v) ? v : [v]).filter(Boolean).find((id) => hass.states[id]);
        if (hit) (tiles[k] = tiles[k] || {})[period] = hit;
      }));
    }
    // Total counters configured directly are also tile sources. Their calendar periods come from long-term statistics.
    [['energy_total', 'energy'], ['env_energy', 'env_energy'], ['heat_total', 'heat']].forEach(([entityKey, tileKey]) => {
      if (e[entityKey] && hass.states[e[entityKey]]) (tiles[tileKey] = tiles[tileKey] || {}).total = e[entityKey];
    });
    return { preset, prefix, ready, idx, fromPreset, entities: e, sums, presetErrors, errors, tiles };
  }

  // Plain-text support report. It is created locally and contains only the mappings used by this card, never registry
  // dumps, credentials or network data. Entity ids may still contain personal names, so the report starts with a warning.
  static _diagnosticReport(config, hass) {
    config = config || {};
    const r = HeatpumpFlowCard._resolve(config, hass);
    const clean = (value) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
    const entityLine = (key, id) => {
      if (!id) return `- ${key}: not mapped`;
      const st = hass.states[id];
      if (!st) return `- ${key}: ${id} = unavailable (entity not found)`;
      const unit = clean(st.attributes?.unit_of_measurement);
      const attr = hfcTempAttr(id, key);
      return `- ${key}: ${id} = ${clean(st.state) || '(empty)'}${unit ? ` ${unit}` : ''}${attr ? ` (${attr} ${clean(st.attributes?.[attr]) || '(empty)'})` : ''}`;
    };
    const keys = [...HFC_DIAGNOSTIC_KEYS, ...Object.keys(r.entities).filter((key) => !HFC_DIAGNOSTIC_KEYS.includes(key))];
    const lines = [
      'Heat Pump Hydraulic Card diagnostic report',
      'Privacy: entity ids can contain personal names. Review this text before sharing it.',
      '',
      `Card version: ${HFC_VERSION}`,
      `Loaded from: ${clean(HFC_SCRIPT_URL.replace(/[?#].*$/, '')) || 'unknown'}`,
      `Home Assistant: ${clean(hass.config?.version) || 'unknown'}`,
      `Browser language: ${clean(navigator.language) || 'unknown'}`,
      `Card language: ${HeatpumpFlowCard._language(config, hass)}`,
      `Preset: ${clean(config.preset) || 'none'}`,
      `Preset detected: ${r.preset ? (r.ready ? 'yes' : 'no') : 'not used'}`,
      `Prefix: ${r.prefix || '(none)'}`,
      `Source type: ${config.source_type || 'air'}`,
      `Heating circuits: ${hfcHcCount(config)}`,
      `Layout: ${config.layout || 'default'}`,
      '',
      'Entity mappings:',
      ...keys.flatMap((key) => (r.sums[key] ? r.sums[key].map((id, n) => entityLine(`${key} (sum ${n + 1})`, id)) : [entityLine(key, r.entities[key])])),
      '',
      'Error entities:',
      ...(r.errors?.length ? r.errors.map((id, n) => entityLine(`error_${n + 1}`, id)) : ['- none']),
      '',
      'Quick controls:',
      ...((config.controls || []).length ? (config.controls || []).map((c, n) => entityLine(`control_${n + 1}`, typeof c === 'string' ? c : c?.entity)) : ['- none']),
    ];
    return lines.join('\n');
  }

  _build() {
    const r = HeatpumpFlowCard._resolve(this._config, this._hass);
    this._e = r.entities;
    this._sums = r.sums;
    this._errors = r.errors;
    this._tileMap = r.tiles;
    // Preset sensors whose refrigerant role holds only in heating; an entity set in the config keeps its role.
    this._heatingRoles = (r.preset?.heating_roles || []).filter((k) => this._e[k] && this._e[k] === r.fromPreset[k] && !(this._config.entities || {})[k]);
    // An action for a key without an entity does nothing; say so once instead of failing silently.
    if (r.ready && this._config.actions) {
      const lost = Object.keys(this._config.actions).filter((k) => !this._e[k] && !(this._warned || (this._warned = {}))[k]);
      lost.forEach((k) => { this._warned[k] = true; console.warn(`heatpump-flow-card: actions.${k} has no entity (check the key or the preset)`); });
    }
    this._needsBuild = !r.ready;
    this._lastTry = Date.now();
  }

  static _energyInfo(prefs) {
    const sources = prefs?.energy_sources || [];
    const rate = (src) => {
      const pc = src.power_config;
      if (pc && (pc.stat_rate_from || pc.stat_rate_to)) return { from: pc.stat_rate_from, to: pc.stat_rate_to };
      if (pc && pc.stat_rate) return { id: pc.stat_rate, inv: !!pc.stat_rate_inverted };
      return src.stat_rate ? { id: src.stat_rate } : null;
    };
    const configured = {}; const missing = [];
    const of = (type) => {
      const found = sources.filter((s) => s.type === type);
      const rates = found.map(rate).filter(Boolean);
      configured[type] = found.length > 0;
      if (found.length > rates.length) missing.push(type);
      return rates;
    };
    return { energy: { solar: of('solar'), battery: of('battery'), grid: of('grid') }, configured, missing };
  }

  // PV / battery / grid power from the Energy dashboard (its "stat_rate" power sensors), loaded once per page.
  // Conventions of the Energy dashboard: battery positive = discharging, grid positive = import.
  _loadEnergy() {
    if (this._energyReq || this._config.power_sources === 'manual' || typeof this._hass.callWS !== 'function') return;
    this._energyReq = true;
    HeatpumpFlowCard._energyPrefs = HeatpumpFlowCard._energyPrefs || this._hass.callWS({ type: 'energy/get_prefs' });
    HeatpumpFlowCard._energyPrefs.then((prefs) => {
      const { energy, configured, missing } = HeatpumpFlowCard._energyInfo(prefs);
      this._energy = energy.solar.length || energy.battery.length || energy.grid.length ? energy : null;
      this._energyConfigured = configured;
      this._energyMissing = missing;
      if (this._hass) { this._rendered = false; this.hass = this._hass; }
    }).catch(() => { this._energy = null; this._energyConfigured = {}; this._energyMissing = []; });
  }

  // Manual pv/battery/grid entities win; otherwise the Energy dashboard is used (needs the heat pump power).
  _powerMode() {
    if (['pv', 'battery', 'grid'].some((k) => this._has(k))) return 'manual';
    if (this._energy && this._config.power_sources !== 'manual' && this._has('power')) return 'energy';
    return '';
  }

  _rateW(r) {
    const w = (id) => {
      const st = id && this._hass.states[id]; const v = parseFloat(st?.state);
      if (!Number.isFinite(v)) return NaN;
      return String(st.attributes?.unit_of_measurement || '').toLowerCase() === 'kw' ? v * 1000 : v;
    };
    if (r.id) return w(r.id) * (r.inv ? -1 : 1);
    return (r.from ? w(r.from) : 0) - (r.to ? w(r.to) : 0);
  }

  // Splits the heat pump's power by the house's current supply mix: PV used in the house, battery discharge, grid import.
  // PV first covers battery charging and export. Returns W per source, or null while a sensor is unavailable.
  _energySplit() {
    const sum = (list) => list.reduce((a, r) => a + this._rateW(r), 0);
    const values = {}; const unknown = [];
    [['pv', 'solar'], ['battery', 'battery'], ['grid', 'grid']].forEach(([key, type]) => {
      const value = sum(this._energy[type] || []);
      const incomplete = this._energyMissing?.includes(type);
      if (incomplete || (this._energyConfigured?.[type] && !Number.isFinite(value))) unknown.push(key);
      values[key] = Number.isFinite(value) && !incomplete ? value : 0;
    });
    if (unknown.length > 1) return null;
    const pv = values.pv; const bat = values.battery; const grid = values.grid;
    const charge = Math.max(-bat, 0); const discharge = Math.max(bat, 0);
    const imp = Math.max(grid, 0); const exp = Math.max(-grid, 0);
    const pvHome = Math.max(Math.max(pv, 0) - charge - exp, 0);
    const hp = Math.max(this._w('power'), 0);
    if (!Number.isFinite(hp) || hp <= 50) return { pv: 0, battery: 0, grid: 0 };
    const shares = { pv: pvHome, battery: discharge, grid: imp };
    if (unknown.length === 1) {
      const known = Object.entries(shares).filter(([key]) => key !== unknown[0]).reduce((total, [, value]) => total + value, 0);
      shares[unknown[0]] = Math.max(hp - known, 0);
    }
    const total = shares.pv + shares.battery + shares.grid;
    if (!(total > 50) || !Number.isFinite(hp)) return { pv: 0, battery: 0, grid: 0 };
    return { pv: hp * shares.pv / total, battery: hp * shares.battery / total, grid: hp * shares.grid / total };
  }

  getCardSize() { return 9 + (this._hcCount || 1) * 3 - 3; }
  getGridOptions() { return { columns: 'full', min_columns: 6, rows: 'auto' }; }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    if (!this._config) return;
    try { this._apply(); } catch (err) { this._fail(err); }
  }

  _apply() {
    // Retry detection at most every 30 s while the integration's entities are not there yet.
    if (this._needsBuild && (!this._rendered || Date.now() - this._lastTry > 30000)) { this._build(); this._rendered = false; }
    this._loadEnergy();
    const sig = this._layoutSignature();
    if (!this._rendered || sig !== this._sig) this._render();
    this._update();
  }

  // Unexpected data must not leave an empty card: show a short message and log the details once.
  _fail(err) {
    if (!this._failed) console.error('heatpump-flow-card:', err);
    this._failed = true;
    this._rendered = false;
    const msg = this._esc(err && err.message ? err.message : String(err));
    this.shadowRoot.innerHTML = `<style>${HeatpumpFlowCard.styles}</style><ha-card><div class="hint">Heatpump Flow Card: ${msg}<br>Details in the browser console. Please report it: github.com/Sturmi77/heatpump-hydraulic-card/issues</div></ha-card>`;
  }

  /* ---------- helpers ---------- */
  get _lang() { return HeatpumpFlowCard._language(this._config, this._hass); }
  get _i() {
    const lang = this._lang; const texts = this._config?.texts;
    if (!this._textCache || this._textCache.lang !== lang || this._textCache.texts !== texts) {
      this._textCache = { lang, texts, value: HeatpumpFlowCard._texts(this._config, this._hass) };
    }
    return this._textCache.value;
  }
  _st(key) { const id = this._e[key]; return id && this._hass ? this._hass.states[id] : undefined; }
  _has(key) { return !!this._st(key); }
  _s(key) { return this._st(key)?.state; }
  _n(key) {
    const attr = hfcTempAttr(this._e[key], key);
    const v = parseFloat(attr ? this._st(key)?.attributes?.[attr] : this._s(key));
    return Number.isFinite(v) ? v : NaN;
  }
  _unit(key) { return String(this._st(key)?.attributes?.unit_of_measurement || '').toLowerCase(); }
  // Unit-aware readings: power in W, heat in kW, flow rates in l/h. A list of entities gives the sum of the members that report a number.
  _w(key) { return this._sum(key, 'kw', (v) => v * 1000); }
  _kw(key) { return this._sum(key, 'w', (v) => v / 1000); }
  _sum(key, unit, convert) {
    const read = (st) => { const v = parseFloat(st?.state); return String(st?.attributes?.unit_of_measurement || '').toLowerCase() === unit ? convert(v) : v; };
    if (!this._sums?.[key]) { const v = read(this._st(key)); return Number.isFinite(v) ? v : NaN; }
    const values = this._sums[key].map((id) => read(this._hass?.states[id])).filter(Number.isFinite);
    return values.length ? values.reduce((a, b) => a + b, 0) : NaN;
  }
  _lh(key) {
    const v = this._n(key); const u = this._unit(key).replace('³', '3');
    if (u === 'm3/h') return v * 1000;
    if (u === 'l/min') return v * 60;
    return v;
  }
  // Hydraulic pressure normalized to bar. Unknown or missing units are treated as bar for simple numeric helpers.
  _pressure(key) {
    const v = this._n(key); const u = this._unit(key).replace(/\s/g, '');
    if (!Number.isFinite(v)) return NaN;
    if (u === 'pa') return v / 100000;
    if (u === 'hpa') return v / 1000;
    if (u === 'kpa') return v / 100;
    if (u === 'mpa') return v * 10;
    if (u === 'psi') return v * 0.0689476;
    return v;
  }
  _pressureState(kind, value) {
    if (!Number.isFinite(value)) return 'normal';
    const c = +this._config[`${kind}_pressure_crit`]; const min = +this._config[`${kind}_pressure_min`]; const max = +this._config[`${kind}_pressure_max`];
    if (this._config[`${kind}_pressure_crit`] !== undefined && this._config[`${kind}_pressure_crit`] !== '' && value <= c) return 'critical';
    if ((this._config[`${kind}_pressure_min`] !== undefined && this._config[`${kind}_pressure_min`] !== '' && value < min)
      || (this._config[`${kind}_pressure_max`] !== undefined && this._config[`${kind}_pressure_max`] !== '' && value > max)) return 'warning';
    return 'normal';
  }
  _pressureText(key) { const v = this._pressure(key); return Number.isFinite(v) ? `${this._fmt(v, 1)} bar` : '–'; }
  _updatePressure(key, kind, groupId, textId, label) {
    const group = this._$(groupId); if (!group) return;
    const value = this._pressure(key); const state = this._pressureState(kind, value);
    group.classList.toggle('warning', state === 'warning'); group.classList.toggle('critical', state === 'critical');
    const glyph = state === 'critical' ? '⚠ ' : state === 'warning' ? '! ' : '';
    this._txt(textId, `${glyph}${label} ${this._pressureText(key)}`);
    group.dataset.a11y = `${label}: ${this._pressureText(key)}, ${this._i[`pressure_${state}`]}`;
  }
  _on(key) { return ['on', 'true', 'open', '1', 'ein'].includes(String(this._s(key)).toLowerCase()); }
  // Defrost and cooling run the refrigerant circuit backwards: the outdoor heat exchanger is the condenser then.
  _reversedCycle() {
    return ['defrost', 'cooling'].includes(this._norm(this._maps.mode, this._s('mode')))
      || String(this._s('status') || '').toUpperCase().includes('DEFROST') || (this._has('defrost') && this._on('defrost'));
  }
  // Compressor modulation 0..1 from `compressor_speed` (percent; Hz or rpm against `compressor_speed_max`), NaN without a usable value.
  _speedFraction() {
    const v = this._n('compressor_speed');
    if (!Number.isFinite(v)) return NaN;
    const u = this._unit('compressor_speed');
    const max = +this._config.compressor_speed_max;
    const full = max > 0 ? max : (u === 'rpm' || u.includes('min') ? 6000 : 100);
    return Math.min(Math.max(v / full, 0), 1);
  }
  // Heating program (eco, night, party, holiday) from the `program` entity, else from the circuit mode; kind 'none' when it matches nothing.
  _program() {
    const key = this._has('program') ? 'program' : (this._has('hc_mode') ? 'hc_mode' : '');
    if (!key) return null;
    const raw = String(this._s(key));
    const map = { ...(this._preset?.program_map || {}), ...(this._config.program_map || {}) };
    const mapped = this._norm(map, raw);
    let kind = HFC_PROGRAMS.includes(mapped) ? mapped : 'none';
    if (kind === 'none' && mapped !== 'none') {
      const hit = HFC_PROGRAM_PATTERNS.find(([, re]) => re.test(raw.toLowerCase()));
      if (hit) kind = hit[0];
    }
    return { kind, entity: this._e[key] };
  }
  // Heater level: 0 = off, 1 = on / stage 1, 2-3 = stage. Binary, on/off text, power (> 0) or a stage number.
  _level(key) {
    if (!this._has(key)) return 0;
    const s = String(this._s(key)).toLowerCase();
    if (['on', 'true', 'open', 'ein'].includes(s)) return 1;
    const v = parseFloat(s);
    if (!Number.isFinite(v) || v <= 0) return 0;
    return ['w', 'kw', '%'].includes(this._unit(key)) ? 1 : Math.min(Math.round(v), 3);
  }
  _hk(n, key) { return n === 1 ? `hc_${key}` : `hc${n}_${key}`; }
  _norm(map, raw) { if (raw === undefined) return ''; return map[raw] || map[String(raw).toUpperCase()] || map[String(raw).toLowerCase()] || String(raw).toLowerCase(); }
  _fmt(v, d = 1) {
    const loc = this._hass?.locale?.language || this._lang;
    return Number.isFinite(v) ? v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d }) : '–';
  }
  _t(v) { return Number.isFinite(v) ? `${this._fmt(v)} °C` : '– °C'; }
  _modeLabel(m, raw) { return this._i.modes[m] || raw || '–'; }
  _statLabel(key, fallback) { return this._statLabels[key]?.[this._lang] || this._statLabels[key]?.en || fallback; }
  // Colour scales follow hydraulic convention: flow red/orange, return blue, tanks blue (cold) → red (hot).
  // The end colours are the --hfc-*-cold / --hfc-*-hot variables, mixed in the browser.
  _mix(cold, hot, t, lo, hi) {
    if (!Number.isFinite(t)) return 'var(--disabled-text-color, #9e9e9e)';
    const f = Math.min(Math.max((t - lo) / (hi - lo), 0), 1);
    return `color-mix(in oklch, ${hfcVar(hot)} ${Math.round(f * 100)}%, ${hfcVar(cold)})`;
  }
  // Tank scale in four steps (cold, cool, warm, hot), each step mixed in oklch.
  _tankColor(t) {
    if (!Number.isFinite(t)) return 'var(--disabled-text-color, #9e9e9e)';
    const stops = ['tank-cold', 'tank-cool', 'tank-warm', 'tank-hot'];
    const x = Math.min(Math.max((t - 20) / (58 - 20), 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(x), stops.length - 2);
    return `color-mix(in oklch, ${hfcVar(stops[i + 1])} ${Math.round((x - i) * 100)}%, ${hfcVar(stops[i])})`;
  }
  // Pipes without a temperature sensor keep their conventional base colour instead of turning grey.
  _vlColor(t) { return Number.isFinite(t) ? this._mix('flow-cold', 'flow-hot', t, 25, 55) : `color-mix(in srgb, ${hfcVar('flow-cold')} 60%, #fff)`; }
  _rlColor(t) { return Number.isFinite(t) ? this._mix('return-cold', 'return-hot', t, 20, 45) : `color-mix(in srgb, ${hfcVar('return-cold')} 75%, #fff)`; }
  _$(id) { return this.shadowRoot.getElementById(id); }
  // Status line of the heat pump block: one line, or mode on top and status below when it is too long for the block (the text of an
  // SVG does not wrap by itself). A single long word is squeezed to the width of the block.
  _hpStatus(text) {
    const el = this._$('t-hp-status');
    if (!el) return;
    const ku = parseFloat(getComputedStyle(this._$('svg')).getPropertyValue('--ku')) || 1;
    const key = `${text}|${ku}`;
    if (el._k === key) return;
    el._k = key;
    const long = text.length * 7.4 * ku > 216;
    const parts = long ? text.split(' · ') : [text];
    const wrapped = parts.length > 1;
    el.textContent = '';
    if (wrapped) {
      const NS = 'http://www.w3.org/2000/svg';
      const a = document.createElementNS(NS, 'tspan'); a.setAttribute('x', 170); a.textContent = parts[0];
      const b = document.createElementNS(NS, 'tspan'); b.setAttribute('x', 170); b.setAttribute('dy', 17); b.setAttribute('class', 'status2'); b.textContent = parts.slice(1).join(' · ');
      el.append(a, b);
    } else el.textContent = text;
    if (long && !wrapped) { el.setAttribute('textLength', 216); el.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } else { el.removeAttribute('textLength'); el.removeAttribute('lengthAdjust'); }
    el.setAttribute('y', wrapped ? 362 : 366);
    this._$('t-hp-power')?.setAttribute('y', wrapped ? 397 : 390);
    this._$('t-hp-cop')?.setAttribute('y', wrapped ? 416 : 412);
  }

  // Target of circuit n with the heating curve shift, e.g. "Target 36 °C (curve 34 °C + 2 K shift)": the target already contains the
  // shift, so the curve gives target − shift. The text ends at the pump and runs left over the circuit pipe; where it does not fit
  // (narrow schematics), the word for the shift and then the part in brackets are left out. A shift is a difference: °C shows as K.
  _hcTarget(n, set, shift, unit) {
    const el = this._$(`t-hc${n === 1 ? '' : n}`); if (!el) return;
    const i = this._i;
    const f = (v) => this._fmt(v, Number.isInteger(v) ? 0 : 1);
    const u = ['', '°c', 'k'].includes(unit) ? 'K' : unit;
    const part = Number.isFinite(shift) ? `${shift < 0 ? '−' : '+'} ${f(Math.abs(shift))} ${u}` : '';
    let texts = [''];
    if (Number.isFinite(set) && part) {
      const head = `${i.target} ${f(set)} °C`; const curve = `${i.curve_offset} ${f(set - shift)} °C ${part}`;
      texts = [`${head} (${curve} ${i.curve_shift})`, `${head} (${curve})`, head];
    } else if (Number.isFinite(set)) texts = [`${i.target} ${f(set)} °C`];
    else if (part) texts = [`${i.curve_shift} ${part}`];
    const key = `${texts[0]}|${getComputedStyle(el).fontSize}`;
    if (el._k === key) return;
    let measured = true;
    for (const t of texts) {
      el.textContent = t;
      let w = 0;
      try { w = el.getComputedTextLength(); } catch (err) { w = 0; }
      if (!(w > 0)) { measured = false; break; }
      // From the pump (x 736) back to the riser of the diverter valve (x 386) with some air.
      if (w <= 736 - 400) break;
    }
    el._k = measured ? key : '';
  }

  // Status line of heating circuit n under its emitter: the mode (or "running") and, for circuits 2 to 6, the room temperature and
  // target of that circuit as a part of its own (tap target and screen reader label), e.g. "Heating · Room 21.4 °C · Target 22.0".
  // The two texts are centred together and anchored at the gap between them, so they never overlap. They stay right of the risers
  // of the further circuits (from x 692, or from x 760 with the return label of the circuit) and inside the schematic (up to x 996); where both do not fit, the room target is left out.
  // k2 is the type scale of narrow schematics.
  _hcStatus(n, status, k2) {
    const s = n === 1 ? '' : String(n);
    const mode = this._$(`t-hc-mode${s}`); const room = this._$(`t-hc-room${s}`);
    const i = this._i;
    let value = ''; let rest = '';
    if (room) {
      const rt = this._n(`hc${n}_room_target`);
      // Without a room sensor the target stands alone, as in the house.
      if (this._has(`hc${n}_room`)) { value = this._t(this._n(`hc${n}_room`)); if (Number.isFinite(rt)) rest = ` · ${i.target} ${this._fmt(rt)}`; }
      else if (Number.isFinite(rt)) rest = `${i.room_target} ${this._fmt(rt)} °C`;
    }
    const both = !!status && !!(value || rest);
    this._txt(`t-hc-mode${s}`, both ? `${status} ·` : status);
    if (!mode || !room) return;
    // The return label of the circuit sits under its return pipe up to x ~750 on the same line.
    const minX = this._config.hc_return_label && this._has(`hc${n}_return`) ? 760 : 692;
    const key = `${status}|${value}|${rest}|${k2}|${minX}`;
    if (room._k === key) return;
    room.textContent = '';
    if (value) {
      const span = (cls, text) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); t.setAttribute('class', cls); t.textContent = text; return t; };
      room.append(span('pre', `${i.room} `), span('room-temp', value));
    }
    const target = rest ? document.createTextNode(rest) : null;
    if (target) room.append(target);
    let xm = 880; let xr = 880; let measured = true;
    if (both) {
      // The widths need the rendered text; a hidden card uses an estimate and measures again on the next update.
      const width = (el) => {
        let w = 0;
        try { w = el.getComputedTextLength(); } catch (err) { w = 0; }
        if (w > 0) return w;
        measured = false;
        return el.textContent.length * 7 * k2;
      };
      const wm = width(mode); const gap = 5 * k2;
      let wr = width(room);
      if (value && target && wm + gap + wr > 996 - minX) { target.remove(); wr = width(room); }
      const left = Math.max(Math.min(880 - (wm + gap + wr) / 2, 996 - wm - gap - wr), minX);
      xm = left + wm; xr = xm + gap;
    }
    mode.setAttribute('x', +xm.toFixed(1)); mode.setAttribute('text-anchor', both ? 'end' : 'middle');
    room.setAttribute('x', +xr.toFixed(1)); room.setAttribute('text-anchor', both ? 'start' : 'middle');
    room._k = measured ? key : '';
  }

  // Label with a prefix (VL / RL) that narrow schematics leave out.
  _txtPre(id, pre, text) {
    const el = this._$(id); if (!el) return;
    const key = text ? `${pre}|${text}` : '';
    if (el._k === key) return;
    el._k = key; el.textContent = '';
    if (!text) return;
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t.setAttribute('class', 'pre'); t.textContent = `${pre} `;
    el.append(t, text);
  }
  _txt(id, text) { const el = this._$(id); if (el && el.textContent !== text) el.textContent = text; }
  _cls(id, on) { const el = this._$(id); if (el) el.classList.toggle('on', !!on); }
  _esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // Which optional blocks exist – the SVG is rebuilt only when this changes.
  _layoutSignature() {
    if (!this._hass || !this._e) return '';
    const buffer = this._has('buffer_top') || this._has('buffer_mode');
    const parts = {
      power: this._powerMode(),
      sources: this._powerMode() === 'energy' ? [this._energy.solar.length, this._energy.battery.length, this._energy.grid.length].join() : '',
      // A tank with only a lower sensor (e.g. HeishaMon's single sensor near the bottom) is still drawn.
      dhw: ['dhw_top', 'dhw_middle', 'dhw_bottom', 'dhw_mode'].some((k) => this._has(k)),
      buffer,
      // A series buffer sits in the return; a parallel buffer (with its own sensors) wins.
      series: !!this._config.series_buffer && !buffer,
      // A direct system still has a circuit: use the heat-pump flow/return when no circuit-specific sensors exist.
      hc: this._has('hc_flow') || this._has('hc_mode') || this._has('hc_pump') || (!buffer && (this._has('flow') || this._has('return'))),
      house: this._has('room') || this._has('room_target'),
      circ: this._has('circulation'),
      primaryPump: this._primaryPump(),
      hcPump: this._has('hc_pump'),
      hcType: this._hcType,
      hcs: this._hcCount > 1 ? this._hcTypes.slice(0, this._hcCount).join() : '',
      src: this._sourceType,
      unit: this._unitKey(),
      heaters: ['heater', 'dhw_heater', 'buffer_heater'].map((k) => (this._has(k) ? 1 : 0)).join(''),
      middle: [this._has('dhw_middle') ? 1 : 0, this._has('buffer_middle') ? 1 : 0].join(''),
      pressure: [this._sourceType === 'brine' && this._has('brine_pressure') ? 1 : 0, this._has('hc_pressure') ? 1 : 0].join(''),
      solar: ['dhw_top', 'dhw_middle', 'dhw_bottom', 'dhw_mode'].some((k) => this._has(k)) && (this._has('solar_collector') || this._has('solar_pump')),
      controls: this._controlList().map((c) => c.entity).join(),
      drawer: this._drawerRows().map(([s, r]) => s + r.map((x) => x[0]).join('.')).join('|'),
      lang: this._lang,
    };
    this._parts = parts;
    return JSON.stringify(parts);
  }

  /* ---------- render ---------- */
  _emitter(type, title) {
    if (type === 'column') {
      // Traditional column radiator: rounded joined sections, flow at the top and return at the bottom.
      const columns = Array.from({ length: 7 }, (_, n) => `<g transform="translate(${832 + n * 17} 0)"><rect class="column-rib" x="0" y="350" width="13" height="120" rx="6" style="fill:url(#g-rad__S__)"/><circle class="column-cap" cx="6.5" cy="356" r="6"/><circle class="column-cap" cx="6.5" cy="464" r="6"/></g>`).join('');
      return {
        vl: 'M640 360 H826',
        body: 'M826 360 H944 M944 460 H826',
        rl: 'M826 460 H805 Q785 460 785 478 Q785 495 765 495 H640',
        title: `<text class="tank-title" x="888" y="296" text-anchor="middle">${title}</text>`,
        art: `<path class="column-link" d="M832 372 H947 M832 448 H947"/>${columns}<path class="column-foot" d="M846 470v8 M934 470v8"/>
          <g class="waves" id="waves__S__">${[854, 888, 922].map((x) => `<path class="wave" d="M${x} 338 q7 -7 0 -14 q-7 -7 0 -14"/>`).join('')}</g>`,
      };
    }
    if (type === 'radiator') {
      // Radiator: flow enters top left, return leaves bottom left, heat waves rise above.
      const ribs = Array.from({ length: 8 }, (_, n) => `<rect class="rib" x="${838 + n * 14}" y="352" width="9" height="116" rx="4" style="fill:url(#g-rad__S__)"/>`).join('');
      return {
        vl: 'M640 360 H826',
        body: 'M826 365 H940 M940 455 H826',
        rl: 'M826 455 H805 Q785 455 785 475 Q785 495 765 495 H640',
        title: `<text class="tank-title" x="888" y="296" text-anchor="middle">${title}</text>`,
        art: `<rect class="radiator" x="826" y="345" width="126" height="130" rx="10"/>${ribs}
          <g class="waves" id="waves__S__">${[855, 888, 921].map((x) => `<path class="wave" d="M${x} 336 q7 -7 0 -14 q-7 -7 0 -14"/>`).join('')}</g>`,
      };
    }
    return {
      vl: 'M640 360 H800',
      body: 'M800 360 H935 Q955 360 955 380 Q955 400 935 400 H825 Q805 400 805 420 Q805 440 825 440 H935 Q955 440 955 460 Q955 480 935 480 H800',
      rl: 'M800 480 Q785 480 785 490 Q785 495 775 495 H640',
      title: `<text class="tank-title" x="880" y="320" text-anchor="middle">${title}</text>`,
      art: '<rect class="screed" x="795" y="490" width="170" height="10" rx="3"/>',
    };
  }

  _render() {
    if (!this._hass || !this._config) return;
    this._sig = this._layoutSignature();
    const P = this._parts;
    const e = this._e;
    const i = this._i;
    const T = this._esc(this._config.title ?? i.title);
    const fullLabel = this._fullscreenOpen ? i.fullscreen_close : i.fullscreen_open;
    const diagnosticIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18H7zM10 7h4M10 11h4M10 15h4"/></svg>';
    const fullscreenIcon = this._fullscreenOpen
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>';
    const energyHint = this._config.power_sources !== 'manual' && this._energyMissing?.length
      ? i.energy_missing.replace('{sources}', this._energyMissing.map((type) => ({ solar: i.pv, battery: i.battery, grid: i.grid }[type])).join(', ')) : '';
    const de = (k) => (e[k] ? `data-entity="${this._esc(e[k])}"` : '');
    const pipePair = (id, d, show = true) => (show
      ? `<path class="pipe" id="p-${id}" d="${d}"/><path class="flow" id="f-${id}" d="${d}"/>` : '');
    const P_SRC = 'M70 70 V118 Q70 140 92 140 H148 Q170 140 170 162 V190';
    const G_SRC = 'M270 70 V118 Q270 140 248 140 H192 Q170 140 170 162 V190';
    const showHc = P.hc || this._hcCount > 1;
    const U = this._sourceType === 'air' ? this._unitArt() : null;
    const H = 560 + (showHc ? (this._hcCount - 1) * 250 : 0);

    this.shadowRoot.innerHTML = `
      <style>${HeatpumpFlowCard.styles}</style>
      <div class="fullscreen-backdrop" id="fullscreen-backdrop" ${this._fullscreenOpen ? '' : 'hidden'}></div>
      <ha-card class="layout-${this._layout} motion-${this._animations} theme-${this._theme}${this._fullscreenOpen ? ' fullscreen' : ''}"${this._fullscreenOpen ? ` role="dialog" aria-modal="true" aria-label="${T}"` : ''}>
        <div class="head">
          ${T ? `<div class="title">${T}</div>` : '<div></div>'}
          <div class="head-right">
            <div class="chips">
              <span class="chip" id="chip-mode" ${de('mode')}></span>
              <span class="chip program" id="chip-program"></span>
              ${this._badges.map((b, n) => `<span class="chip badge" id="chip-b${n}" data-badge="${n}" data-entity="${this._esc(b.entity)}">${this._esc(b.label || b.entity)}</span>`).join('')}
              <span class="chip err" id="chip-err"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 2.5 20.5h19z" stroke-linejoin="round"/><path d="M12 10v4.5M12 17.5v.01" stroke-linecap="round"/></svg>${this._esc(i.error)}</span>
            </div>
            <div class="card-tools">
              <button class="icon-button" id="diagnostic-copy" type="button" title="${this._esc(i.diagnostic_copy)}" aria-label="${this._esc(i.diagnostic_copy)}">${diagnosticIcon}</button>
              ${this._config.fullscreen === false ? '' : `<button class="icon-button" id="fullscreen-toggle" type="button" title="${this._esc(fullLabel)}" aria-label="${this._esc(fullLabel)}" aria-pressed="${!!this._fullscreenOpen}">${fullscreenIcon}</button>`}
              <span class="sr-only" id="tool-status" aria-live="polite"></span>
            </div>
          </div>
        </div>
        ${this._needsBuild && this._preset ? `<div class="hint">${this._esc(i.not_found)}</div>` : ''}
        ${energyHint ? `<div class="hint">${this._esc(energyHint)}</div>` : ''}
        <div class="body">
        <div class="stage">
        <svg viewBox="0 0 1000 ${H}" id="svg" role="group" tabindex="-1" aria-label="${T}">
          <defs>
            <linearGradient id="g-dhw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" id="g-dhw-top"/>${this._has('dhw_middle') ? '<stop offset="50%" id="g-dhw-middle"/>' : ''}<stop offset="100%" id="g-dhw-bottom"/></linearGradient>
            <linearGradient id="g-buf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" id="g-buf-top"/>${this._has('buffer_middle') ? '<stop offset="50%" id="g-buf-middle"/>' : ''}<stop offset="100%" id="g-buf-bottom"/></linearGradient>
            <linearGradient id="g-rad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" id="g-rad-top"/><stop offset="100%" id="g-rad-bottom"/></linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>

          ${P.power ? `
            <path class="eline pv" d="${P_SRC}"/><path class="eline bat" d="M170 70 V190"/><path class="eline grid" d="${G_SRC}"/>
            <path class="eflow pv" id="ef-pv" d="${P_SRC}"/><path class="eflow bat" id="ef-bat" d="M170 70 V190"/><path class="eflow grid" id="ef-grid" d="${G_SRC}"/>
            ${this._source('pv', 70, i.pv, this._srcEntity('pv'))}${this._source('bat', 170, i.battery, this._srcEntity('battery'))}${this._source('grid', 270, i.grid, this._srcEntity('grid'))}` : ''}

          ${pipePair('vl', P.dhw ? 'M290 250 H402' : 'M290 250 H400 Q420 250 420 270 V338 Q420 360 442 360 H520')}
          ${pipePair('vl-dhw', 'M420 232 V102 Q420 80 442 80 H520', P.dhw)}
          ${pipePair('vl-buf', 'M420 268 V338 Q420 360 442 360 H520', P.dhw)}
          ${pipePair('rl-dhw', 'M520 215 H400 Q380 215 380 235 V380', P.dhw)}
          ${pipePair('rl-buf', 'M520 495 H400 Q380 495 380 475 V380')}
          ${pipePair('rl', 'M380 380 H290')}
          ${P.buffer ? '' : P.series ? this._seriesSvg() : `${pipePair('byp-vl', 'M520 360 H640')}${pipePair('byp-rl', 'M640 495 H520')}`}
          ${showHc ? Array.from({ length: this._hcCount }, (_, n) => this._circuitSvg(n + 1)).join('') : ''}
          ${this._sourceSvg()}

          ${this._primaryPump() ? `<g class="tap" ${de(e.volume ? 'volume' : 'mode')}>
            <circle class="pump" cx="340" cy="250" r="16"/>
            <g class="impeller" id="impeller-primary" style="transform-origin:340px 250px"><path d="M340 238 L346 250 L334 250Z M340 262 L334 250 L346 250Z" class="imp"/></g>
          </g>` : ''}
          <g class="tap" ${de('flow')}><text class="pipe-label" id="t-vl" x="${this._primaryPump() ? 340 : 338}" y="${this._primaryPump() ? 226 : 236}" text-anchor="middle"></text></g>
          <g class="tap" ${de('volume')}><text class="vol-label" id="t-vol" x="${this._primaryPump() ? 340 : 346}" y="${this._primaryPump() ? 284 : 275}" text-anchor="middle"></text></g>
          <g class="tap" ${de('return')}><text class="pipe-label" id="t-rl" x="335" y="406" text-anchor="middle"></text></g>

          <g class="tap" ${de('mode')}>
            <rect class="unit" id="hp-box" x="50" y="190" width="240" height="235" rx="20"/>
            <text class="unit-title" x="170" y="218" text-anchor="middle">${this._esc(i.heat_pump)}</text>
            ${U ? `${U.below}${U.fans.map((fn, n) => this._fanSvg(n ? `fan${n + 1}` : 'fan', ...fn)).join('')}${U.above}${U.snows.map((sn, n) => this._snowSvg(n ? `snow${n + 1}` : 'snow', ...sn)).join('')}`
              : `<circle class="fan-ring" cx="170" cy="288" r="50"/>
            <g class="fan" id="fan"><path class="blade" d="M170 254 L184 288 L156 288Z M170 322 L156 288 L184 288Z"/><circle cx="170" cy="288" r="7" class="hub"/></g>
            ${this._snowSvg('snow', 170, 288, 18)}`}
            <g class="vapour" id="vapour" aria-hidden="true"><path class="vapour-puff" d="M112 332 q-14 -18 2 -32 q14 -12 0 -28"/><path class="vapour-puff" d="M170 338 q-16 -20 2 -35 q15 -13 0 -30"/><path class="vapour-puff" d="M226 332 q-14 -18 2 -32 q14 -12 0 -28"/></g>
            <text class="unit-status" id="t-hp-status" x="170" y="366" text-anchor="middle"></text>
            <text class="unit-val" id="t-hp-power" x="170" y="390" text-anchor="middle"></text>
            <text class="unit-val strong" id="t-hp-cop" x="170" y="412" text-anchor="middle"></text>
          </g>
          ${this._sourceType === 'air' ? `<g class="tap" ${de(e.source_in ? 'source_in' : 'source_volume')}><text class="small" id="t-src-in" x="170" y="450" text-anchor="middle"></text></g>${this._has('outdoor') ? `<g class="tap" ${de('outdoor')}><text class="small" id="t-outdoor-hp" x="170" y="472" text-anchor="middle"></text></g>` : ''}` : ''}
          ${this._heaterSvg('heater', 'inline')}

          ${P.dhw ? `
            <g class="tap" ${de(e.valve ? 'valve' : 'dhw_mode')}>
              <circle class="valve" cx="420" cy="250" r="18"/>
              <path class="valve-arrow" id="valve-arrow" d="M420 262 V240 M412 248 L420 240 L428 248"/>
              <text class="small" id="t-valve" x="446" y="254"></text>
            </g>
            <g class="tap" ${de(['dhw_top', 'dhw_middle', 'dhw_bottom'].find((k) => e[k]) || 'dhw_top')}>
              <text class="tank-title" x="580" y="30" text-anchor="middle">${this._esc(i.dhw)}</text>
              <rect class="tank" x="520" y="40" width="120" height="200" rx="26" fill="url(#g-dhw)"/>
              <path class="coil" id="coil" d="M520 80 H600 L540 100 H600 L540 120 H600 L540 140 H600 L540 160 H600 L540 180 H600 L540 200 H520"/>
              <text class="tank-temp" id="t-dhw-top" x="580" y="112" text-anchor="middle"></text>
              <text class="small" id="t-dhw-mode" x="580" y="262" text-anchor="middle"></text>
            </g>
            ${this._has('dhw_middle') ? `<g class="tap" ${de('dhw_middle')}><text class="tank-sub" id="t-dhw-middle" x="580" y="166" text-anchor="middle"></text></g>` : ''}
            <g class="tap" ${de('dhw_bottom')}><text class="tank-sub" id="t-dhw-bottom" x="580" y="222" text-anchor="middle"></text></g>
            ${this._heaterSvg('dhw_heater', 'dhw', 186)}
            ${P.circ ? `<g class="tap" ${de('circulation')}><text class="small circ" id="t-circ" x="650" y="60">↻ ${this._esc(i.circulation)}</text></g>` : ''}` : ''}

          ${P.buffer ? `
            <g class="tap" ${de('buffer_top')}>
              <text class="tank-title" x="580" y="310" text-anchor="middle">${this._esc(i.buffer)}</text>
              <rect class="tank" x="520" y="320" width="120" height="200" rx="26" fill="url(#g-buf)"/>
              <text class="tank-temp" id="t-buf-top" x="580" y="392" text-anchor="middle"></text>
              <text class="small" id="t-buf-mode" x="580" y="542" text-anchor="middle"></text>
            </g>
            ${this._has('buffer_middle') ? `<g class="tap" ${de('buffer_middle')}><text class="tank-sub" id="t-buf-middle" x="580" y="446" text-anchor="middle"></text></g>` : ''}
            <g class="tap" ${de('buffer_bottom')}><text class="tank-sub" id="t-buf-bottom" x="580" y="502" text-anchor="middle"></text></g>
            ${this._heaterSvg('buffer_heater', 'buf', 455)}` : ''}


          ${P.solar ? this._solarSvg() : ''}

          ${P.house ? `
            <g class="tap" ${de(e.room ? 'room' : 'room_target')}>
              <path class="house" d="M720 130 L830 50 L940 130 V240 H720 Z"/>
              <text class="tank-title" x="830" y="118" text-anchor="middle">${this._esc(i.house)}</text>
              <text class="house-temp" id="t-room" x="830" y="172" text-anchor="middle"></text>
              <text class="house-sub" id="t-room-target" x="830" y="202" text-anchor="middle"></text>
              ${this._sourceType === 'air' ? '' : '<text class="small" id="t-outdoor" x="830" y="226" text-anchor="middle"></text>'}
            </g>` : (this._has('outdoor') && this._sourceType !== 'air' ? `<g class="tap" ${de('outdoor')}><text class="small" id="t-outdoor" x="880" y="120" text-anchor="middle"></text></g>` : '')}
        </svg>
        </div>
        <div class="side">
          ${this._config.timeline ? '<div class="timeline" id="timeline" hidden></div>' : ''}
          ${this._controlsHtml()}
          <div class="stats" id="stats"></div>
          ${this._drawerHtml()}
        </div>
        </div>
      </ha-card>`;

    this._wireTools();
    if (this._layout === 'wall') {
      const card = this.shadowRoot.querySelector('ha-card');
      ['pointerdown', 'pointermove', 'keydown', 'focusin'].forEach((t) => card.addEventListener(t, () => this._wake(), { passive: true }));
      card.classList.toggle('awake', !!this._awake || this._wallSeconds() === 0);
    }
    this._actEvents(this._$('svg'));
    this._actEvents(this.shadowRoot.querySelector('.head'));
    this._tileEvents(this._$('stats'));
    if (this._$('timeline')) this._timelineEvents(this._$('timeline'));
    this._rove(this._$('svg'), '[data-entity]', 'svg');
    this._rove(this._$('stats'), '.stat', 'stats');
    const drawer = this._$('drawer-body');
    if (drawer) {
      this._actEvents(drawer);
      this._rove(drawer, '.drow', 'drawer');
      this._$('drawer-toggle').addEventListener('click', () => {
        this._drawerOpen = !this._drawerOpen;
        drawer.hidden = !this._drawerOpen;
        this._$('drawer-toggle').setAttribute('aria-expanded', String(this._drawerOpen));
      });
    }
    const ctl = this._$('controls');
    if (ctl) {
      ctl.addEventListener('click', (ev) => { const b = ev.target.closest('button[data-ctl]'); if (b) this._control(+b.dataset.ctl); });
      ctl.addEventListener('change', (ev) => { const el = ev.target.closest('[data-ctl]'); if (el) this._control(+el.dataset.ctl, el.value); });
    }
    this._rendered = true;
    this._a11yAt = 0;
  }

  /* ---------- quick controls ---------- */
  _controlList() {
    return (this._config.controls || []).map((c) => (typeof c === 'string' ? { entity: c } : c))
      .filter((c) => c && c.entity && this._hass.states[c.entity]);
  }

  _controlKind(id) {
    const d = id.split('.')[0];
    if (['button', 'input_button', 'script', 'scene'].includes(d)) return 'press';
    if (['select', 'input_select', 'water_heater', 'climate'].includes(d)) return 'select';
    if (['number', 'input_number'].includes(d)) return 'number';
    return 'toggle';
  }

  _controlOptions(st) {
    const d = st.entity_id.split('.')[0];
    if (d === 'water_heater') return st.attributes.operation_list || [];
    if (d === 'climate') return st.attributes.hvac_modes || [];
    return st.attributes.options || [];
  }

  _stateText(st, value) {
    try { if (this._hass.formatEntityState) return this._hass.formatEntityState(st, value); } catch (e) { /* older HA */ }
    return value;
  }

  _controlsHtml() {
    const list = this._controlList();
    if (!list.length) return '';
    return `<div class="controls" id="controls">${list.map((c, n) => {
      const st = this._hass.states[c.entity];
      const name = this._esc(c.name || st.attributes.friendly_name || c.entity);
      const kind = this._controlKind(c.entity);
      if (kind === 'select') {
        return `<label class="ctl sel"><span>${name}</span><select data-ctl="${n}" id="ctl-${n}">${this._controlOptions(st).map((o) => `<option value="${this._esc(o)}">${this._esc(this._stateText(st, o))}</option>`).join('')}</select></label>`;
      }
      if (kind === 'number') {
        const a = st.attributes;
        return `<label class="ctl num"><span>${name}</span><input type="number" data-ctl="${n}" id="ctl-${n}" min="${a.min ?? ''}" max="${a.max ?? ''}" step="${a.step ?? 'any'}"><em>${this._esc(a.unit_of_measurement || '')}</em></label>`;
      }
      return `<button class="ctl ${kind}" data-ctl="${n}" id="ctl-${n}">${name}</button>`;
    }).join('')}</div>`;
  }

  _control(n, value) {
    const c = this._controlList()[n]; if (!c) return;
    const id = c.entity; const d = id.split('.')[0]; const kind = this._controlKind(id);
    const call = (domain, service, data = {}) => this._hass.callService(domain, service, { entity_id: id, ...data });
    if (kind === 'press') {
      if (d === 'script' || d === 'scene') call(d, 'turn_on'); else call(d, 'press');
    } else if (kind === 'select') {
      if (d === 'water_heater') call(d, 'set_operation_mode', { operation_mode: value });
      else if (d === 'climate') call(d, 'set_hvac_mode', { hvac_mode: value });
      else call(d, 'select_option', { option: value });
    } else if (kind === 'number') {
      const v = parseFloat(value); if (Number.isFinite(v)) call(d, 'set_value', { value: v });
    } else {
      call(['switch', 'input_boolean', 'light', 'fan', 'automation'].includes(d) ? d : 'homeassistant', 'toggle');
    }
  }

  _updateControls() {
    this._controlList().forEach((c, n) => {
      const el = this._$(`ctl-${n}`); if (!el) return;
      const st = this._hass.states[c.entity];
      const kind = this._controlKind(c.entity);
      if (kind === 'toggle') el.classList.toggle('on', ['on', 'open', 'heat', 'auto'].includes(st.state));
      else if (kind === 'select') { if (el.value !== st.state && this.shadowRoot.activeElement !== el) el.value = st.state; }
      else if (kind === 'number') { if (this.shadowRoot.activeElement !== el) el.value = st.state; }
    });
  }

  /* ---------- stat tiles ---------- */
  // Config entry → { key, period, … } or { entity, … }. Strings may carry the period: "cop_heating:month".
  static _tileSpec(t) {
    if (typeof t === 'string') { const [key, period] = t.split(':').map((x) => x.trim()); return { key, ...(period ? { period } : {}) }; }
    return t && typeof t === 'object' ? t : null;
  }

  // Editor: the tiles this installation can fill as select options, the current selection as option values and the default set.
  static _tileOptions(config, r, hass) {
    const I = HeatpumpFlowCard._texts(config, hass);
    const probe = Object.assign(Object.create(HeatpumpFlowCard.prototype), { _hass: hass, _e: r.entities, _sums: r.sums, _tileMap: r.tiles, _config: config });
    const options = [];
    const periodsOf = {};
    // The cost tile needs a price (global `price`).
    const hasPrice = config.price !== undefined && config.price !== null && config.price !== '';
    Object.keys(HFC_TILES).filter((k) => k !== 'cost' || hasPrice).forEach((key) => {
      const periods = probe._tilePeriods(key);
      periodsOf[key] = periods;
      periods.forEach((p) => options.push({ value: periods.length === 1 ? key : `${key}:${p}`, label: probe._tileLabel(key, p, I) }));
    });
    // Tiles with a single period are stored without it; others with the period, so the select can show them.
    const valueOf = (key, period) => {
      const periods = periodsOf[key] || [];
      if (periods.length === 1) return key;
      const p = period || probe._tileDefault(key);
      return p ? `${key}:${p}` : key;
    };
    let editable = true;
    const value = (Array.isArray(config.tiles) ? config.tiles : []).map((t) => {
      const s = HeatpumpFlowCard._tileSpec(t);
      if (!s) return null;
      if (!s.key || Object.keys(s).some((k) => !['key', 'period'].includes(k))) { editable = false; return null; }
      return valueOf(s.key, s.period);
    }).filter(Boolean);
    value.forEach((v) => { if (!options.some((o) => o.value === v)) options.push({ value: v, label: v }); });
    const defaults = ['cop_heating', 'cop_dhw', 'energy', 'starts', 'spread', 'volume', 'heat_estimated']
      .filter((k) => periodsOf[k].length).map((k) => valueOf(k));
    return { options, value, editable, defaults };
  }

  _tileLabel(key, period, I = this._i) {
    const def = HFC_TILES[key];
    return `${I.tiles[key]}${def.live || def.noSuffix || !period ? '' : ` · ${I.periods[period]}`}`;
  }

  // Where a tile's value comes from for a period: an entity, the long-term statistics of a total counter,
  // a ratio of two other tiles (COP = heat ÷ electricity), or null when this installation cannot fill it.
  _tileSource(key, period) {
    const def = HFC_TILES[key];
    if (!def || (def.periods && !def.periods.includes(period))) return null;
    if (def.live) return period === 'now' && this._liveAvail(key) ? { live: true } : null;
    if (def.kind === 'classes') return period === 'total' && this._tileMap.load_class1 ? { classes: true } : null;
    if (def.kind === 'cost') return this._tileSource('energy', period) ? { cost: true } : null;
    const map = this._tileMap[key] || {};
    // The entities of the default tiles (cop_heating_today …) count as "today", unless the preset maps them to another period.
    const legacy = def.legacy && this._has(def.legacy) ? this._e[def.legacy] : null;
    if (period === 'today' && legacy && !Object.entries(map).some(([p, id]) => p !== 'today' && id === legacy)) return { id: legacy };
    if (map[period]) return { id: map[period] };
    const total = map.total;
    if (total && HFC_STAT_PERIODS[period] && ['total', 'total_increasing'].includes(this._hass.states[total]?.attributes?.state_class)) return { stat: total };
    if (def.ratio) {
      const parts = def.ratio.map((k) => [this._tileSource(k, period), HFC_TILES[k].kind]);
      if (parts.every(([s]) => s)) return { ratio: parts };
    }
    // Without a delivered-heat counter, heat = environmental energy + electricity. Keep this visibly approximate.
    if (key === 'cop_total') {
      const environmental = this._tileSource('env_energy', period); const electricity = this._tileSource('energy', period);
      if (environmental && electricity) return { envCop: [environmental, electricity] };
    }
    return null;
  }

  _tilePeriods(key) {
    const def = HFC_TILES[key];
    if (!def) return [];
    if (def.live) return this._liveAvail(key) ? ['now'] : [];
    return HFC_PERIODS.filter((p) => this._tileSource(key, p));
  }

  // Without a period: today if possible, else the current value, the total, then the longest period.
  _tileDefault(key) {
    const periods = this._tilePeriods(key);
    return ['today', 'now', 'total', 'year', 'month', 'week', 'yesterday'].find((p) => periods.includes(p));
  }

  // Base units: kWh for energy (W for period "now"), h for hours.
  _toBase(v, unit, kind, period) {
    const u = String(unit || '').toLowerCase();
    if (kind === 'energy' && period === 'now') return u === 'kw' ? v * 1000 : v;
    if (kind === 'energy') return u === 'wh' ? v / 1000 : u === 'mwh' ? v * 1000 : v;
    if (kind === 'hours') return { min: v / 60, s: v / 3600, d: v * 24 }[u] ?? v;
    return v;
  }

  _tileRead(id, kind, period) {
    const st = id && this._hass.states[id]; const v = parseFloat(st?.state);
    return Number.isFinite(v) ? this._toBase(v, st.attributes?.unit_of_measurement, kind, period) : NaN;
  }

  // Result of a recorder query, cached per instance and refreshed every 5 minutes: undefined while loading, null on error.
  _wsCached(key, msg, pick) {
    this._statCache = this._statCache || {};
    const c = this._statCache[key];
    if ((!c || (!c.req && Date.now() - c.t > 300000)) && typeof this._hass.callWS === 'function') {
      this._statCache[key] = { ...(c || {}), req: true, t: Date.now() };
      this._hass.callWS(msg)
        .then((res) => { this._statCache[key] = { v: pick(res), t: Date.now() }; })
        .catch(() => { this._statCache[key] = { v: null, t: Date.now() }; })
        .then(() => { if (this._rendered) { try { this._update(); } catch (err) { this._fail(err); } } });
    }
    return this._statCache[key]?.v;
  }

  // Change of a total counter over a calendar period from the recorder's long-term statistics.
  _statChange(id, kind, period) {
    const [calendar, offset] = HFC_STAT_PERIODS[period];
    const v = this._wsCached(`${id}|${period}`, { type: 'recorder/statistic_during_period', statistic_id: id, calendar: { period: calendar, offset }, types: ['change'] }, (res) => res?.change);
    return typeof v === 'number' ? this._toBase(v, this._hass.states[id]?.attributes?.unit_of_measurement, kind, period) : NaN;
  }

  // Price per kWh from the tile's or the card's `price`: a number or an entity; ct/kWh and per-MWh prices are converted.
  _price(spec) {
    const p = spec.price ?? this._config.price;
    if (typeof p === 'number') return { v: p };
    const st = typeof p === 'string' && this._hass.states[p];
    if (!st) return typeof p === 'string' && p.trim() !== '' && Number.isFinite(+p) ? { v: +p } : null;
    const u = String(st.attributes?.unit_of_measurement || '').toLowerCase();
    const f = (/ct|cent/.test(u) ? 0.01 : 1) * (/\/\s*mwh/.test(u) ? 0.001 : /\/\s*wh/.test(u) ? 1000 : 1);
    return { v: parseFloat(st.state) * f, f, id: p, stats: !!st.attributes?.state_class };
  }

  // Energy counter with long-term statistics for the cost of a period.
  _costStatId(period) {
    const counter = (id) => ['total', 'total_increasing'].includes(this._hass.states[id]?.attributes?.state_class);
    const src = this._tileSource('energy', period);
    if (src?.stat) return src.stat;
    if (src?.id && counter(src.id)) return src.id;
    const total = this._tileMap.energy?.total;
    return total && counter(total) ? total : null;
  }

  // Start (and end) of a calendar period in the Home Assistant time zone, and the statistics granularity used for costs.
  _periodRange(period) {
    const opts = { hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short' };
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: this._hass.config?.time_zone }); } catch (err) { fmt = new Intl.DateTimeFormat('en-US', opts); }
    const parts = (t) => Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    // Wall-clock midnight in the time zone as UTC; two passes cover daylight saving changes.
    const midnight = (y, m, d) => {
      const wall = Date.UTC(y, m, d); let t = wall;
      for (let n = 0; n < 2; n++) { const q = parts(t); t = wall - (Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour, +q.minute, +q.second) - t); }
      return new Date(t).toISOString();
    };
    const p = parts(Date.now()); const y = +p.year; const m = +p.month - 1; const d = +p.day;
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
    return {
      today: [midnight(y, m, d), null, 'hour'],
      yesterday: [midnight(y, m, d - 1), midnight(y, m, d), 'hour'],
      week: [midnight(y, m, d - weekday), null, 'hour'],
      month: [midnight(y, m, 1), null, 'hour'],
      year: [midnight(y, 0, 1), null, 'day'],
      total: [new Date(0).toISOString(), null, 'month'],
    }[period] || null;
  }

  // Electricity × mean price per hour (per day for the year, per month in total) from the long-term statistics.
  _priceBuckets(energy, price, period) {
    const range = this._periodRange(period);
    if (!range) return null;
    const [start, end, gran] = range;
    const msg = {
      type: 'recorder/statistics_during_period', start_time: start, ...(end ? { end_time: end } : {}),
      statistic_ids: [energy, price], period: gran, types: ['change', 'mean'], units: { energy: 'kWh' },
    };
    return this._wsCached(`cost|${energy}|${price}|${period}`, msg, (res) => {
      const means = new Map((res?.[price] || []).map((r) => [new Date(r.start).getTime(), r.mean]));
      let cost = 0; let kwh = 0; let last = NaN;
      (res?.[energy] || []).forEach((r) => {
        const p = means.get(new Date(r.start).getTime());
        if (Number.isFinite(p)) last = p;
        if (Number.isFinite(r.change) && Number.isFinite(last)) { cost += r.change * last; kwh += r.change; }
      });
      return means.size ? { cost, kwh, coarse: gran !== 'hour' } : null;
    });
  }

  // [cost, approximate]: a fixed price × electricity; a price entity with statistics is billed per hour, the hour
  // not yet in the statistics at the current price. Without statistics: electricity × current price (≈).
  _cost(period, spec) {
    const kwh = this._srcValue(this._tileSource('energy', period), 'energy', period);
    const price = this._price(spec);
    if (!price || !Number.isFinite(kwh)) return [NaN];
    if (!price.id) return [kwh * price.v];
    const energy = price.stats && this._costStatId(period);
    const b = energy ? this._priceBuckets(energy, price.id, period) : null;
    if (b === undefined) return [NaN];
    if (!b) return [kwh * price.v, true];
    const rest = kwh - b.kwh;
    return [b.cost * price.f + (rest > 0.0005 ? rest * price.v : 0), b.coarse];
  }

  _srcValue(src, kind, period) {
    if (!src) return NaN;
    if (src.id) return this._tileRead(src.id, kind, period);
    if (src.stat) return this._statChange(src.stat, kind, period);
    if (src.ratio) { const [a, b] = src.ratio.map(([s, k]) => this._srcValue(s, k, period)); return b > 0 && a >= 0 ? a / b : NaN; }
    if (src.envCop) {
      const environmental = this._srcValue(src.envCop[0], 'energy', period); const electricity = this._srcValue(src.envCop[1], 'energy', period);
      return electricity > 0 && environmental >= 0 ? (environmental + electricity) / electricity : NaN;
    }
    return NaN;
  }

  _tileEntity(src, period) {
    if (!src) return '';
    if (src.id || src.stat) return src.id || src.stat;
    if (src.ratio) return this._tileEntity(src.ratio[0][0], period);
    if (src.envCop) return this._tileEntity(src.envCop[0], period);
    if (src.classes) return this._tileMap.load_class1;
    if (src.cost) return this._tileEntity(this._tileSource('energy', period), period);
    return '';
  }

  _tileText(key, period, src, spec) {
    const def = HFC_TILES[key];
    const dec = (d) => spec.decimals ?? d;
    const out = (v, d, unit) => (Number.isFinite(v) ? `${this._fmt(v, dec(d))} ${spec.unit ?? unit}`.trim() : '–');
    if (src.classes) {
      const hrs = [1, 2, 3, 4, 5].map((n) => this._tileRead(this._tileMap[`load_class${n}`], 'hours'));
      const sum = hrs.reduce((a, h) => a + (Number.isFinite(h) ? h : 0), 0);
      return sum > 0 ? `${hrs.map((h) => this._fmt(Number.isFinite(h) ? (h / sum) * 100 : NaN, 0)).join(' · ')} %` : '–';
    }
    if (src.cost) {
      // Currency from the tile, the card or the Home Assistant settings.
      const [v, approx] = this._cost(period, spec);
      if (!Number.isFinite(v)) return '–';
      const currency = spec.currency || this._config.currency || this._hass.config?.currency || 'EUR';
      try {
        return `${approx ? '≈' : ''}${v.toLocaleString(this._hass.locale?.language || this._lang, { style: 'currency', currency, minimumFractionDigits: dec(2), maximumFractionDigits: dec(2) })}`;
      } catch (err) { return `${approx ? '≈' : ''}${out(v, 2, currency)}`; }
    }
    const v = this._srcValue(src, def.kind, period);
    const approx = src.ratio || src.envCop ? '≈' : '';
    if (def.kind === 'cop') return Number.isFinite(v) ? `${approx}${this._fmt(v, dec(2))}` : '–';
    // Small amounts (standby, defrost) keep two decimals so they do not read as 0.0.
    if (def.kind === 'energy') return period === 'now' ? out(v, 0, 'W') : out(v, Math.abs(v) >= 100 ? 0 : Math.abs(v) < 1 ? 2 : 1, 'kWh');
    if (def.kind === 'count') return out(v, 0, '');
    if (def.perStart) return !Number.isFinite(v) ? '–' : `${approx}${v < 1 ? out(v * 60, 0, 'min') : out(v, 1, 'h')}`;
    if (def.kind === 'hours') return out(v, Math.abs(v) >= 100 ? 0 : 1, 'h');
    return out(v, 1, '');
  }

  // Live tiles: current values from the schematic entities.
  _liveAvail(key) {
    const h = (k) => this._has(k);
    return !!{
      cop_live: h('power') && (h('heat') || (h('volume') && h('flow') && h('return'))),
      spread: h('flow') && h('return'), volume: h('volume'),
      heat_estimated: !h('heat') && h('volume') && h('flow') && h('return'),
      power: h('power'), heat_live: h('heat'), compressor_speed: h('compressor_speed'),
      source_spread: h('source_in') && h('source_out'), outdoor: h('outdoor'), dhw_top: h('dhw_top'), room: h('room'),
      brine_pressure: h('brine_pressure'), hc_pressure: h('hc_pressure'),
      pv_share: h('pv_share_today'),
    }[key];
  }

  _liveTile(key, L) {
    const f = (v, d, u) => (Number.isFinite(v) ? `${this._fmt(v, d)} ${u}`.trim() : '–');
    switch (key) {
      case 'cop_live': return [Number.isFinite(L.cop) ? `${L.heatEstimated ? '≈' : ''}${this._fmt(L.cop, 1)}` : '–', this._e.heat || this._e.power];
      case 'spread': return [L.loop ? f(L.spread, 1, 'K') : '–', this._e.flow];
      case 'volume': return [L.flowLoop ? f(L.vol, 0, 'l/h') : '–', this._e.volume];
      case 'heat_estimated': return [L.heatEstimated ? `≈${f(L.heat, 1, 'kW')}` : '–', this._e.volume];
      case 'power': return [f(L.power, 0, 'W'), this._e.power];
      case 'heat_live': return [f(this._kw('heat'), 1, 'kW'), this._e.heat];
      case 'compressor_speed': return [this._fmtState('compressor_speed'), this._e.compressor_speed];
      case 'source_spread': return [f(this._n('source_in') - this._n('source_out'), 1, 'K'), this._e.source_in];
      case 'brine_pressure': return [this._pressureText('brine_pressure'), this._e.brine_pressure];
      case 'hc_pressure': return [this._pressureText('hc_pressure'), this._e.hc_pressure];
      case 'pv_share': return [f(this._n('pv_share_today'), 0, '%'), this._e.pv_share_today];
      default: return [this._t(this._n(key)), this._e[key]];
    }
  }

  // Tiles from the `tiles` option, in the configured order: catalog keys (with period) and free entities.
  _catalogTiles(L) {
    const i = this._i; const out = [];
    this._config.tiles.forEach((raw) => {
      const spec = HeatpumpFlowCard._tileSpec(raw);
      if (!spec) return;
      const def = HFC_TILES[spec.key];
      if (!def) {
        const st = spec.entity && this._hass.states[spec.entity];
        if (st) out.push([spec.name || st.attributes.friendly_name || spec.entity, this._fmtState(null, spec), spec.entity, spec]);
        return;
      }
      if (def.live) {
        if (!this._liveAvail(spec.key)) return;
        const [text, entity] = this._liveTile(spec.key, L);
        out.push([spec.name || this._tileLabel(spec.key, 'now'), text, entity, spec]);
        return;
      }
      // A catalog key with an own entity uses the key's label and formatting.
      const period = spec.period || (spec.entity ? 'total' : this._tileDefault(spec.key));
      const src = spec.entity ? (this._hass.states[spec.entity] ? { id: spec.entity } : null) : (period && this._tileSource(spec.key, period));
      if (!src) return;
      let text = this._tileText(spec.key, period, src, spec);
      const share = this._n('pv_share_today');
      if (spec.key === 'energy' && period === 'today' && Number.isFinite(share)) text += ` · ${this._fmt(share, 0)} % ${i.pv_share}`;
      out.push([spec.name || this._tileLabel(spec.key, spec.entity && !spec.period ? '' : period), text, this._tileEntity(src, period), spec]);
    });
    return out;
  }

  /* ---------- details drawer ---------- */
  // Rows of the drawer: [section, [[id, label, entity, value()]]]. Only existing entities (or computable values) are shown.
  _drawerRows() {
    const i = this._i; const D = i.det;
    const kwh = (key) => {
      const v = this._n(key); const u = this._unit(key);
      return u === 'wh' ? v / 1000 : u === 'mwh' ? v * 1000 : v;
    };
    // Entities that are unknown or unavailable (not reported by this model) are left out.
    const ok = (key) => this._has(key) && !['unknown', 'unavailable'].includes(this._s(key));
    const row = (key) => (ok(key) ? [key, D[key], this._e[key], () => this._fmtState(key)] : null);
    const op = ['hours', 'starts_total', 'aux_hours', 'energy_total', 'env_energy', 'heat_total'].map(row);
    if (ok('energy_total') && (ok('heat_total') || ok('env_energy'))) {
      op.push(['cop_total', D.cop_total, ok('heat_total') ? this._e.heat_total : this._e.env_energy, () => {
        const electricity = kwh('energy_total');
        const heat = ok('heat_total') ? kwh('heat_total') : kwh('env_energy') + electricity;
        const c = heat / electricity;
        return Number.isFinite(c) && c > 0 ? `≈${this._fmt(c, 2)}` : '–';
      }]);
    }
    // A sensor with a heating-only role shows '–' while the cycle runs backwards (defrost, cooling).
    const reversed = (key) => (this._heatingRoles || []).includes(key) && this._reversedCycle();
    const rf = ['compressor_speed', 'evap_temp', 'cond_temp', 'suction_temp', 'hot_gas', 'liquid_temp', 'low_pressure', 'high_pressure', 'eev'].map(row)
      .map((r) => (r && (this._heatingRoles || []).includes(r[0]) ? [...r.slice(0, 3), () => (reversed(r[0]) ? '–' : r[3]())] : r));
    // Cut-out counters are event counts, shown as plain numbers with a times sign, never with a unit of pressure or temperature.
    const cutouts = ['cutout_high_pressure', 'cutout_low_pressure', 'cutout_temperature'].filter(ok).map((key) => [key, D[key], this._e[key], () => this._countText(key)]);
    const hydraulic = [['brine_pressure', i.brine_pressure], ['hc_pressure', i.hc_pressure]].filter(([key]) => ok(key))
      .map(([key, label]) => [key, label, this._e[key], () => this._pressureText(key)]);
    // Superheat = suction gas − evaporation, subcooling = condensation − liquid line, unless the integration provides them.
    const diff = (a, b) => { const v = this._n(a) - this._n(b); return Number.isFinite(v) && !reversed(a) && !reversed(b) ? `${this._fmt(v, 1)} K` : '–'; };
    rf.push(row('superheat') || (ok('suction_temp') && ok('evap_temp') ? ['superheat', D.superheat, this._e.suction_temp, () => diff('suction_temp', 'evap_temp')] : null));
    rf.push(row('subcooling') || (ok('cond_temp') && ok('liquid_temp') ? ['subcooling', D.subcooling, this._e.liquid_temp, () => diff('cond_temp', 'liquid_temp')] : null));
    const more = (this._config.details || []).map((d, n) => (typeof d === 'string' ? { entity: d } : d)).filter((d) => d && this._hass.states[d.entity])
      .map((d, n) => [`x${n}`, d.name || this._hass.states[d.entity].attributes.friendly_name || d.entity, d.entity, () => this._fmtState(null, d)]);
    return [[i.sec_operation, op.filter(Boolean)], [i.sec_hydraulic, hydraulic], [i.sec_refrigerant, rf.filter(Boolean)], [i.sec_cutouts, cutouts], [i.sec_more, more]].filter(([, r]) => r.length);
  }

  // Event counter: a whole number followed by "×"; text states stay as they are.
  _countText(key) {
    const st = this._hass.states[this._e[key]]; if (!st) return '–';
    const v = parseFloat(st.state);
    if (!Number.isFinite(v)) return ['unknown', 'unavailable'].includes(st.state) ? '–' : this._stateText(st, st.state);
    return `${this._fmt(Math.round(v), 0)} ×`;
  }

  // Formats an entity value with its unit: integers without decimals, large values with none, others with one.
  _fmtState(key, spec) {
    const id = spec ? spec.entity : this._e[key];
    const st = this._hass.states[id]; if (!st) return '–';
    let v = parseFloat(st.state);
    if (!Number.isFinite(v)) return ['unknown', 'unavailable'].includes(st.state) ? '–' : this._stateText(st, st.state);
    let unit = spec?.unit ?? st.attributes.unit_of_measurement ?? '';
    // Energy counters in Wh (e.g. Lambda) read better in kWh.
    if (!spec?.unit && unit === 'Wh' && Math.abs(v) >= 1000) { v /= 1000; unit = 'kWh'; }
    const d = spec?.decimals ?? (Number.isInteger(v) || Math.abs(v) >= 100 ? 0 : 1);
    return `${this._fmt(v, d)} ${unit}`.trim();
  }

  _drawerHtml() {
    const sections = this._drawerRows();
    if (!sections.length) return '';
    if (this._drawerOpen === undefined) this._drawerOpen = !!this._config.details_open;
    const chevron = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    return `<div class="drawer">
      <button class="drawer-toggle" id="drawer-toggle" aria-expanded="${this._drawerOpen}">${this._esc(this._i.details)}${chevron}</button>
      <div class="drawer-body" id="drawer-body" ${this._drawerOpen ? '' : 'hidden'}>${sections.map(([title, rows]) => `<div class="dsec"><div class="dsec-title">${this._esc(title)}</div>
        <div class="dgrid">${rows.map(([id, label, entity]) => `<div class="drow" data-entity="${this._esc(entity)}"><span>${this._esc(label)}</span><b id="d-${id}"></b></div>`).join('')}</div></div>`).join('')}</div>
    </div>`;
  }

  _updateDrawer() {
    if (!this._$('drawer-body')) return;
    this._drawerRows().forEach(([, rows]) => rows.forEach(([id, , , value]) => this._txt(`d-${id}`, value())));
  }

  // Series buffer in the return of the heating circuits with a 3-way valve (A: bypass from the flow, B: circuit return, AB: buffer).
  // Normally B–AB is open: the circuit return runs through the buffer. In defrost (or with the bypass valve entity on) A–AB opens
  // and the flow runs straight into the buffer, past the circuits, so the heat pump defrosts from the buffer water.
  _seriesSvg() {
    const e = this._e; const i = this._i;
    const pp = (id, d) => `<path class="pipe" id="p-${id}" d="${d}"/><path class="flow" id="f-${id}" d="${d}"/>`;
    const de = (k) => (e[k] ? `data-entity="${this._esc(e[k])}"` : '');
    return `${pp('byp-vl', 'M520 360 H600')}${pp('sb-vl', 'M600 360 H640')}${pp('sb-a', 'M600 360 V477')}${pp('sb-b', 'M640 495 H618')}${pp('byp-rl', 'M582 495 H520')}
      <g class="tap" ${de(e.bypass_valve ? 'bypass_valve' : 'defrost')}>
        <rect class="tank" id="sb-tank" x="450" y="452" width="116" height="86" rx="20"/>
        <text class="small series-title" x="508" y="499" text-anchor="middle">${this._esc(i.series_tank)}</text>
        <circle class="valve" cx="600" cy="495" r="18"/>
        <path class="valve-arrow" id="sb-arrow" d="M614 495 H586 M593 488 L586 495 L593 502"/>
        <text class="small" id="t-bypass" x="600" y="534" text-anchor="middle"></text>
      </g>`;
  }

  // Heating circuit n (1-3). Circuits 2 and 3 sit below circuit 1, fed by risers from its flow and return.
  _circuitSvg(n) {
    const i = this._i; const e = this._e;
    const s = n === 1 ? '' : String(n);
    const dy = (n - 1) * 250;
    const k = (key) => this._hk(n, key);
    const entity = (key) => e[key] || (n === 1 && !this._parts.buffer && key === k('flow') ? e.flow : '');
    const de = (key) => (entity(key) ? `data-entity="${this._esc(entity(key))}"` : '');
    const name = this._config[n === 1 ? 'hc_name' : `hc${n}_name`];
    const title = this._esc(name || (this._hcCount > 1 ? `${i.heating_circuit} ${n}` : i.heating_circuit));
    const em = this._emitter(this._hcTypes[n - 1], title);
    let { vl, rl } = em;
    if (n > 1) { vl = vl.replace('M640 ', 'M660 '); rl = rl.replace(/H640$/, 'H676'); }
    const pp = (id, d) => `<path class="pipe" id="p-${id}" d="${d}"/><path class="flow" id="f-${id}" d="${d}"/>`;
    const hop = n > 1 ? '<path class="hop" d="M660 483 V507"/>' : '';
    const gy = this._hcTypes[n - 1] === 'underfloor' ? [360, 480] : [365, 455];
    const risers = n > 1 ? hop + pp(`hc-up${s}`, `M660 360 V${360 + dy}`) + pp(`hc-down${s}`, `M676 ${495 + dy} V495`) : '';
    return `${risers}<g transform="translate(0 ${dy})">
      <defs><linearGradient id="g-rad${s}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" id="g-rad${s}-top"/><stop offset="100%" id="g-rad${s}-bottom"/></linearGradient>
      <linearGradient id="g-hcb${s}" gradientUnits="userSpaceOnUse" x1="0" y1="${gy[0]}" x2="0" y2="${gy[1]}"><stop offset="0" id="g-hcb${s}-a"/><stop offset="0.5" id="g-hcb${s}-m"/><stop offset="1" id="g-hcb${s}-b"/></linearGradient></defs>
      ${em.art.split('__S__').join(s)}${pp(`hc-vl${s}`, vl)}${pp(`hc-body${s}`, em.body)}${pp(`hc-rl${s}`, rl)}
      ${e[k('curve_offset')]
    // With a heating curve shift the target and its parts stand above the pump, ending at the pump; the flow temperature goes below it.
    ? `<g class="tap" ${de(k('curve_offset'))}><text class="pipe-label" id="t-hc${s}" x="736" y="334" text-anchor="end"></text></g>
      <g class="tap" ${de(k('flow'))}><text class="pipe-label" id="t-hc-now${s}" x="720" y="396" text-anchor="middle"></text></g>`
    : `<g class="tap" ${de(k('flow'))}><text class="pipe-label" id="t-hc${s}" x="740" y="334" text-anchor="middle"></text></g>`}
      <g class="tap" ${de(k('volume'))}><text class="vol-label" id="t-hc-vol${s}" x="720" y="${e[k('curve_offset')] ? 414 : 394}" text-anchor="middle"></text></g>
      ${this._config.hc_return_label ? `<g class="tap" ${de(k('return'))}><text class="vol-label" id="t-hc-rl${s}" x="690" y="515" text-anchor="start"></text></g>` : ''}
      ${n === 1 && e.hc_pressure ? `<g class="tap pressure" id="pressure-hc" ${de('hc_pressure')}><text class="pressure-label" id="t-hc-pressure" x="700" y="430" text-anchor="middle"></text></g>` : ''}
      <g class="tap" ${de(e[k('pump')] ? k('pump') : k('mode'))}>
        ${this._circuitPump(n) ? `<circle class="pump" cx="720" cy="360" r="16"/>
        <g class="impeller" id="impeller${s}"><path d="M720 348 L726 360 L714 360Z M720 372 L714 360 L726 360Z" class="imp"/></g>` : ''}
        ${em.title}
        <text class="small" id="t-hc-mode${s}" x="880" y="524" text-anchor="middle"></text>
      </g>
      ${n > 1 ? `<g class="tap" ${de(e[k('room')] ? k('room') : k('room_target'))}><text class="small" id="t-hc-room${s}" x="880" y="524" text-anchor="middle"></text></g>` : ''}
    </g>`;
  }

  // The heat pump has its own primary pump (`primary_pump`, default from the preset). It is drawn on the flow pipe next to the
  // heat pump block, centred between the flow temperature and the flow rate. A single direct circuit without its own pump sensor then has no pump of its own.
  _primaryPump() { return this._config.primary_pump ?? !!this._preset?.primary_pump; }
  _circuitPump(n) { return !(n === 1 && this._hcCount === 1 && this._primaryPump() && !this._parts.buffer && !this._e.hc_pump); }

  // Drawing of the outdoor unit inside the heat pump block (air source only; brine and water keep the loop symbol).
  // Manufacturer-inspired, logo-free outdoor units. `auto` takes the style of the preset.
  _unitKey() {
    if (this._sourceType !== 'air') return 'generic';
    const style = this._config.unit_style && this._config.unit_style !== 'auto' ? this._config.unit_style : (this._preset?.unit_style || 'generic');
    return style === 'vaillant' ? `vaillant-${this._config.unit_size || 'medium'}` : style;
  }

  // One blade, scaled to a fan of radius r at (cx, cy); the group spins around its own centre.
  _fanSvg(id, cx, cy, r, cls = '') {
    const k = r / 50;
    const p = (x, y) => `${(cx + x * k).toFixed(1)} ${(cy + y * k).toFixed(1)}`;
    const blade = `M${p(0, 0)} C${p(-10, -26)} ${p(-2, -42)} ${p(12, -44)} C${p(16, -26)} ${p(10, -10)} ${p(0, 0)}Z`;
    return `<g class="fan ${cls}" id="${id}" style="transform-origin:${cx}px ${cy}px">${[0, 120, 240].map((a) => `<path class="blade" d="${blade}" transform="rotate(${a} ${cx} ${cy})"/>`).join('')}<circle cx="${cx}" cy="${cy}" r="${(7 * k).toFixed(1)}" class="hub"/></g>`;
  }

  _snowSvg(id, cx, cy, r) {
    const arms = '<path d="M0-13V13M-4-11 0-7 4-11M-4 11 0 7 4 11"/>';
    return `<g class="snow" id="${id}" transform="translate(${cx} ${cy}) scale(${(r / 18).toFixed(2)})"><circle class="snow-bg" r="18"/><g class="snow-flake">${arms}<g transform="rotate(60)">${arms}</g><g transform="rotate(120)">${arms}</g></g></g>`;
  }

  // { below, fans: [[cx, cy, r, class]], above, snows: [[cx, cy, r]] } in card coordinates. Parts are drawn relative to the block (50, 190).
  _unitArt() {
    const key = this._unitKey();
    const T = (s) => (s ? `<g transform="translate(50 190)">${s}</g>` : '');
    const abs = (x, y) => [x + 50, y + 190];
    if (key === 'lambda') {
      const bars = [45, 53, 61, 69, 77, 85, 93, 101].map((y) => `<path class="lam-cut" d="M99 ${y} H141"/>`).join('');
      return {
        below: T('<rect class="lam-plinth" x="83" y="150" width="74" height="5" rx="1"/><rect class="lam-body" x="88" y="36" width="64" height="114" rx="3"/><rect class="lam-edge" x="88" y="36" width="8" height="114" rx="2"/><rect class="lam-edge" x="144" y="36" width="8" height="114" rx="2"/><rect class="lam-open" x="99" y="40" width="42" height="66" rx="2"/>'),
        fans: [[...abs(120, 73), 19, 'lam-fan']],
        above: T(`${bars}<path class="lam-cut curve" d="M108 106 C105 84 111 60 120 41"/><path class="lam-cut curve" d="M132 106 C135 84 129 60 120 41"/><path class="lam-cut vein" d="M120 106 V66"/><path class="lam-hi" d="M88 106 H152"/><path class="lam-hi" d="M96 38 V148 M144 38 V148"/><rect class="lam-slot" x="128" y="132" width="3.5" height="13" rx="1.7"/><rect class="lam-rim" x="88" y="36" width="64" height="114" rx="3"/>`),
        snows: [[...abs(120, 73), 17]],
      };
    }
    if (key.startsWith('vaillant')) {
      // Sizes from the data sheets (width 1100 mm): 765 mm (3.5 / 5.5 kW), 965 mm (7.5 kW), about 1480 mm with two fans (10.5 / 12.5 kW).
      const size = { 'vaillant-small': [60, 68, 120, 82, 1], 'vaillant-large': [77, 34, 86, 116, 2] }[key] || [60, 45, 120, 105, 1];
      const [x, y, w, h, n] = size;
      const pw = Math.round(w * 0.6);
      const grilles = n === 1
        ? [[x + 4 + pw / 2, y + h / 2, Math.min(pw / 2 - 4, h / 2 - 8)]]
        : [0, 1].map((m) => [x + 4 + pw / 2, y + 4 + (h - 8) * (0.25 + 0.5 * m), Math.min(pw / 2 - 3, (h - 8) / 4 - 2)]);
      const ring = ([cx, cy, r]) => `<circle class="vai-gr" cx="${cx}" cy="${cy}" r="${r}"/><circle class="vai-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.76).toFixed(1)}"/><circle class="vai-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.52).toFixed(1)}"/>${Array.from({ length: 12 }, (_, m) => { const a = (m * Math.PI) / 6; return `<line class="vai-gr thin" x1="${(cx + Math.cos(a) * 7).toFixed(1)}" y1="${(cy + Math.sin(a) * 7).toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}"/>`; }).join('')}`;
      return {
        below: T(`<rect class="vai-foot" x="${x + 10}" y="${y + h}" width="14" height="6" rx="2"/><rect class="vai-foot" x="${x + w - 24}" y="${y + h}" width="14" height="6" rx="2"/><rect class="vai-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(14, w / 8)}"/><rect class="vai-dark" x="${x + 4}" y="${y + 4}" width="${pw}" height="${h - 8}" rx="9"/>${grilles.map(ring).join('')}`),
        fans: grilles.map(([cx, cy, r]) => [...abs(cx, cy), +(r * 0.86).toFixed(1), 'vai-fan']),
        above: T(`<path class="vai-seam" d="M${x + pw + 8} ${y + 6} V${y + h - 6}"/>`),
        snows: grilles.map(([cx, cy, r]) => [...abs(cx, cy), +Math.min(19, r * 0.58).toFixed(1)]),
      };
    }
    if (key === 'panasonic') {
      // Aquarea H/J/K outdoor units: a pale rectangular casing, large left-hand grille and a narrow service panel.
      // This is an original simplified drawing without branding; proportions follow the common single-fan 824/875 mm units.
      const x = 58; const y = 48; const w = 124; const h = 96;
      const cx = 102; const cy = 95; const r = 37;
      const grille = `<circle class="pana-gr" cx="${cx}" cy="${cy}" r="${r}"/><circle class="pana-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.78).toFixed(1)}"/><circle class="pana-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.54).toFixed(1)}"/>${Array.from({ length: 16 }, (_, m) => { const a = (m * Math.PI) / 8; return `<line class="pana-gr thin" x1="${(cx + Math.cos(a) * 7).toFixed(1)}" y1="${(cy + Math.sin(a) * 7).toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}"/>`; }).join('')}`;
      return {
        below: T(`<rect class="pana-foot" x="${x + 10}" y="${y + h}" width="15" height="6" rx="1.5"/><rect class="pana-foot" x="${x + w - 25}" y="${y + h}" width="15" height="6" rx="1.5"/><rect class="pana-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/><path class="pana-top" d="M${x + 3} ${y + 7} H${x + w - 3}"/>${grille}`),
        fans: [[...abs(cx, cy), +(r * 0.82).toFixed(1), 'pana-fan']],
        above: T(`<path class="pana-seam" d="M148 ${y + 8} V${y + h - 7}"/><path class="pana-vents" d="M156 76h17M156 82h17M156 88h17M156 94h17M156 100h17M156 106h17M156 112h17"/><rect class="pana-panel" x="157" y="119" width="15" height="12" rx="1.5"/>`),
        snows: [[...abs(cx, cy), 18]],
      };
    }
    if (key === 'viessmann') {
      // Vitocal 250-A: tall graphite body with a softly rounded, full-height horizontal-louvre front.
      const x = 78; const y = 28; const w = 84; const h = 124; const cx = 120; const cy = 88; const r = 32;
      const slats = Array.from({ length: 17 }, (_, n) => `<path class="vies-slat" d="M${x + 9} ${y + 12 + n * 6} H${x + w - 9}"/>`).join('');
      return {
        below: T(`<rect class="vies-foot" x="${x + 9}" y="${y + h}" width="14" height="5" rx="1.5"/><rect class="vies-foot" x="${x + w - 23}" y="${y + h}" width="14" height="5" rx="1.5"/><rect class="vies-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><circle class="vies-well" cx="${cx}" cy="${cy}" r="${r + 3}"/>`),
        fans: [[...abs(cx, cy), r, 'vies-fan']],
        above: T(`<g>${slats}</g><rect class="vies-rim" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>`),
        snows: [[...abs(cx, cy), 18]],
      };
    }
    if (key === 'bosch') {
      // Compress 5800i/6800i AW: broad pale casing, rounded corners and one centred circular intake.
      const x = 52; const y = 50; const w = 136; const h = 94; const cx = 120; const cy = 96; const r = 37;
      const spokes = Array.from({ length: 16 }, (_, n) => { const a = (n * Math.PI) / 8; return `<line class="bosch-gr thin" x1="${(cx + Math.cos(a) * 8).toFixed(1)}" y1="${(cy + Math.sin(a) * 8).toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}"/>`; }).join('');
      return {
        below: T(`<rect class="bosch-foot" x="${x + 13}" y="${y + h}" width="15" height="6" rx="2"/><rect class="bosch-foot" x="${x + w - 28}" y="${y + h}" width="15" height="6" rx="2"/><rect class="bosch-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="13"/><circle class="bosch-gr" cx="${cx}" cy="${cy}" r="${r}"/><circle class="bosch-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.74).toFixed(1)}"/>${spokes}`),
        fans: [[...abs(cx, cy), +(r * 0.83).toFixed(1), 'bosch-fan']],
        above: T(`<path class="bosch-top" d="M${x + 13} ${y + 9} H${x + w - 13}"/><rect class="bosch-mark" x="${x + w - 19}" y="${y + 13}" width="5" height="18" rx="2.5"/>`),
        snows: [[...abs(cx, cy), 18]],
      };
    }
    if (key === 'saunier') {
      // GeniaAir Mono: white horizontal casing, black fan grille with the characteristic red accent ring.
      const x = 56; const y = 56; const w = 128; const h = 88; const cx = 101; const cy = 99; const r = 35;
      const spokes = Array.from({ length: 14 }, (_, n) => { const a = (n * Math.PI) / 7; return `<line class="sd-gr thin" x1="${(cx + Math.cos(a) * 7).toFixed(1)}" y1="${(cy + Math.sin(a) * 7).toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}"/>`; }).join('');
      return {
        below: T(`<rect class="sd-foot" x="${x + 10}" y="${y + h}" width="15" height="6" rx="2"/><rect class="sd-foot" x="${x + w - 25}" y="${y + h}" width="15" height="6" rx="2"/><rect class="sd-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><circle class="sd-accent" cx="${cx}" cy="${cy}" r="${r + 2}"/><circle class="sd-gr" cx="${cx}" cy="${cy}" r="${r}"/><circle class="sd-gr thin" cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(1)}"/>${spokes}`),
        fans: [[...abs(cx, cy), +(r * 0.82).toFixed(1), 'sd-fan']],
        above: T(`<path class="sd-seam" d="M148 ${y + 8} V${y + h - 8}"/><path class="sd-vents" d="M157 83h17M157 90h17M157 97h17M157 104h17M157 111h17"/><rect class="sd-badge" x="160" y="120" width="10" height="4" rx="2"/>`),
        snows: [[...abs(cx, cy), 18]],
      };
    }
    if (key === 'samsung') {
      // EHS Mono HT Quiet: dark-grey monolith with a horizontal black grille hiding the fan.
      const x = 57; const y = 46; const w = 126; const h = 102; const cx = 103; const cy = 97; const r = 34;
      const slats = Array.from({ length: 13 }, (_, n) => `<path class="sam-slat" d="M${x + 8} ${y + 14 + n * 6} H${x + 88}"/>`).join('');
      return {
        below: T(`<rect class="sam-foot" x="${x + 10}" y="${y + h}" width="15" height="6" rx="2"/><rect class="sam-foot" x="${x + w - 25}" y="${y + h}" width="15" height="6" rx="2"/><rect class="sam-body" x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><rect class="sam-grille" x="${x + 5}" y="${y + 7}" width="88" height="${h - 14}" rx="3"/>`),
        fans: [[...abs(cx, cy), r, 'sam-fan']],
        above: T(`<g>${slats}</g><path class="sam-seam" d="M${x + 96} ${y + 8} V${y + h - 8}"/><circle class="sam-dot" cx="${x + 110}" cy="${y + 17}" r="2"/>`),
        snows: [[...abs(cx, cy), 18]],
      };
    }
    return { below: '<circle class="fan-ring" cx="170" cy="288" r="50"/>', fans: [[170, 288, 50, '']], above: '', snows: [[170, 288, 18]] };
  }

  /* ---------- keyboard and screen readers ---------- */
  // Clickable parts become buttons. The schematic, the tiles and the details are one tab stop each (arrow keys, Home and End move
  // inside); the header chips are tab stops of their own. Elements that are not shown (empty labels, hidden by the narrow layout) are skipped.
  _a11y(force) {
    const now = Date.now();
    if (!force && now - (this._a11yAt || 0) < 2000) return;
    this._a11yAt = now;
    const root = this.shadowRoot;
    if (!root) return;
    const shown = (el) => {
      if (el instanceof SVGGraphicsElement) { try { return el.getBBox().width > 0 && getComputedStyle(el).display !== 'none'; } catch (err) { return false; } }
      return el.getClientRects().length > 0;
    };
    const label = (el) => {
      if (el.dataset.a11y) return el.dataset.a11y;
      const st = this._hass?.states[el.dataset.entity];
      if (!st) return '';
      const attr = hfcTempAttr(el.dataset.entity);
      if (attr) return `${st.attributes?.friendly_name || el.dataset.entity}: ${this._t(parseFloat(st.attributes?.[attr]))}`;
      const u = st.attributes?.unit_of_measurement;
      return `${st.attributes?.friendly_name || el.dataset.entity}: ${st.state}${u ? ` ${u}` : ''}`;
    };
    [['#svg [data-entity]', 'svg', true], ['#stats .stat', 'stats', false], ['#drawer-body .drow', 'drawer', false]].forEach(([sel, name, labelled]) => {
      const all = [...root.querySelectorAll(sel)];
      const items = all.filter(shown);
      const keep = Math.min(this._focusMem?.[name] ?? 0, items.length - 1);
      items.forEach((el, n) => {
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        const t = n === keep ? '0' : '-1';
        if (el.getAttribute('tabindex') !== t) el.setAttribute('tabindex', t);
        if (labelled) { const l = label(el); if (l && el.getAttribute('aria-label') !== l) el.setAttribute('aria-label', l); }
      });
      all.forEach((el) => { if (!items.includes(el) && el.hasAttribute('tabindex')) el.removeAttribute('tabindex'); });
    });
    root.querySelectorAll('.head [data-entity], .head [data-badge]').forEach((el) => {
      if (shown(el)) { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); } else el.removeAttribute('tabindex');
    });
  }

  // Arrow keys, Home and End move the focus between the items of a group; the focused item is the group's tab stop.
  _rove(box, selector, name) {
    if (!box) return;
    this._focusMem = this._focusMem || {};
    const items = () => [...box.querySelectorAll(selector)].filter((el) => el.getAttribute('tabindex') !== null);
    box.addEventListener('focusin', (ev) => {
      const list = items(); const n = list.indexOf(ev.target);
      if (n < 0) return;
      this._focusMem[name] = n;
      list.forEach((el, m) => el.setAttribute('tabindex', m === n ? '0' : '-1'));
      if (name === 'svg') this._showRing(ev.target);
    });
    box.addEventListener('focusout', () => { if (name === 'svg') this._hideRing(); });
    box.addEventListener('keydown', (ev) => {
      const list = items(); const n = list.indexOf(ev.target);
      if (n < 0) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      let to = null;
      if (step) to = (n + step + list.length) % list.length;
      else if (ev.key === 'Home') to = 0;
      else if (ev.key === 'End') to = list.length - 1;
      if (to === null) return;
      ev.preventDefault();
      list[to].focus();
      if (name === 'svg') this._showRing(list[to], true);
    });
  }

  // Focus frame inside the schematic (outlines on SVG groups are not drawn everywhere): a rectangle around the focused group.
  _showRing(el, force) {
    if (!(el instanceof SVGGraphicsElement)) return;
    if (!force && !el.matches(':focus-visible')) return;
    this._hideRing();
    let b;
    try { b = el.getBBox(); } catch (err) { return; }
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('class', 'focus-ring');
    [['x', b.x - 5], ['y', b.y - 5], ['width', b.width + 10], ['height', b.height + 10], ['rx', 8]].forEach(([k, v]) => r.setAttribute(k, v));
    el.appendChild(r);
    this._ring = r;
  }
  _hideRing() { if (this._ring) { this._ring.remove(); this._ring = null; } }

  /* ---------- timeline of the operating mode ---------- */
  // Entities whose history tells what the heat pump did: the operating mode, else the compressor (and the valve for hot water).
  _timelineIds() {
    if (this._has('mode')) return { mode: this._e.mode };
    if (this._has('compressor')) return { comp: this._e.compressor, valve: this._has('valve') ? this._e.valve : null };
    return null;
  }

  // History of one or two entities as { entity: [{ t: ms, s: state }] }. Accepts the compact format of the history API
  // ({ s, lu } with seconds) and the full state objects ({ state, last_updated } with ISO strings).
  _timelineHistory(res, ids) {
    const time = (e) => {
      const v = e.lu ?? e.lc ?? e.last_updated ?? e.last_changed;
      const ms = typeof v === 'number' ? (v > 1e11 ? v : v * 1000) : Date.parse(v);
      return ms;
    };
    const out = {};
    ids.forEach((id) => {
      const list = (res && res[id]) || [];
      out[id] = list.map((e) => ({ t: time(e), s: String(e.s ?? e.state) })).filter((e) => Number.isFinite(e.t)).sort((a, b) => a.t - b.t);
    });
    return out;
  }

  // Segments { kind, raw, from, to } between start and end: heat, dhw, defrost, cool, blocked, idle or gap (no data).
  _timelineSegments(hist, ids, start, end) {
    const kindOfMode = (raw) => {
      if (['unknown', 'unavailable', 'None'].includes(raw)) return 'gap';
      const m = this._norm(this._maps.mode, raw);
      return { heating: 'heat', dhw: 'dhw', defrost: 'defrost', cooling: 'cool', blocked: 'blocked' }[m] || 'idle';
    };
    const points = [];
    if (ids.mode) hist[ids.mode].forEach((e) => points.push({ t: e.t, kind: kindOfMode(e.s), raw: e.s }));
    else {
      // Compressor on = heating, with the valve on hot water = dhw.
      const comp = hist[ids.comp]; const valve = ids.valve ? hist[ids.valve] : [];
      const at = (list, t) => { let s; for (const e of list) { if (e.t <= t) s = e.s; else break; } return s; };
      const on = (s) => s !== undefined && !['off', 'unavailable', 'unknown', '0', '0.0'].includes(String(s).toLowerCase());
      const dhw = (s) => s !== undefined && (['on', 'tank', 'dhw', 'hot water', 'warmwasser'].includes(String(s).toLowerCase()));
      [...new Set([...comp.map((e) => e.t), ...valve.map((e) => e.t)])].sort((a, b) => a - b).forEach((t) => {
        const cs = at(comp, t);
        if (['unknown', 'unavailable'].includes(cs)) points.push({ t, kind: 'gap', raw: cs });
        else points.push({ t, kind: on(cs) ? (dhw(at(valve, t)) ? 'dhw' : 'heat') : 'idle', raw: on(cs) ? 'on' : 'off' });
      });
    }
    const segs = [];
    points.forEach((p, n) => {
      const from = Math.max(p.t, start); const to = Math.min(points[n + 1] ? points[n + 1].t : end, end);
      if (to <= from) return;
      const last = segs[segs.length - 1];
      if (last && last.kind === p.kind && last.to === from) last.to = to; else segs.push({ kind: p.kind, raw: p.raw, from, to });
    });
    return segs;
  }

  // Entities shown as extra lanes under the bar: timeline_marks true = the badges, or a list of entities / { entity, label }.
  _timelineMarks() {
    const m = this._config.timeline_marks;
    if (!m) return [];
    const list = m === true ? this._badges : (Array.isArray(m) ? m : []);
    const seen = new Set();
    return list.map((x) => (typeof x === 'string' ? { entity: x } : x)).filter((x) => x && x.entity && !seen.has(x.entity) && seen.add(x.entity))
      .map((x) => ({ entity: x.entity, label: x.label || this._hass.states[x.entity]?.attributes?.friendly_name || x.entity }));
  }

  // Periods in which a mark entity was on (same on-states as the badge chips), merged, between start and end.
  _timelineMarkSegments(hist, mark, start, end) {
    const list = hist[mark.entity] || [];
    const segs = [];
    list.forEach((e, n) => {
      if (!['on', 'true', 'home', 'open', 'ein'].includes(String(e.s).toLowerCase())) return;
      const from = Math.max(e.t, start); const to = Math.min(list[n + 1] ? list[n + 1].t : end, end);
      if (to <= from) return;
      const last = segs[segs.length - 1];
      if (last && last.to === from) last.to = to; else segs.push({ from, to });
    });
    return segs;
  }

  _timelineTime(ms) {
    let tz; try { tz = this._hass.config?.time_zone; new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (err) { tz = undefined; }
    return new Intl.DateTimeFormat(this._lang, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(ms);
  }

  _timelineDuration(ms) {
    const m = Math.max(Math.round(ms / 60000), 1);
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  }

  _timelineLabel(seg) {
    const i = this._i;
    if (seg.kind === 'gap') return i.timeline_gap;
    return { heat: i.modes.heating, dhw: i.modes.dhw, defrost: i.modes.defrost, cool: i.modes.cooling, blocked: i.modes.blocked, idle: i.modes.idle }[seg.kind];
  }

  _timelineDetail(seg) {
    return `${this._timelineLabel(seg)} · ${this._timelineTime(seg.from)}–${this._timelineTime(seg.to)} · ${this._timelineDuration(seg.to - seg.from)}`;
  }

  _updateTimeline() {
    const box = this._$('timeline');
    if (!box) return;
    const ids = this._timelineIds();
    const hours = Math.min(Math.max(+this._config.timeline_hours || 24, 3), 72);
    const idList = ids ? Object.values(ids).filter(Boolean) : [];
    if (!idList.length) { box.hidden = true; return; }
    const now = Date.now(); const start = now - hours * 3600000;
    const marks = this._timelineMarks();
    const allIds = [...new Set([...idList, ...marks.map((m) => m.entity)])];
    const hist = this._wsCached(`timeline|${allIds.join(',')}|${hours}`, {
      type: 'history/history_during_period', start_time: new Date(start).toISOString(), entity_ids: allIds,
      minimal_response: true, no_attributes: true, significant_changes_only: false,
    }, (res) => this._timelineHistory(res, allIds));
    if (!hist) { box.hidden = true; return; }
    // The window is cached for five minutes; the bar always ends at "now".
    const segs = this._timelineSegments(hist, ids, start, now);
    if (!segs.length) { box.hidden = true; return; }
    const lanes = marks.map((m, n) => ({ ...m, n, segs: this._timelineMarkSegments(hist, m, start, now) })).filter((l) => l.segs.length);
    const minute = Math.floor(now / 60000);
    const key = `${minute}|${segs.map((s) => `${s.kind}${s.from}${s.to}`).join(',')}|${lanes.map((l) => `${l.n}${l.label}${l.segs.map((s) => `${s.from}-${s.to}`).join(',')}`).join(';')}|${this._lang}|${this._tlSel ?? ''}|${this._tlMarkSel ?? ''}`;
    if (box._k === key) return;
    box._k = key; box.hidden = false;
    this._tl = { segs, start, now, lanes };
    const pct = (t) => (((t - start) / (now - start)) * 100).toFixed(3);
    const i = this._i;
    // Hour ticks at clock times (every 6 h for a day), found in the Home Assistant time zone.
    const step = hours <= 6 ? 1 : hours <= 24 ? 6 : hours <= 48 ? 12 : 24;
    let tz; try { tz = this._hass.config?.time_zone; new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (err) { tz = undefined; }
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz });
    const ticks = [];
    for (let t = Math.ceil(start / 900000) * 900000; t < now; t += 900000) {
      const [h, m] = fmt.format(t).split(':').map(Number);
      if (m === 0 && h % step === 0) ticks.push([t, String(h).padStart(2, '0')]);
    }
    const kinds = [...new Set(segs.map((s) => s.kind))].filter((k) => k !== 'idle');
    const sel = segs.findIndex((s) => s.from === this._tlSel);
    const markDetail = (l, s) => `${l.label} · ${this._timelineTime(s.from)}–${this._timelineTime(s.to)} · ${this._timelineDuration(s.to - s.from)}`;
    let detail = sel >= 0 ? this._timelineDetail(segs[sel]) : '';
    lanes.forEach((l) => l.segs.forEach((s) => { if (`${l.n}:${s.from}` === this._tlMarkSel) detail = markDetail(l, s); }));
    box.innerHTML = `<div class="tl-head"><span>${this._esc(i.timeline_title.replace('{h}', hours))}</span><span class="tl-detail" id="tl-detail" aria-live="polite">${this._esc(detail)}</span></div>
      <div class="tl-bar" id="tl-bar" tabindex="0" role="group" aria-label="${this._esc(i.timeline_aria.replace('{h}', hours))}">${segs.map((s, n) =>
    `<span class="seg k-${s.kind}${n === sel ? ' sel' : ''}" data-seg="${n}" style="left:${pct(s.from)}%;width:${(pct(s.to) - pct(s.from)).toFixed(3)}%" title="${this._esc(this._timelineDetail(s))}"></span>`).join('')}</div>
      ${lanes.map((l) => `<div class="tl-mark" role="img" aria-label="${this._esc(`${l.label}: ${l.segs.map((s) => `${this._timelineTime(s.from)}–${this._timelineTime(s.to)}`).join(', ')}`)}">${l.segs.map((s) =>
    `<span class="mseg${`${l.n}:${s.from}` === this._tlMarkSel ? ' sel' : ''}" data-mseg="${l.n}:${s.from}" style="left:${pct(s.from)}%;width:${(pct(s.to) - pct(s.from)).toFixed(3)}%" title="${this._esc(markDetail(l, s))}"></span>`).join('')}</div>`).join('')}
      <div class="tl-axis">${ticks.map(([t, l]) => `<span style="left:${pct(t)}%">${l}</span>`).join('')}</div>
      <div class="tl-legend">${kinds.map((k) => `<span><i class="k-${k}"></i>${this._esc(this._timelineLabel({ kind: k }))}</span>`).join('')}${lanes.map((l) => `<span><i class="k-mark"></i>${this._esc(l.label)}</span>`).join('')}</div>`;
  }

  // Tap or arrow keys select a period and show its start, end and duration.
  _timelineEvents(box) {
    const select = (n) => {
      const seg = this._tl?.segs[n];
      if (!seg) return;
      this._tlSel = seg.from; this._tlMarkSel = null;
      box._k = null; this._updateTimeline();
      this._$('tl-bar')?.focus({ preventScroll: true });
    };
    box.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-seg]'); if (el) { select(+el.dataset.seg); return; }
      // A tap on a lane shows that period; a second tap on the same one clears it.
      const m = ev.target.closest('[data-mseg]');
      if (m) { this._tlMarkSel = this._tlMarkSel === m.dataset.mseg ? null : m.dataset.mseg; this._tlSel = null; box._k = null; this._updateTimeline(); }
    });
    box.addEventListener('keydown', (ev) => {
      if (ev.target.id !== 'tl-bar' || !this._tl) return;
      const segs = this._tl.segs; const cur = segs.findIndex((s) => s.from === this._tlSel);
      const to = { ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur < 0 ? segs.length - 1 : cur - 1, ArrowUp: cur < 0 ? segs.length - 1 : cur - 1, Home: 0, End: segs.length - 1 }[ev.key];
      if (to === undefined) return;
      ev.preventDefault();
      select(Math.min(Math.max(to, 0), segs.length - 1));
    });
  }

  // Heater rod entering a tank from the right wall at height y; backup / inline heater as a box inside the heat pump.
  _heaterSvg(key, id, y) {
    if (!this._has(key)) return '';
    const de = `data-entity="${this._esc(this._e[key])}"`;
    if (id === 'inline') {
      return `<g class="tap heater" id="heater-${id}" ${de}><rect class="heater-box" x="230" y="266" width="46" height="30" rx="6"/>
        <path class="heater-el" d="M236 281 l4 -8 l6 16 l6 -16 l6 16 l6 -16 l6 16 l4 -8"/></g>`;
    }
    return `<g class="tap heater" id="heater-${id}" ${de}><rect class="heater-flange" x="638" y="${y - 9}" width="9" height="18" rx="2"/>
      <path class="heater-el" d="M640 ${y - 4} H${id === 'dhw' ? 610 : 584} Q${id === 'dhw' ? 604 : 578} ${y - 4} ${id === 'dhw' ? 604 : 578} ${y} Q${id === 'dhw' ? 604 : 578} ${y + 4} ${id === 'dhw' ? 610 : 584} ${y + 4} H640"/></g>`;
  }

  // Solar thermal collector on the roof edge of the house, with a loop into the right side of the DHW tank.
  _solarSvg() {
    const entity = this._e.solar_collector || this._e.solar_pump;
    const flow = 'M736 112 H706 Q690 112 690 128 V134 Q690 150 674 150 H640';
    const back = 'M640 166 H700 Q712 166 712 154 V140 Q712 126 727 126';
    const pp = (id, d) => `<path class="pipe" id="p-${id}" d="${d}"/><path class="flow" id="f-${id}" d="${d}"/>`;
    return `${pp('sol', flow)}${pp('sol-rl', back)}
      <path class="coil" id="coil-sol" d="M640 150 H612 Q602 150 602 158 Q602 166 612 166 H640"/>
      <g class="tap solar" id="solar" data-entity="${this._esc(entity)}">
        <g transform="translate(728 124) rotate(-36)"><rect class="collector" x="0" y="-24" width="84" height="22" rx="3"/>
          <path class="collector-cells" d="M21 -24 V-2 M42 -24 V-2 M63 -24 V-2 M0 -13 H84"/></g>
        <text class="small" id="t-sol" x="716" y="94" text-anchor="end"></text>
      </g>`;
  }

  // Ground loop (brine) or two wells (groundwater) below the heat pump; air keeps the fan.
  _sourceSvg() {
    if (this._sourceType === 'air') return '';
    const pp = (id, d) => `<path class="pipe src" id="p-${id}" d="${d}"/><path class="flow" id="f-${id}" d="${d}"/>`;
    const ground = '<path class="ground" d="M60 478 H280"/>';
    const out = this._e.source_out ? `data-entity="${this._esc(this._e.source_out)}"` : '';
    const inn = this._e.source_in ? `data-entity="${this._esc(this._e.source_in)}"` : '';
    const labels = `<g class="tap" ${out}><text class="small" id="t-src-out" x="130" y="462" text-anchor="end"></text></g>
      <g class="tap" ${inn}><text class="small" id="t-src-in" x="210" y="462"></text></g>
      <g class="tap" ${inn}><text class="small source-spread" id="t-src-spread" x="96" y="512" text-anchor="middle"></text></g>
      <g class="tap" ${this._e.source_volume ? `data-entity="${this._esc(this._e.source_volume)}"` : ''}><text class="vol-label" id="t-src-vol" x="212" y="512"></text></g>
      ${this._sourceType === 'brine' && this._e.brine_pressure ? `<g class="tap pressure" id="pressure-brine" data-entity="${this._esc(this._e.brine_pressure)}"><text class="pressure-label" id="t-brine-pressure" x="170" y="532" text-anchor="middle"></text></g>` : ''}`;
    if (this._sourceType === 'brine') {
      return `${ground}${pp('src', 'M140 425 V528 Q140 548 170 548 Q200 548 200 528 V425')}${labels}`;
    }
    return `${ground}<rect class="well" x="126" y="486" width="28" height="66" rx="4"/><rect class="well" x="186" y="486" width="28" height="66" rx="4"/>
      <path class="water" d="M128 512 q6 -4 12 0 t12 0 M188 512 q6 -4 12 0 t12 0"/>
      ${pp('src-in', 'M200 540 V425')}${pp('src-out', 'M140 425 V540')}${labels}`;
  }

  // Entity behind a power source: the manual entity, or the Energy dashboard's power sensor.
  _srcEntity(key) {
    if (this._parts.power !== 'energy') return this._e[key];
    const r = this._energy[{ pv: 'solar', battery: 'battery', grid: 'grid' }[key]][0];
    return r && (r.id || r.from || r.to);
  }

  _source(key, x, label, entity) {
    const icons = {
      pv: `<circle cx="${x}" cy="40" r="9" class="ico"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
        `<line x1="${x}" y1="25" x2="${x}" y2="20" class="ico-l" transform="rotate(${a} ${x} 40)"/>`).join('')}`,
      bat: `<rect x="${x - 8}" y="30" width="16" height="22" rx="3" class="ico-o"/><rect x="${x - 4}" y="26" width="8" height="4" rx="1" class="ico"/><rect x="${x - 5}" y="40" width="10" height="9" rx="1" class="ico"/>`,
      grid: `<path d="M${x - 10} 54 L${x} 24 L${x + 10} 54 M${x - 7} 44 H${x + 7} M${x - 12} 32 H${x + 12}" class="ico-l"/>`,
    };
    const has = entity && this._hass.states[entity];
    return `<g class="tap src ${key}${has ? '' : ' absent'}" ${has ? `data-entity="${this._esc(entity)}"` : ''} id="src-${key}">
      <circle cx="${x}" cy="40" r="28" class="src-ring"/>${icons[key]}
      <text class="small" x="${x}" y="88" text-anchor="middle" id="t-src-${key}">${this._esc(label)}</text>
      <text class="small src-val" x="${x}" y="108" text-anchor="middle" id="t-src-${key}-v"></text>
    </g>`;
  }

  _moreInfo(entityId) {
    const e = new Event('hass-more-info', { bubbles: true, composed: true });
    e.detail = { entityId };
    this.dispatchEvent(e);
  }

  // The actions configured for an element of the schematic, the header or the drawer. A badge has its own, every other element
  // carries the actions of the entity key it shows (`actions: { dhw_top: … }`); without any, a tap opens more-info.
  _elementActs(ev) {
    const path = ev.composedPath();
    const pick = (cfg) => Object.fromEntries(HFC_ACTIONS.filter((a) => cfg && cfg[a]).map((a) => [a, cfg[a]]));
    const badge = path.find((n) => n.dataset && n.dataset.badge !== undefined);
    if (badge) { const b = this._badges[+badge.dataset.badge]; return b ? { entity: b.entity, ...pick(b) } : null; }
    const el = path.find((n) => n.dataset && n.dataset.entity);
    if (!el) return null;
    const id = el.dataset.entity;
    const own = Object.entries(this._config.actions || {}).find(([k]) => this._e[k] === id);
    return { entity: id, ...pick(own && own[1]) };
  }

  _actEvents(box) { this._pointerActions(box, (ev) => this._elementActs(ev)); }

  /* ---------- card tools ---------- */
  _wireTools() {
    this._$('diagnostic-copy')?.addEventListener('click', () => this._copyDiagnostic());
    this._$('fullscreen-toggle')?.addEventListener('click', () => (this._fullscreenOpen ? this._closeFullscreen() : this._openFullscreen()));
    this._$('fullscreen-backdrop')?.addEventListener('click', () => this._closeFullscreen());
  }

  async _writeClipboard(text) {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;left:-9999px;top:0';
    this.shadowRoot.appendChild(area); area.select();
    const copied = document.execCommand && document.execCommand('copy'); area.remove();
    if (!copied) throw new Error('Clipboard API unavailable');
  }

  async _copyDiagnostic() {
    const button = this._$('diagnostic-copy'); const status = this._$('tool-status');
    try {
      await this._writeClipboard(HeatpumpFlowCard._diagnosticReport(this._config, this._hass));
      if (status) status.textContent = this._i.diagnostic_copied;
      if (button) { button.classList.add('done'); button.title = this._i.diagnostic_copied; button.setAttribute('aria-label', this._i.diagnostic_copied); }
    } catch (err) {
      if (status) status.textContent = this._i.diagnostic_failed;
      if (button) { button.title = this._i.diagnostic_failed; button.setAttribute('aria-label', this._i.diagnostic_failed); }
    }
    clearTimeout(this._diagnosticTimer);
    this._diagnosticTimer = setTimeout(() => {
      const b = this._$('diagnostic-copy'); if (!b) return;
      b.classList.remove('done'); b.title = this._i.diagnostic_copy; b.setAttribute('aria-label', this._i.diagnostic_copy);
    }, 1800);
  }

  _openFullscreen() {
    if (this._fullscreenOpen || this._config.fullscreen === false) return;
    this._fullscreenOpen = true;
    this._bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    this._fullscreenKeyHandler = this._fullscreenKeyHandler || ((ev) => this._fullscreenKey(ev));
    document.addEventListener('keydown', this._fullscreenKeyHandler);
    this._render(); this._update();
    this._$('fullscreen-toggle')?.focus({ preventScroll: true });
  }

  _closeFullscreen(restoreFocus = true, render = true) {
    if (!this._fullscreenOpen) return;
    this._fullscreenOpen = false;
    document.removeEventListener('keydown', this._fullscreenKeyHandler);
    if (this._bodyOverflow !== undefined) { document.body.style.overflow = this._bodyOverflow; delete this._bodyOverflow; }
    if (render && this.shadowRoot && this._hass && this._config) { this._render(); this._update(); }
    if (restoreFocus) this._$('fullscreen-toggle')?.focus({ preventScroll: true });
  }

  _fullscreenKey(ev) {
    if (!this._fullscreenOpen) return;
    if (ev.key === 'Escape') { ev.preventDefault(); this._closeFullscreen(); return; }
    if (ev.key !== 'Tab') return;
    const card = this.shadowRoot.querySelector('ha-card');
    const focusable = [...card.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')]
      .filter((el) => !el.hidden && el.getClientRects().length);
    if (!focusable.length) return;
    const current = this.shadowRoot.activeElement; const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (ev.shiftKey && (current === first || !card.contains(current))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && current === last) { ev.preventDefault(); first.focus(); }
  }

  // Wall display: the quick controls and the details toggle appear on a touch or mouse move and fade out again.
  _wallSeconds() {
    const t = this._config.wall_timeout;
    return t === undefined || t === null || t === '' ? HFC_WALL_TIMEOUT : +t;
  }
  _wake() {
    const card = this.shadowRoot && this.shadowRoot.querySelector('ha-card');
    if (!card) return;
    this._awake = true; card.classList.add('awake');
    clearTimeout(this._sleepTimer);
    const sec = this._wallSeconds();
    if (sec > 0) this._sleepTimer = setTimeout(() => this._sleep(), sec * 1000);
  }
  _sleep() {
    const card = this.shadowRoot && this.shadowRoot.querySelector('ha-card');
    if (!card) return;
    // Keep the controls while one of them is being used (an open dropdown, a number field).
    if (this.shadowRoot.activeElement && card.querySelector('.controls')?.contains(this.shadowRoot.activeElement)) { this._sleepTimer = setTimeout(() => this._sleep(), 2000); return; }
    this._awake = false; card.classList.remove('awake');
    const drawer = this._$('drawer-body');
    if (drawer && !drawer.hidden) { this._drawerOpen = false; drawer.hidden = true; this._$('drawer-toggle')?.setAttribute('aria-expanded', 'false'); }
  }
  disconnectedCallback() { clearTimeout(this._sleepTimer); clearTimeout(this._diagnosticTimer); this._closeFullscreen(false, false); }

  // Tiles: the actions of the tile under the pointer.
  _tileEvents(box) {
    this._pointerActions(box, (ev) => {
      const el = ev.composedPath().find((n) => n.dataset && n.dataset.tile !== undefined);
      return el ? this._tileActs?.[+el.dataset.tile] : null;
    });
  }

  // Tap, hold (500 ms) and double tap (within 250 ms, only waited for when configured).
  _pointerActions(box, actOf) {
    let timer = null; let held = false; let pending = null;
    box.addEventListener('pointerdown', (ev) => {
      const a = actOf(ev);
      held = false; clearTimeout(timer);
      if (a?.hold_action) timer = setTimeout(() => { held = true; this._tileAction(a, 'hold'); }, 500);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => box.addEventListener(t, () => clearTimeout(timer)));
    box.addEventListener('contextmenu', (ev) => { if (actOf(ev)?.hold_action) ev.preventDefault(); });
    // Keyboard: Enter or Space = tap, Shift+Enter = hold, Alt+Enter = double tap.
    box.addEventListener('keydown', (ev) => {
      if (['BUTTON', 'SELECT', 'INPUT', 'TEXTAREA'].includes(ev.target.tagName)) return;
      const act = ev.key === 'Enter' ? (ev.shiftKey ? 'hold' : ev.altKey ? 'double_tap' : 'tap') : (ev.key === ' ' || ev.key === 'Spacebar' ? 'tap' : null);
      if (!act) return;
      const a = actOf(ev);
      if (!a) return;
      ev.preventDefault();
      this._tileAction(a, act);
    });
    box.addEventListener('click', (ev) => {
      const a = actOf(ev);
      if (!a) return;
      if (held) { held = false; return; }
      if (!a.double_tap_action) { this._tileAction(a, 'tap'); return; }
      if (pending) { clearTimeout(pending); pending = null; this._tileAction(a, 'double_tap'); return; }
      pending = setTimeout(() => { pending = null; this._tileAction(a, 'tap'); }, 250);
    });
  }

  // Configured actions go to Home Assistant's action handler (hass-action), so all standard actions and confirmations work.
  _tileAction(a, action) {
    const cfg = a[`${action}_action`];
    if (!cfg) { if (action === 'tap' && a.entity) this._moreInfo(a.entity); return; }
    if (cfg.action === 'none') return;
    const e = new Event('hass-action', { bubbles: true, composed: true });
    e.detail = { config: a, action };
    this.dispatchEvent(e);
  }

  /* ---------- update ---------- */
  _update() {
    if (!this._rendered || !this._hass) return;
    const i = this._i;
    const P = this._parts;
    const rawMode = this._s('mode');
    const status = this._s('status') || '';
    let hp = this._norm(this._maps.mode, rawMode);
    const dhwMode = this._norm(this._maps.dhw, this._s('dhw_mode'));
    const bufMode = this._norm(this._maps.buffer, this._s('buffer_mode'));
    const power = this._w('power');
    const vol = this._lh('volume');
    const tFlow = this._n('flow'); const tRet = this._n('return');
    const spread = Number.isFinite(tFlow) && Number.isFinite(tRet) ? tFlow - tRet : NaN;
    // Compressor may be a binary sensor or a numeric one (frequency / speed > 0 means running).
    const compOn = this._has('compressor') && (this._on('compressor') || this._n('compressor') > 0);
    const running = compOn || power > this._threshold || this._runningStates.includes(status)
      || (!this._has('compressor') && !this._has('power') && !this._has('status') && ['heating', 'dhw', 'cooling', 'defrost'].includes(hp));
    const defrost = hp === 'defrost' || status.toUpperCase().includes('DEFROST') || (this._has('defrost') && this._on('defrost'));
    // Valve: binary (on = DHW) or a state such as "Tank" / "DHW".
    const valveDhw = this._has('valve') && (this._on('valve') || ['tank', 'tank (dhw)', 'dhw', 'hot water', 'hot_water', 'warmwasser'].includes(String(this._s('valve')).toLowerCase()));
    // Integrations without an operating-mode entity: a running compressor means heating unless the valve says DHW.
    // Defrost wins over a stopped compressor: it pauses for about a minute while the 4-way valve switches (HeishaMon).
    if (!this._has('mode')) hp = defrost ? 'defrost' : !running ? 'idle' : (valveDhw ? 'dhw' : 'heating');
    // A defrost entity wins over an operating mode that keeps reporting heating while the unit defrosts (e.g. Kronoterm).
    else if (this._has('defrost') && this._on('defrost') && ['heating', 'cooling', 'dhw'].includes(hp)) hp = 'defrost';
    const cooling = hp === 'cooling' || bufMode === 'cooling';

    const dhwActive = P.dhw && (hp === 'dhw' || ['dhw', 'legionella'].includes(dhwMode) || valveDhw);
    const toDhw = dhwActive && (running || dhwMode === 'trailing' || hp === 'dhw');
    const toHeat = !toDhw && (['heating', 'defrost', 'cooling'].includes(hp) || ['heating', 'cooling'].includes(bufMode));
    const loop = toDhw || toHeat;
    // The primary pump also runs without heating or hot water (Panasonic "sniffing", run-on): the water then circulates
    // slowly along the valve path. It only moves the water, so mode chip, valve text, spread and heat stay idle.
    const circ = this._primaryPump() && !loop && Number.isFinite(vol) && vol > 0;
    const flowDhw = toDhw || (circ && valveDhw && !!P.dhw);
    const flowHeat = toHeat || (circ && !flowDhw);
    const flowLoop = flowDhw || flowHeat;

    // Heat output: sensor, or estimated from flow rate × spread × 1.163 Wh/(l·K) for water.
    let heat = this._kw('heat');
    let heatEstimated = false;
    if (!this._has('heat') && loop && running && vol > 0 && spread > 0) { heat = (vol * spread * 1.163) / 1000; heatEstimated = true; }

    // Animation speed: fan, flow dashes and pumps follow the compressor modulation when the integration reports it,
    // the flow dashes the flow rate, the fan otherwise the electrical power.
    const mod = this._speedFraction();
    const modOk = Number.isFinite(mod) && mod > 0;
    const speed = this._flowSpeed;
    const scaled = (seconds) => `${(seconds / speed).toFixed(2)}s`;
    const dur = circ ? 6 : Number.isFinite(vol) && vol > 0 ? Math.min(Math.max(3.4 - vol / 1000, 0.8), 3) : (modOk ? 2.6 - mod * 1.8 : 2);
    this.style.setProperty('--hfc-dur', scaled(dur));
    // A fan speed entity wins: the fan runs on after the compressor stops. Numeric values are rpm, else on/off.
    const fanRpm = this._has('fan_speed') ? this._n('fan_speed') : NaN;
    const fanOn = this._has('fan_speed') ? (Number.isFinite(fanRpm) ? fanRpm > 0 : this._on('fan_speed')) : running;
    const fanDur = !fanOn ? 0 : Number.isFinite(fanRpm) ? Math.min(Math.max(2.4 - fanRpm / 500, 0.5), 2.4)
      : (modOk ? 2.4 - mod * 1.9 : Math.min(Math.max(2.4 - (power || 0) / 1500, 0.5), 2.4));
    this.style.setProperty('--hfc-fan', scaled(fanDur));
    this.style.setProperty('--hfc-pump', scaled(modOk ? 1.8 - mod * 1.2 : 1.2));
    this.style.setProperty('--hfc-electrical', scaled(1.1));
    this.style.setProperty('--hfc-coil', scaled(1.4));
    this.style.setProperty('--hfc-snow', scaled(1.6));
    this.style.setProperty('--hfc-vapour', scaled(2.2));
    this.style.setProperty('--hfc-wave', scaled(2.4));
    this.style.setProperty('--hfc-wave-delay', scaled(0.8));
    this.style.setProperty('--hfc-wave-delay2', scaled(1.6));

    // pipes
    const cFlow = defrost || cooling ? hfcVar('defrost') : this._vlColor(tFlow);
    const cRet = this._rlColor(tRet);
    const stroke = (id, c) => { const el = this._$(`p-${id}`); if (el) el.style.setProperty('--pc', c); };
    ['vl', 'vl-dhw', 'vl-buf', 'byp-vl'].forEach((id) => stroke(id, cFlow));
    ['rl', 'rl-dhw', 'rl-buf', 'byp-rl'].forEach((id) => stroke(id, cRet));
    const pipe = (id, on) => { this._cls(`p-${id}`, on); this._cls(`f-${id}`, on); };
    pipe('vl', flowLoop); pipe('rl', flowLoop);
    // The heat pump's own primary pump runs with a flow rate, else with the hot-water or heating loop. Its speed follows
    // the flow rate, so a sniffing pump with a few l/h turns slowly.
    this._cls('impeller-primary', Number.isFinite(vol) ? vol > 0 : loop);
    const primary = this._$('impeller-primary');
    if (primary) primary.style.animationDuration = Number.isFinite(vol) && vol > 0 ? scaled(Math.min(Math.max(800 / vol, 0.6), 8)) : '';
    pipe('vl-dhw', flowDhw); pipe('rl-dhw', flowDhw);
    pipe('vl-buf', flowHeat); pipe('rl-buf', flowHeat);
    pipe('byp-vl', flowHeat); pipe('byp-rl', flowHeat);
    // Series buffer: the bypass valve follows its own entity, else the defrost signal, and then stops the circuits.
    const bypass = !!P.series && (this._has('bypass_valve') ? this._on('bypass_valve') : defrost);
    if (P.series) {
      stroke('sb-vl', cFlow); stroke('sb-a', cFlow); stroke('sb-b', cRet);
      pipe('sb-vl', flowHeat && !bypass); pipe('sb-a', flowHeat && bypass); pipe('sb-b', flowHeat && !bypass);
      this._$('sb-arrow')?.setAttribute('d', bypass ? 'M600 481 V495 H586 M593 488 L586 495 L593 502' : 'M614 495 H586 M593 488 L586 495 L593 502');
      this._$('sb-tank')?.style.setProperty('fill', `color-mix(in oklch, ${cRet} 30%, var(--card-background-color, #fff))`);
      this._txt('t-bypass', bypass ? i.bypass : '');
    }
    this._cls('coil', toDhw);

    if (P.hc || this._hcCount > 1) {
      const pick = (...v) => v.find((x) => Number.isFinite(x)) ?? NaN;
      const k2 = this._hcCount > 1 ? parseFloat(getComputedStyle(this._$('svg')).getPropertyValue('--k2')) || 1 : 1;
      for (let n = 1; n <= this._hcCount; n++) {
        const k = (key) => this._hk(n, key);
        const s = n === 1 ? '' : String(n);
        const cMode = this._norm(this._maps.hc, this._s(k('mode')));
        // Circuit pump, else circuit mode, else assume the circuit runs whenever the heat pump heats or cools.
        const hcOn = !bypass && (this._has(k('pump')) ? this._on(k('pump')) : (this._has(k('mode')) ? ['heating', 'cooling'].includes(cMode) : flowHeat));
        // Without circuit sensors fall back to the buffer / main loop temperatures.
        const tHc = pick(this._n(k('flow')), this._n('buffer_top'), tFlow);
        const tHcR = pick(this._n(k('return')), this._n('buffer_bottom'), tRet);
        const cHc = cMode === 'cooling' ? hfcVar('defrost') : this._vlColor(tHc);
        stroke(`hc-vl${s}`, cHc); stroke(`hc-body${s}`, cHc); stroke(`hc-rl${s}`, this._rlColor(tHcR));
        if (n > 1) { stroke(`hc-up${s}`, cHc); stroke(`hc-down${s}`, this._rlColor(tHcR)); pipe(`hc-up${s}`, hcOn); pipe(`hc-down${s}`, hcOn); }
        const rt = this._$(`g-rad${s}-top`); const rb = this._$(`g-rad${s}-bottom`);
        if (rt) { rt.setAttribute('stop-color', hcOn ? cHc : 'var(--disabled-text-color, #9e9e9e)'); rb.setAttribute('stop-color', hcOn ? this._rlColor(tHcR) : 'var(--disabled-text-color, #9e9e9e)'); }
        [`hc-vl${s}`, `hc-body${s}`, `hc-rl${s}`].forEach((id) => pipe(id, hcOn));
        // The heating surface fades from the flow colour to the return colour; one colour when the temperatures do not differ.
        const grad = hcOn && cMode !== 'cooling' && Number.isFinite(tHc) && Number.isFinite(tHcR) && Math.abs(tHc - tHcR) >= 0.5;
        const ga = this._$(`g-hcb${s}-a`); const gm = this._$(`g-hcb${s}-m`); const gb = this._$(`g-hcb${s}-b`); const body = this._$(`p-hc-body${s}`);
        if (ga && gb && body) {
          if (grad) { const rc = this._rlColor(tHcR); ga.setAttribute('stop-color', cHc); gb.setAttribute('stop-color', rc); gm.setAttribute('stop-color', `color-mix(in oklch, ${rc} 50%, ${cHc})`); }
          body.style.stroke = grad ? `url(#g-hcb${s})` : '';
        }
        this._cls(`impeller${s}`, hcOn);
        this._cls(`waves${s}`, hcOn && cMode !== 'cooling');
        const set = this._n(k('setpoint'));
        const showFlow = this._has(k('flow')) || (n === 1 && !P.buffer && this._has('flow'));
        const hcVol = this._lh(k('volume'));
        this._txt(`t-hc-vol${s}`, this._has(k('volume')) && Number.isFinite(hcVol) ? `${this._fmt(hcVol, 0)} l/h` : '');
        if (this._$(`t-hc-now${s}`)) {
          // Heating curve shift: "Target 36 °C (curve 34 °C + 2 K shift)" above the pump, the flow temperature below it.
          // Only the circuit's own flow sensor: the heat pump's flow already stands at the VL label.
          this._txt(`t-hc-now${s}`, this._has(k('flow')) ? this._t(tHc) : '');
          this._hcTarget(n, set, this._n(k('curve_offset')), this._unit(k('curve_offset')));
        } else {
          this._txt(`t-hc${s}`, showFlow ? `${this._t(tHc)}${Number.isFinite(set) ? ` · ${i.target} ${this._fmt(set)}` : ''}` : '');
        }
        // Own return sensor of the circuit only; the fallback to the buffer or heat pump return would repeat another label.
        if (this._config.hc_return_label) this._txtPre(`t-hc-rl${s}`, i.return_short, this._has(k('return')) && Number.isFinite(this._n(k('return'))) ? this._t(this._n(k('return'))) : '');
        this._hcStatus(n, this._has(k('mode')) ? this._modeLabel(cMode, this._s(k('mode'))) : (hcOn ? i.running : ''), k2);
        if (n === 1 && this._has('hc_pressure')) this._updatePressure('hc_pressure', 'hc', 'pressure-hc', 't-hc-pressure', i.hc_pressure);
      }
    }

    // solar thermal: collector temperature, loop animated while the solar pump runs
    if (P.solar) {
      const tc = this._n('solar_collector');
      const on = this._level('solar_pump') > 0;
      stroke('sol', this._vlColor(tc)); stroke('sol-rl', this._rlColor(this._n('dhw_bottom')));
      pipe('sol', on); pipe('sol-rl', on);
      this._cls('coil-sol', on); this._cls('solar', on);
      this._txt('t-sol', Number.isFinite(tc) ? this._t(tc) : i.solar);
    }

    // heaters
    [['heater', 'inline'], ['dhw_heater', 'dhw'], ['buffer_heater', 'buf']].forEach(([key, id]) => {
      const el = this._$(`heater-${id}`); if (!el) return;
      const lv = this._level(key);
      el.classList.toggle('on', lv > 0); el.classList.toggle('stage2', lv > 1);
    });

    this._txtPre('t-vl', 'VL', this._has('flow') ? this._t(tFlow) : '');
    this._txtPre('t-rl', 'RL', this._has('return') ? this._t(tRet) : '');
    this._txt('t-vol', this._has('volume') && flowLoop && Number.isFinite(vol) ? `${this._fmt(vol, 0)} l/h` : '');

    // heat pump
    this._cls('fan', fanOn); this._cls('fan2', fanOn);
    this._cls('snow', defrost && this._sourceType === 'air'); this._cls('snow2', defrost && this._sourceType === 'air'); this._cls('vapour', defrost && this._sourceType === 'air'); this._cls('hp-box', running);
    const hpBox = this._$('hp-box');
    if (hpBox) {
      ['dhw', 'defrost', 'cool'].forEach((c) => hpBox.classList.remove(c));
      const tone = defrost ? 'defrost' : cooling ? 'cool' : toDhw ? 'dhw' : '';
      if (tone) hpBox.classList.add(tone);
    }
    // Some integrations report "heating" while charging DHW (e.g. ViCare compressor phase); the valve decides.
    const shownMode = toDhw && ['heating', 'idle', ''].includes(hp) ? 'dhw' : hp;
    const modeTxt = this._modeLabel(shownMode, rawMode);
    const sl = (this._statusLabels[this._lang] || this._statusLabels.en || {})[status];
    this._hpStatus(`${modeTxt}${running && sl ? ` · ${sl}` : ''}`);
    const heatTxt = Number.isFinite(heat) ? `${heatEstimated ? '≈' : ''}${this._fmt(heat, 1)} kW` : '';
    this._txt('t-hp-power', running
      ? (Number.isFinite(power) ? `${this._fmt(power, 0)} W${heatTxt ? ` → ${heatTxt}` : ''}` : (heatTxt || i.running))
      : i.compressor_off);
    const cop = running && power > 50 && heat > 0 ? (heat * 1000) / power : NaN;
    this._txt('t-hp-cop', Number.isFinite(cop) ? `COP ${heatEstimated ? '≈' : ''}${this._fmt(cop, 1)}` : '');
    const srcVol = this._lh('source_volume');
    const srcParts = [];
    if (this._has('source_in')) srcParts.push(`${i.source_in} ${this._t(this._n('source_in'))}`);
    if (this._has('source_volume') && srcVol > 0) srcParts.push(`${i.source_flow} ${this._fmt(srcVol, 0)} l/h`);
    if (this._sourceType === 'air') { this._txt('t-src-in', srcParts.join(' · ')); this._$('t-outdoor-hp')?.setAttribute('y', srcParts.length ? 472 : 450); }
    else {
      const brine = this._sourceType === 'brine';
      this._txt('t-src-in', this._has('source_in') ? `${brine ? i.brine_in : i.well_in} ${this._t(this._n('source_in'))}` : '');
      this._txt('t-src-out', this._has('source_out') ? `${brine ? i.brine_out : i.well_out} ${this._t(this._n('source_out'))}` : '');
      const sourceSpread = this._n('source_in') - this._n('source_out');
      this._txt('t-src-spread', this._sourceSpread && running && Number.isFinite(sourceSpread) ? `ΔT ${this._fmt(sourceSpread)} K` : '');
      this._txt('t-src-vol', this._has('source_volume') && srcVol > 0 ? `${this._fmt(srcVol, 0)} l/h` : '');
      if (brine && this._has('brine_pressure')) this._updatePressure('brine_pressure', 'brine', 'pressure-brine', 't-brine-pressure', i.brine_pressure);
      ['src', 'src-in', 'src-out'].forEach((id) => pipe(id, running));
    }

    // valve + tanks
    if (P.dhw) {
      const arrow = this._$('valve-arrow');
      if (arrow) arrow.setAttribute('transform', toDhw ? '' : 'rotate(180 420 250)');
      this._txt('t-valve', loop ? (toDhw ? i.valve_dhw : (cooling ? i.valve_cooling : i.valve_heating)) : '');
      // Without a top sensor the large value stays empty: the lower sensors show their value at their own position.
      const hasTop = this._has('dhw_top');
      const top = this._n(hasTop ? 'dhw_top' : this._has('dhw_middle') ? 'dhw_middle' : 'dhw_bottom');
      const bot = this._has('dhw_bottom') ? this._n('dhw_bottom') : top - 5;
      this._$('g-dhw-top').setAttribute('stop-color', this._tankColor(top));
      if (this._has('dhw_middle')) this._$('g-dhw-middle')?.setAttribute('stop-color', this._tankColor(this._n('dhw_middle')));
      this._$('g-dhw-bottom').setAttribute('stop-color', this._tankColor(bot));
      this._txt('t-dhw-top', hasTop ? this._t(top) : '');
      this._txt('t-dhw-middle', this._has('dhw_middle') ? `${i.middle} ${this._t(this._n('dhw_middle'))}` : '');
      // The position label only tells sensors apart; a single bottom sensor shows the bare value at the bottom.
      const onlyBottom = !hasTop && !this._has('dhw_middle');
      this._txt('t-dhw-bottom', this._has('dhw_bottom') ? `${onlyBottom ? '' : `${i.bottom} `}${this._t(this._n('dhw_bottom'))}` : '');
      const tgt = this._n('dhw_target');
      const parts = [];
      if (this._has('dhw_mode')) parts.push(this._modeLabel(dhwMode, this._s('dhw_mode')));
      if (Number.isFinite(tgt)) parts.push(`${i.target} ${this._fmt(tgt, 0)} °C`);
      this._txt('t-dhw-mode', parts.join(' · '));
      this._cls('t-circ', this._on('circulation'));
    }
    if (P.buffer) {
      const top = this._n('buffer_top'); const bot = this._has('buffer_bottom') ? this._n('buffer_bottom') : top - 5;
      this._$('g-buf-top').setAttribute('stop-color', this._tankColor(top));
      if (this._has('buffer_middle')) this._$('g-buf-middle')?.setAttribute('stop-color', this._tankColor(this._n('buffer_middle')));
      this._$('g-buf-bottom').setAttribute('stop-color', this._tankColor(bot));
      this._txt('t-buf-top', this._t(top));
      this._txt('t-buf-middle', this._has('buffer_middle') ? `${i.middle} ${this._t(this._n('buffer_middle'))}` : '');
      this._txt('t-buf-bottom', this._has('buffer_bottom') ? `${i.bottom} ${this._t(this._n('buffer_bottom'))}` : '');
      this._txt('t-buf-mode', this._has('buffer_mode') ? this._modeLabel(bufMode, this._s('buffer_mode')) : '');
    }

    // house
    if (P.house) {
      const rt = this._n('room_target'); const r = this._n('room');
      const tgt = Number.isFinite(rt) ? `${i.target} ${this._fmt(rt)} °C` : '';
      // Room sensor missing or unknown: promote the target to the big line.
      this._txt('t-room', Number.isFinite(r) ? this._t(r) : tgt);
      this._txt('t-room-target', Number.isFinite(r) ? tgt : '');
    }
    const outTxt = this._has('outdoor') ? `${i.outdoor} ${this._t(this._n('outdoor'))}` : '';
    this._txt('t-outdoor', outTxt); this._txt('t-outdoor-hp', outTxt);

    // power sources
    if (P.power) {
      const split = P.power === 'energy' ? this._energySplit() : null;
      [['pv', 'pv', i.pv], ['bat', 'battery', i.battery], ['grid', 'grid', i.grid]].forEach(([id, key, label]) => {
        const w = P.power === 'energy' ? (split ? split[key] : NaN) : this._w(key); const on = w > 10;
        this._cls(`ef-${id}`, on); this._cls(`src-${id}`, on);
        this._txt(`t-src-${id}`, label);
        this._txt(`t-src-${id}-v`, on ? `${P.power === 'energy' ? '≈' : ''}${this._fmt(w, 0)} W` : '');
      });
    }

    // header chips
    const chip = this._$('chip-mode');
    chip.textContent = `${modeTxt}${running ? ` · ${i.running}` : ''}`;
    chip.className = `chip mode-${defrost ? 'defrost' : cooling ? 'cool' : toDhw ? 'dhw' : toHeat ? 'heat' : 'idle'}`;
    this._badges.forEach((b, n) => this._cls(`chip-b${n}`, ['on', 'true', 'home', 'open', 'ein'].includes(String(this._hass.states[b.entity]?.state).toLowerCase())));
    const errs = this._errors.filter((id) => {
      const state = this._hass.states[id]?.state;
      if (state === undefined) return false;
      const raw = String(state).trim(); const normalized = raw.toLowerCase(); const value = Number(raw);
      if (Number.isFinite(value)) return value !== 0;
      if (normalized === 'on') return true;
      if (['unknown', 'unavailable', 'off', ''].includes(normalized)) return false;
      return this._errorOk.length > 0 && !this._errorOk.includes(normalized);
    });
    const prog = this._program();
    const pc = this._$('chip-program');
    const progKind = prog && prog.kind !== 'none' ? prog.kind : '';
    if (pc._kind !== progKind) {
      pc._kind = progKind;
      pc.className = `chip program${progKind ? ` on ${progKind}` : ''}`;
      pc.innerHTML = progKind ? `${HFC_PROGRAM_ICONS[progKind]}${this._esc(i.programs[progKind])}` : '';
    }
    if (progKind) pc.dataset.entity = prog.entity;
    const err = this._$('chip-err');
    err.classList.toggle('on', errs.length > 0);
    if (errs.length) err.dataset.entity = errs[0];

    // statistics: the tile catalog when `tiles` is set, otherwise the default tiles
    const share = this._n('pv_share_today');
    const custom = Array.isArray(this._config.tiles);
    const tiles = custom ? this._catalogTiles({ loop, flowLoop, spread, vol, heat, heatEstimated, power, cop }) : [];
    const add = (key, label, value) => { if (!custom && this._has(key)) tiles.push([this._statLabel(key, label), value, this._e[key]]); };
    add('cop_heating_today', i.stat_cop_heating, this._fmt(this._n('cop_heating_today'), 2));
    add('cop_dhw_today', i.stat_cop_dhw, this._fmt(this._n('cop_dhw_today'), 2));
    add('energy_today', i.stat_energy, `${this._fmt(this._n('energy_today'), 1)} kWh${Number.isFinite(share) ? ` · ${this._fmt(share, 0)} % ${i.pv_share}` : ''}`);
    add('starts_today', i.stat_starts, this._fmt(this._n('starts_today'), 0));
    if (!custom && this._has('flow') && this._has('return')) tiles.push([i.stat_spread, loop && Number.isFinite(spread) ? `${this._fmt(spread, 1)} K` : '–', this._e.flow]);
    add('volume', i.stat_volume, flowLoop && Number.isFinite(vol) ? `${this._fmt(vol, 0)} l/h` : '–');
    if (!custom && heatEstimated) tiles.push([i.stat_heat, `≈${this._fmt(heat, 1)} kW`, this._e.volume]);
    (this._config.stats || []).forEach((s) => {
      const st = this._hass.states[s.entity]; if (!st) return;
      const v = parseFloat(st.state);
      const unit = s.unit ?? st.attributes.unit_of_measurement ?? '';
      tiles.push([s.name || st.attributes.friendly_name || s.entity, Number.isFinite(v) ? `${this._fmt(v, s.decimals ?? 1)} ${unit}`.trim() : st.state, s.entity, s]);
    });
    // Actions per tile (default: more-info of the tile's entity).
    this._tileActs = tiles.map(([, , id, s]) => ({ entity: id, ...Object.fromEntries(HFC_ACTIONS.filter((a) => s && s[a]).map((a) => [a, s[a]])) }));
    const html = tiles.map(([l, v, id], n) => `<div class="stat" data-tile="${n}" data-entity="${this._esc(id)}"><div class="sv">${this._esc(v)}</div><div class="sl">${this._esc(l)}</div></div>`).join('');
    const box = this._$('stats');
    if (box._html !== html) {
      const had = this.shadowRoot.activeElement?.dataset?.tile;
      box.innerHTML = html; box._html = html; box.style.display = tiles.length ? '' : 'none';
      this._a11y(true);
      if (had !== undefined) box.querySelector(`[data-tile="${had}"]`)?.focus();
    }
    this._updateControls();
    this._updateDrawer();
    this._updateTimeline();
    this._a11y();
  }
}

HeatpumpFlowCard.styles = `
  :host { display: block; --hfc-muted: var(--secondary-text-color, #888); }
  ha-card { padding: 12px 12px 8px; overflow: hidden; background: var(--card-background-color, #fff); }
  .fullscreen-backdrop { position: fixed; inset: 0; z-index: 2147483645; background: rgba(0,0,0,.62); }
  ha-card.fullscreen { position: fixed; inset: 0; z-index: 2147483646; box-sizing: border-box; width: 100vw; height: 100dvh; margin: 0;
    border-radius: 0; overflow: auto; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
  @media (min-width: 1640px) and (min-height: 800px) { ha-card.fullscreen { inset: 20px; width: min(1600px, calc(100vw - 40px)); height: calc(100dvh - 40px); margin: auto; border-radius: 14px; } }
  .theme-night { color-scheme: dark; --card-background-color: #111827; --primary-text-color: #e5e7eb; --secondary-text-color: #94a3b8;
    --secondary-background-color: #1e293b; --divider-color: #475569; --hfc-muted: #94a3b8; --hfc-heat: #c8783d; --hfc-hot: #c75b5b;
    --hfc-cool: #5795ad; --hfc-cool-strong: #4387a3; --hfc-defrost: #79aabd; --hfc-pv: #c79336; --hfc-battery: #3f9b78;
    --hfc-grid: #7f8a9a; --hfc-good: #4f9c5a; --hfc-badge: #9263b5; --hfc-brine: #668fc4; --hfc-ground: #8f6a35;
    --hfc-flow-cold: #c47742; --hfc-flow-hot: #b64c4c; --hfc-return-cold: #6b9fb4; --hfc-return-hot: #486eaa;
    --hfc-tank-cold: #486eaa; --hfc-tank-cool: #3e91a4; --hfc-tank-warm: #c8783d; --hfc-tank-hot: #c75b5b; --hfc-flow-dash: rgba(255,255,255,.72); }
  .theme-contrast { color-scheme: light; --card-background-color: #fff; --primary-text-color: #000; --secondary-text-color: #111;
    --secondary-background-color: #fff; --divider-color: #000; --hfc-muted: #111; --hfc-heat: #a83a00; --hfc-hot: #a40000;
    --hfc-cool: #006b8f; --hfc-cool-strong: #00506b; --hfc-defrost: #00749a; --hfc-pv: #8a5b00; --hfc-battery: #006b3c;
    --hfc-grid: #333; --hfc-good: #006b28; --hfc-badge: #5d2483; --hfc-brine: #0057b8; --hfc-ground: #664000;
    --hfc-flow-cold: #b84f00; --hfc-flow-hot: #a40000; --hfc-return-cold: #00749a; --hfc-return-hot: #003f9e;
    --hfc-tank-cold: #003f9e; --hfc-tank-cool: #006b8f; --hfc-tank-warm: #b84f00; --hfc-tank-hot: #a40000; --hfc-flow-dash: #fff; }
  .theme-contrast .pipe { stroke-width: 11; } .theme-contrast .unit, .theme-contrast .tank, .theme-contrast .house,
  .theme-contrast .src-ring, .theme-contrast .pump { stroke-width: 3; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: 0 4px 4px; }
  .head-right { display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
  .card-tools { display: inline-flex; align-items: center; gap: 3px; }
  .icon-button { width: 30px; height: 30px; padding: 5px; border: 1px solid transparent; border-radius: 7px; color: var(--hfc-muted); background: transparent; cursor: pointer; }
  .icon-button:hover { border-color: var(--divider-color, rgba(127,127,127,.35)); background: var(--secondary-background-color, rgba(127,127,127,.12)); }
  .icon-button.done { color: ${hfcVar('good')}; }
  .icon-button svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .title { font-size: 1.15em; font-weight: 600; color: var(--primary-text-color); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { cursor: pointer; font-size: .82em; padding: 3px 10px; border-radius: 999px; background: var(--secondary-background-color, rgba(127,127,127,.15)); color: var(--primary-text-color); white-space: nowrap; }
  .chip.mode-heat { background: ${hfcTint('heat', 18)}; color: ${hfcInk('heat')}; }
  .chip.mode-dhw { background: ${hfcTint('hot', 16)}; color: ${hfcInk('hot')}; }
  .chip.mode-defrost, .chip.mode-cool { background: ${hfcTint('cool', 20)}; color: ${hfcInk('cool')}; }
  .chip.badge, .chip.err, .chip.program { display: none; }
  .chip.program.on { display: inline-block; }
  .chip.program.eco { background: ${hfcTint('good', 18)}; color: ${hfcInk('good')}; }
  .chip.program.night { background: ${hfcTint('cool-strong', 18)}; color: ${hfcInk('cool-strong')}; }
  .chip.program.party { background: ${hfcTint('pv', 20)}; color: ${hfcInk('pv')}; }
  .chip.program.holiday { background: ${hfcTint('badge', 18)}; color: ${hfcInk('badge')}; }
  .chip.badge.on { display: inline-block; background: ${hfcTint('badge', 18)}; color: ${hfcInk('badge')}; }
  .chip.err.on { display: inline-block; background: ${hfcTint('hot', 20)}; color: ${hfcInk('hot')}; }
  .chip .ico { display: inline-block; width: 1.1em; height: 1.1em; vertical-align: -.2em; margin-right: 4px; fill: none; stroke: currentColor; stroke-width: 2.2; }
  svg { width: 100%; height: auto; display: block; }
  text { fill: var(--primary-text-color); font-family: var(--ha-font-family-body, inherit); }
  .tap { cursor: pointer; }
  .small { font-size: calc(15px * var(--k2, 1)); fill: var(--hfc-muted); }
  .series-title { font-size: 14px; fill: var(--primary-text-color); }
  .room-temp { font-weight: 600; fill: var(--primary-text-color); }
  .pipe-label { font-size: calc(15px * var(--kp, 1)); font-weight: 600; }
  .vol-label { font-size: 13px; fill: var(--hfc-muted); }
  .pressure-label { font-size: 13px; font-weight: 600; fill: var(--hfc-muted); paint-order: stroke; stroke: var(--card-background-color, #fff); stroke-width: 4px; }
  .pressure.warning .pressure-label { fill: ${hfcInk('pv')}; } .pressure.critical .pressure-label { fill: ${hfcInk('hot')}; }
  .unit { fill: var(--secondary-background-color, rgba(127,127,127,.12)); stroke: var(--divider-color, rgba(127,127,127,.35)); stroke-width: 2; transition: stroke .4s; }
  .unit.on.dhw { stroke: ${hfcVar('hot')}; } .unit.on.defrost, .unit.on.cool { stroke: ${hfcVar('cool-strong')}; }
  .unit.on { stroke: ${hfcVar('heat')}; filter: url(#glow); }
  .unit-title, .tank-title { font-size: calc(17px * var(--k, 1)); font-weight: 600; }
  .unit-status { font-size: calc(16px * var(--ku, 1)); font-weight: 600; }
  .unit-status .status2 { font-size: .88em; font-weight: 500; fill: var(--hfc-muted); }
  .unit-val { font-size: calc(15px * var(--ku, 1)); fill: var(--hfc-muted); }
  .unit-val.strong { font-size: calc(17px * var(--ku, 1)); font-weight: 700; fill: ${hfcVar('good')}; }
  .fan-ring { fill: none; stroke: var(--divider-color, rgba(127,127,127,.35)); stroke-width: 3; }
  .blade { fill: var(--hfc-muted); opacity: .55; }
  .hub { fill: var(--hfc-muted); }
  .fan { transform-box: view-box; transform-origin: 170px 288px; }
  .fan.on { animation: hfc-spin var(--hfc-fan, 1s) linear infinite; }
  .fan.on .blade { fill: ${hfcVar('cool')}; opacity: .9; }
  .snow { opacity: 0; }
  .snow-bg { fill: var(--card-background-color, #fff); opacity: .85; }
  .snow-flake { fill: none; stroke: ${hfcVar('cool-strong')}; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
  .snow.on { opacity: 1; animation: hfc-pulse var(--hfc-snow, 1.6s) ease-in-out infinite; }
  .vapour { opacity: 0; pointer-events: none; }
  .vapour-puff { fill: none; stroke: ${hfcVar('defrost')}; stroke-width: 4; stroke-linecap: round; }
  .vapour.on { opacity: .85; }
  .vapour.on .vapour-puff { animation: hfc-vapour var(--hfc-vapour, 2.2s) ease-out infinite; transform-box: fill-box; transform-origin: center bottom; }
  .vapour.on .vapour-puff:nth-child(2) { animation-delay: .45s; } .vapour.on .vapour-puff:nth-child(3) { animation-delay: .9s; }
  /* idle pipes are a solid pale tint, not transparent, so round caps that overlap at a junction do not show as dots */
  .pipe { fill: none; stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; stroke: color-mix(in srgb, var(--pc, var(--hfc-muted)) 22%, var(--card-background-color, #fff)); transition: stroke .5s; }
  .pipe.on { stroke: var(--pc, var(--hfc-muted)); }
  .flow { fill: none; stroke: ${hfcVar('flow-dash')}; stroke-width: 3.5; stroke-linecap: round; stroke-dasharray: 3 17; opacity: 0; pointer-events: none; }
  .flow.on { opacity: 1; animation: hfc-dash var(--hfc-dur, 1.5s) linear infinite; }
  .eline { fill: none; stroke-width: 4; stroke-linecap: round; opacity: .18; }
  .eline.pv { stroke: ${hfcVar('pv')}; } .eline.bat { stroke: ${hfcVar('battery')}; } .eline.grid { stroke: ${hfcVar('grid')}; }
  .eflow { fill: none; stroke-width: 7; stroke-linecap: round; stroke-dasharray: 0.1 18; opacity: 0; pointer-events: none; }
  .eflow.pv { stroke: ${hfcVar('pv')}; } .eflow.bat { stroke: ${hfcVar('battery')}; } .eflow.grid { stroke: ${hfcVar('grid')}; }
  .eflow.on { opacity: 1; animation: hfc-dash var(--hfc-electrical, 1.1s) linear infinite; }
  .hop { fill: none; stroke: var(--card-background-color, #fff); stroke-width: 15; }
  .src.absent { opacity: .35; }
  .src text { font-size: calc(15px * var(--ks, 1)); paint-order: stroke; stroke: var(--card-background-color, #fff); stroke-width: 5px; stroke-linejoin: round; }
  .src-ring { fill: var(--secondary-background-color, rgba(127,127,127,.12)); stroke: var(--divider-color, rgba(127,127,127,.35)); stroke-width: 2; transition: stroke .4s; }
  .src.pv.on .src-ring { stroke: ${hfcVar('pv')}; } .src.bat.on .src-ring { stroke: ${hfcVar('battery')}; } .src.grid.on .src-ring { stroke: ${hfcVar('grid')}; }
  .ico { fill: var(--hfc-muted); } .ico-o { fill: none; stroke: var(--hfc-muted); stroke-width: 2.5; }
  .ico-l { stroke: var(--hfc-muted); stroke-width: 2.5; fill: none; stroke-linecap: round; }
  .src.pv.on .ico { fill: ${hfcVar('pv')}; } .src.pv.on .ico-l { stroke: ${hfcVar('pv')}; }
  .src.bat.on .ico { fill: ${hfcVar('battery')}; } .src.bat.on .ico-o { stroke: ${hfcVar('battery')}; }
  .src.grid.on .ico-l { stroke: ${hfcVar('grid')}; }
  .valve { fill: var(--card-background-color, #fff); stroke: var(--hfc-muted); stroke-width: 3; }
  .valve-arrow { fill: none; stroke: var(--primary-text-color); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .tank { stroke: var(--divider-color, rgba(127,127,127,.4)); stroke-width: 2; }
  .tank-temp { font-size: calc(26px * var(--kt, 1)); font-weight: 700; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.45); stroke-width: 4px; stroke-linejoin: round; }
  .tank-sub { font-size: 14px; fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.35); stroke-width: 3px; }
  .house-temp { font-size: calc(26px * var(--kt, 1)); font-weight: 700; }
  .house-sub { font-size: calc(14px * var(--k2, 1)); }
  .coil { fill: none; stroke: rgba(255,255,255,.55); stroke-width: 3; stroke-linejoin: round; opacity: .25; }
  .coil.on { opacity: .6; stroke-width: 2.5; stroke-dasharray: 5 9; animation: hfc-dash var(--hfc-coil, 1.4s) linear infinite; }
  .circ { opacity: .35; } .circ.on { opacity: 1; fill: ${hfcVar('cool-strong')}; }
  .pump { fill: var(--card-background-color, #fff); stroke: var(--hfc-muted); stroke-width: 3; }
  .imp { fill: var(--hfc-muted); }
  .impeller { transform-box: view-box; transform-origin: 720px 360px; }
  .impeller.on { animation: hfc-spin var(--hfc-pump, 1.2s) linear infinite; }
  .impeller.on .imp { fill: ${hfcVar('heat')}; }
  .house { fill: var(--secondary-background-color, rgba(127,127,127,.1)); stroke: var(--divider-color, rgba(127,127,127,.35)); stroke-width: 2; stroke-linejoin: round; }
  .screed { fill: var(--divider-color, rgba(127,127,127,.35)); }
  .collector { fill: var(--secondary-background-color, rgba(127,127,127,.15)); stroke: var(--divider-color, rgba(127,127,127,.5)); stroke-width: 2; transition: fill .4s, stroke .4s; }
  .collector-cells { fill: none; stroke: var(--divider-color, rgba(127,127,127,.5)); stroke-width: 1.5; }
  .solar.on .collector { fill: ${hfcTint('pv', 28)}; stroke: ${hfcVar('pv')}; }
  .heater-el { fill: none; stroke: var(--disabled-text-color, #9e9e9e); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .heater-flange, .heater-box { fill: var(--secondary-background-color, rgba(127,127,127,.15)); stroke: var(--divider-color, rgba(127,127,127,.5)); stroke-width: 1.5; }
  .heater.on .heater-el { stroke: ${hfcVar('heat')}; filter: url(#glow); }
  .heater.on.stage2 .heater-el { stroke: ${hfcVar('hot')}; }
  .ground { fill: none; stroke: ${hfcVar('ground')}; stroke-width: 3; stroke-dasharray: 10 5; opacity: .7; }
  .well { fill: none; stroke: var(--divider-color, rgba(127,127,127,.5)); stroke-width: 2; }
  .water { fill: none; stroke: ${hfcVar('cool')}; stroke-width: 2; }
  .pipe.src { --pc: ${hfcVar('brine')}; }
  .radiator { fill: var(--secondary-background-color, rgba(127,127,127,.12)); stroke: var(--divider-color, rgba(127,127,127,.4)); stroke-width: 2; }
  .rib { fill: url(#g-rad); stroke: rgba(0,0,0,.08); stroke-width: 1; }
  .column-rib { stroke: var(--divider-color, rgba(127,127,127,.45)); stroke-width: 1.5; }
  .column-cap { fill: color-mix(in srgb, var(--hfc-muted) 24%, transparent); stroke: var(--divider-color, rgba(127,127,127,.45)); stroke-width: 1; }
  .column-link, .column-foot { fill: none; stroke: var(--divider-color, rgba(127,127,127,.5)); stroke-width: 4; stroke-linecap: round; }
  #p-hc-body, #f-hc-body { display: var(--hfc-body, inline); }
  .wave { fill: none; stroke: ${hfcVar('heat')}; stroke-width: 3; stroke-linecap: round; opacity: 0; }
  .waves.on .wave { animation: hfc-rise var(--hfc-wave, 2.4s) ease-in-out infinite; }
  .waves.on .wave:nth-child(2) { animation-delay: var(--hfc-wave-delay, .8s); } .waves.on .wave:nth-child(3) { animation-delay: var(--hfc-wave-delay2, 1.6s); }
  .hint { margin: 4px 4px 8px; padding: 8px 12px; border-radius: 8px; background: ${hfcTint('heat', 14)}; color: var(--primary-text-color); font-size: .9em; }
  .controls { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 4px 0; }
  .ctl { font: inherit; font-size: .88em; color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.12));
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); border-radius: 999px; padding: 5px 12px; display: inline-flex; align-items: center; gap: 6px; }
  button.ctl { cursor: pointer; }
  button.ctl.toggle.on { background: ${hfcTint('heat', 18)}; border-color: ${hfcVar('heat')}; color: ${hfcInk('heat')}; }
  button.ctl.press:active { background: ${hfcTint('heat', 25)}; }
  .ctl select, .ctl input { font: inherit; color: inherit; background: transparent; border: none; outline: none; max-width: 11em; }
  .ctl input { width: 3.5em; }
  .ctl em { font-style: normal; color: var(--hfc-muted); }
  .ctl select option { color: #000; }
  .drawer { margin: 6px 4px 0; }
  .drawer-toggle { font: inherit; font-size: .9em; color: var(--hfc-muted); background: none; border: none; cursor: pointer; padding: 4px 0; display: inline-flex; align-items: center; gap: 4px; }
  .drawer-toggle svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; transition: transform .2s; }
  .drawer-toggle[aria-expanded="true"] svg { transform: rotate(180deg); }
  .dsec { margin: 4px 0 10px; }
  .dsec-title { font-size: .78em; text-transform: uppercase; letter-spacing: .04em; color: var(--hfc-muted); margin-bottom: 4px; }
  .dgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 2px 16px; }
  .drow { cursor: pointer; display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.18)); font-size: .9em; color: var(--primary-text-color); }
  .drow span { color: var(--hfc-muted); }
  .drow b { white-space: nowrap; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 6px; margin-top: 6px; }
  .stat { cursor: pointer; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; background: var(--secondary-background-color, rgba(127,127,127,.1)); border-radius: 10px; padding: 6px 8px; text-align: center; }
  .sv { font-weight: 700; font-size: 1.05em; color: var(--primary-text-color); }
  .sl { font-size: .78em; color: var(--hfc-muted); }
  .tap, .chip, .drow { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  /* outdoor unit drawings (unit_style): anthracite and light casings derive from --hfc-anthracite and --hfc-casing */
  .lam-body { fill: ${hfcVar('anthracite')}; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 78%, #000); stroke-width: 1.5; }
  .lam-edge { fill: color-mix(in srgb, ${hfcVar('anthracite')} 78%, #000); }
  .lam-open, .lam-slot { fill: color-mix(in srgb, ${hfcVar('anthracite')} 30%, #000); }
  .lam-cut { stroke: ${hfcVar('anthracite')}; stroke-width: 3; fill: none; }
  .lam-cut.curve { stroke-width: 3.4; stroke-linecap: round; } .lam-cut.vein { stroke-width: 2.4; stroke-linecap: round; }
  .lam-hi { stroke: color-mix(in srgb, ${hfcVar('anthracite')} 85%, #fff); stroke-width: 1.2; fill: none; opacity: .8; }
  .lam-plinth { fill: color-mix(in srgb, var(--primary-text-color, #1f2937) 22%, var(--card-background-color, #fff)); }
  /* a rim in the theme text colour keeps the anthracite body visible on dark cards */
  .lam-rim { fill: none; stroke: color-mix(in srgb, var(--primary-text-color, #1f2937) 48%, transparent); stroke-width: 1.4; }
  .fan.lam-fan .blade, .fan.vai-fan .blade, .fan.pana-fan .blade, .fan.vies-fan .blade, .fan.bosch-fan .blade, .fan.sd-fan .blade, .fan.sam-fan .blade { fill: #9aa3ad; opacity: .55; }
  .fan.lam-fan .hub, .fan.vai-fan .hub, .fan.pana-fan .hub, .fan.vies-fan .hub, .fan.bosch-fan .hub, .fan.sd-fan .hub, .fan.sam-fan .hub { fill: #9aa3ad; }
  .fan.lam-fan.on .blade, .fan.vai-fan.on .blade, .fan.pana-fan.on .blade, .fan.vies-fan.on .blade, .fan.bosch-fan.on .blade, .fan.sd-fan.on .blade, .fan.sam-fan.on .blade { fill: ${hfcVar('cool')}; opacity: .95; }
  .vai-body { fill: ${hfcVar('casing')}; stroke: color-mix(in srgb, ${hfcVar('casing')} 80%, #6b7280); stroke-width: 1.5; }
  .vai-dark, .vai-foot { fill: color-mix(in srgb, ${hfcVar('anthracite')} 60%, #000); }
  .vai-gr { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 45%, #a0a8b0); stroke-width: 2; } .vai-gr.thin { stroke-width: 1; opacity: .85; }
  .vai-seam { stroke: color-mix(in srgb, ${hfcVar('casing')} 80%, #6b7280); stroke-width: 1.2; fill: none; opacity: .8; }
  .pana-body { fill: ${hfcVar('casing')}; stroke: color-mix(in srgb, ${hfcVar('casing')} 76%, #64748b); stroke-width: 1.5; }
  .pana-foot, .pana-panel { fill: color-mix(in srgb, ${hfcVar('anthracite')} 62%, #000); }
  .pana-gr { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 52%, #94a3b8); stroke-width: 2; }
  .pana-gr.thin { stroke-width: 1; opacity: .88; }
  .pana-top, .pana-seam, .pana-vents { fill: none; stroke: color-mix(in srgb, ${hfcVar('casing')} 62%, #64748b); stroke-width: 1.25; }
  .pana-vents { stroke-width: 1.5; stroke-linecap: round; }
  .vies-body { fill: ${hfcVar('anthracite')}; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 76%, #000); stroke-width: 1.5; }
  .vies-foot, .sam-foot { fill: color-mix(in srgb, ${hfcVar('anthracite')} 55%, #000); }
  .vies-well { fill: color-mix(in srgb, ${hfcVar('anthracite')} 35%, #000); opacity: .8; }
  .vies-slat { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 62%, #000); stroke-width: 2.3; stroke-linecap: round; }
  .vies-rim { fill: none; stroke: color-mix(in srgb, var(--primary-text-color, #1f2937) 42%, transparent); stroke-width: 1.2; }
  .bosch-body, .sd-body { fill: ${hfcVar('casing')}; stroke: color-mix(in srgb, ${hfcVar('casing')} 76%, #64748b); stroke-width: 1.5; }
  .bosch-foot, .sd-foot { fill: color-mix(in srgb, ${hfcVar('anthracite')} 58%, #000); }
  .bosch-gr, .sd-gr { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 50%, #94a3b8); stroke-width: 2; }
  .bosch-gr.thin, .sd-gr.thin { stroke-width: 1; opacity: .88; }
  .bosch-top, .sd-seam, .sd-vents { fill: none; stroke: color-mix(in srgb, ${hfcVar('casing')} 62%, #64748b); stroke-width: 1.3; }
  .bosch-mark { fill: ${hfcVar('good')}; opacity: .8; }
  .sd-accent { fill: none; stroke: ${hfcVar('hot')}; stroke-width: 2.5; }
  .sd-vents { stroke-linecap: round; } .sd-badge { fill: ${hfcVar('hot')}; }
  .sam-body { fill: color-mix(in srgb, ${hfcVar('anthracite')} 88%, #111827); stroke: color-mix(in srgb, ${hfcVar('anthracite')} 62%, #000); stroke-width: 1.5; }
  .sam-grille { fill: color-mix(in srgb, ${hfcVar('anthracite')} 32%, #000); }
  .sam-slat { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 48%, #000); stroke-width: 3; stroke-linecap: round; }
  .sam-seam { fill: none; stroke: color-mix(in srgb, ${hfcVar('anthracite')} 75%, #94a3b8); stroke-width: 1.2; }
  .sam-dot { fill: color-mix(in srgb, ${hfcVar('casing')} 70%, #fff); opacity: .7; }
  /* timeline of the operating mode */
  .timeline { margin: 8px 4px 0; }
  .tl-head { display: flex; justify-content: space-between; gap: 8px; font-size: .82em; color: var(--hfc-muted); }
  .tl-detail { color: var(--primary-text-color); text-align: right; }
  .tl-bar { position: relative; height: 14px; margin-top: 4px; border-radius: 7px; overflow: hidden; background: color-mix(in srgb, var(--hfc-muted) 16%, transparent); }
  .tl-bar .seg { position: absolute; top: 0; bottom: 0; min-width: 3px; cursor: pointer; }
  .seg.k-heat, .tl-legend i.k-heat { background: ${hfcVar('heat')}; }
  .seg.k-dhw, .tl-legend i.k-dhw { background: ${hfcVar('hot')}; }
  .seg.k-defrost, .tl-legend i.k-defrost { background: ${hfcVar('cool-strong')}; }
  .seg.k-cool, .tl-legend i.k-cool { background: ${hfcVar('cool')}; }
  .seg.k-idle { background: transparent; }
  .seg.k-blocked, .tl-legend i.k-blocked { background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hfc-muted) 55%, transparent) 0 3px, transparent 3px 6px); }
  .seg.k-gap, .tl-legend i.k-gap { background: repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in srgb, var(--hfc-muted) 30%, transparent) 3px 4px); }
  .seg.sel { box-shadow: inset 0 0 0 2px var(--primary-text-color); }
  .tl-mark { position: relative; height: 7px; margin-top: 4px; border-radius: 4px; background: color-mix(in srgb, var(--hfc-muted) 10%, transparent); }
  .tl-mark .mseg { position: absolute; top: 0; bottom: 0; min-width: 3px; border-radius: 4px; cursor: pointer; background: ${hfcVar('badge')}; }
  .tl-mark .mseg::before { content: ''; position: absolute; inset: -6px 0; }
  .tl-mark .mseg.sel { box-shadow: 0 0 0 2px var(--primary-text-color); }
  .tl-legend i.k-mark { background: ${hfcVar('badge')}; }
  .tl-bar:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  .tl-axis { position: relative; height: 1.2em; font-size: .72em; color: var(--hfc-muted); }
  .tl-axis span { position: absolute; top: 2px; transform: translateX(-50%); }
  .tl-legend { display: flex; flex-wrap: wrap; gap: 2px 12px; font-size: .78em; color: var(--hfc-muted); }
  .tl-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
  /* keyboard focus */
  .focus-ring { fill: none; stroke: var(--primary-color, #03a9f4); stroke-width: 3; pointer-events: none; }
  .tap:focus, .tap:focus-visible, #svg:focus { outline: none; }
  .chip:focus-visible, .stat:focus-visible, .drow:focus-visible, .drawer-toggle:focus-visible, .ctl:focus-visible, .icon-button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  /* narrow schematic (phones, narrow columns): larger type, secondary labels hidden */
  .stage { container-type: inline-size; }
  @container (max-width: 640px) { #svg { --k: 1.2; --ku: 1.1; --kp: 1; --k2: 1; --ks: 1.2; --kt: 1.15; } }
  @container (max-width: 500px) { #svg { --k: 1.4; --ku: 1.25; --kp: 1.4; --k2: 1.3; --ks: 1.4; --kt: 1.3; } .vol-label, .tank-sub, .pre, #t-valve, #t-circ, #t-dhw-mode { display: none; } }
  /* layout: compact – tighter spacing for narrow dashboard columns */
  ha-card.layout-compact { padding: 6px 6px 4px; }
  .layout-compact .head { margin: 0 2px 2px; }
  .layout-compact .title { font-size: 1em; }
  .layout-compact .chip { font-size: .75em; padding: 2px 8px; }
  .layout-compact .stats { grid-template-columns: repeat(auto-fit, minmax(92px, 1fr)); gap: 4px; margin-top: 4px; }
  .layout-compact .stat { padding: 4px 6px; border-radius: 8px; }
  .layout-compact .sv { font-size: .95em; } .layout-compact .sl { font-size: .7em; }
  .layout-compact .controls { gap: 4px; margin: 4px 2px 0; }
  .layout-compact .ctl { font-size: .8em; padding: 3px 9px; }
  .layout-compact .drawer { margin: 4px 2px 0; }
  /* layout: wide – schematic left, controls, tiles and details right (wall tablets, wide dashboards) */
  ha-card.layout-wide, ha-card.layout-wall { display: block; container-type: inline-size; }
  @container (min-width: 760px) {
    .layout-wide .body, .layout-wall .body { display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(250px, 1fr); gap: 14px; align-items: center; }
    .layout-wide .side > :first-child, .layout-wall .side > :first-child { margin-top: 0; }
  }
  /* layout: wall – large type for wall tablets; controls and the details toggle only show after a touch */
  ha-card.layout-wall { font-size: 1.3em; padding: 16px 16px 12px; }
  @container (min-width: 760px) { .layout-wall .body { align-items: start; } }
  .layout-wall .title { font-size: 1.25em; }
  .layout-wall .chip { font-size: .9em; padding: 4px 12px; }
  .layout-wall .stats { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 10px; }
  .layout-wall .stat { padding: 10px 12px; border-radius: 14px; }
  .layout-wall .sv { font-size: 1.4em; } .layout-wall .sl { font-size: .85em; }
  .layout-wall .controls, .layout-wall .drawer-toggle { opacity: 0; pointer-events: none; transition: opacity .5s; }
  .layout-wall.awake .controls, .layout-wall.awake .drawer-toggle { opacity: 1; pointer-events: auto; }
  @keyframes hfc-dash { to { stroke-dashoffset: -40; } }
  @keyframes hfc-spin { to { transform: rotate(360deg); } }
  @keyframes hfc-pulse { 50% { opacity: .35; } }
  @keyframes hfc-rise { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: .9; } 100% { opacity: 0; transform: translateY(-10px); } }
  @keyframes hfc-vapour { 0% { opacity: 0; transform: translateY(6px) scale(.9); } 35% { opacity: .9; } 100% { opacity: 0; transform: translateY(-12px) scale(1.08); } }
  .motion-off .flow.on, .motion-off .eflow.on, .motion-off .fan.on, .motion-off .impeller.on, .motion-off .coil.on, .motion-off .snow.on, .motion-off .vapour.on .vapour-puff, .motion-off .waves.on .wave { animation: none !important; }
  .motion-off .vapour.on .vapour-puff { opacity: .65; }
  .motion-off .waves.on .wave { opacity: .7; }
  @media (prefers-reduced-motion: reduce) { .motion-auto .flow.on, .motion-auto .eflow.on, .motion-auto .fan.on, .motion-auto .impeller.on, .motion-auto .coil.on, .motion-auto .snow.on, .motion-auto .vapour.on .vapour-puff, .motion-auto .waves.on .wave { animation: none; } .motion-auto .vapour.on .vapour-puff { opacity: .65; } .motion-auto .waves.on .wave { opacity: .7; } }
`;

// Card editor: the same form as getConfigForm, but entity pickers show what the preset found,
// only the configured number of circuits is offered, and the preset field reports the detection.
class HeatpumpFlowCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._resolved = null; this._loadEnergyInfo(); this._render(); }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    this._loadEnergyInfo();
    if (first) this._render();
  }

  _loadEnergyInfo() {
    if (!this._config || this._config.power_sources === 'manual') return;
    if (this._energyReq || typeof this._hass?.callWS !== 'function') return;
    this._energyReq = true;
    HeatpumpFlowCard._energyPrefs = HeatpumpFlowCard._energyPrefs || this._hass.callWS({ type: 'energy/get_prefs' });
    HeatpumpFlowCard._energyPrefs.then((prefs) => {
      this._energyMissing = HeatpumpFlowCard._energyInfo(prefs).missing;
      this._render();
    }).catch(() => { this._energyMissing = []; });
  }

  _render() {
    try { this._renderForm(); } catch (err) { console.error('heatpump-flow-card editor:', err); }
  }

  _renderForm() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => { ev.stopPropagation(); this._changed(ev.detail.value); });
      this._warn = document.createElement('div');
      this.appendChild(this._warn);
      this.appendChild(this._form);
    }
    const r = HeatpumpFlowCard._resolve(this._config, this._hass);
    // Only entities that exist are shown as found by the preset.
    this._fromPreset = Object.fromEntries(Object.entries(r.fromPreset).filter(([, id]) => this._hass.states[id]));
    this._presetErrors = r.presetErrors || [];
    this._presetErrorOk = r.preset?.error_ok || [];
    const tiles = HeatpumpFlowCard._tileOptions(this._config, r, this._hass);
    this._tiles = tiles;
    const { schema, computeLabel, L } = HeatpumpFlowCard._formSchema(this._config, tiles);
    const own = this._config.entities || {};
    const shown = { ...this._fromPreset };
    Object.entries(own).forEach(([k, v]) => { if (v === null || v === 'none') delete shown[k]; else if (v) shown[k] = v; });
    const found = Object.keys(this._fromPreset).length;
    // Core entities the card needs; warn about what is missing (not while a preset is not detected, its field says so).
    const has = (k) => { const id = r.entities[k]; return !!(id && this._hass.states[id]); };
    const warn = [];
    if (!(r.preset && !r.ready)) {
      if (!['mode', 'compressor', 'status', 'power'].some(has)) warn.push(L.warn_running);
      if (!has('power')) warn.push(L.warn_power);
      if (!has('flow') || !has('return')) warn.push(L.warn_temps);
      if (!has('heat') && !has('volume')) warn.push(L.warn_heat);
    }
    if (this._config.power_sources !== 'manual' && this._energyMissing?.length) {
      const names = this._energyMissing.map((type) => ({ solar: L.pv, battery: L.battery, grid: L.grid }[type])).join(', ');
      warn.push(L.warn_energy_sources.replace('{sources}', names));
    }
    const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const html = warn.length ? `<ha-alert alert-type="info" title="${esc(L.warn_title)}"><ul style="margin:0;padding-left:18px">${warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></ha-alert>` : '';
    if (this._warn._html !== html) { this._warn.innerHTML = html; this._warn._html = html; this._warn.style.marginBottom = html ? '12px' : '0'; }
    this._form.hass = this._hass;
    this._form.schema = schema;
    this._form.computeLabel = computeLabel;
    this._form.computeHelper = (s) => {
      if (s.name === 'preset') {
        if (!r.preset) return '';
        const status = r.ready ? `${L.detected}${r.prefix ? ` · ${r.prefix}` : ''} · ${found} ${L.entities_found}. ${L.preset_help}` : L.not_detected;
        return r.preset.tested ? status : `${status} ${L.untested_help}`;
      }
      if (s.name === 'tiles_custom') return tiles.editable ? L.tiles_custom_help : L.tiles_yaml;
      if (s.name === 'price_entity') return L.price_help;
      if (s.name === 'errors') return L.errors_help;
      if (s.name === 'error_ok_text') return L.error_ok_help;
      if (['energy_total', 'env_energy', 'heat_total'].includes(s.name)) return L.total_cop_help;
      if (s.name === 'language') return L.language_help;
      if (own[s.name] === undefined && this._fromPreset[s.name]) return L.from_preset;
      if (Array.isArray(own[s.name])) return L.sum_help;
      if (['pv', 'battery', 'grid'].includes(s.name) && !own[s.name] && this._config.power_sources !== 'manual') return L.from_energy;
      return '';
    };
    const custom = Array.isArray(this._config.tiles);
    const controls = (this._config.controls || []).map((c) => (typeof c === 'string' ? c : c?.entity)).filter(Boolean);
    const data = { ...this._config, entities: shown, controls, timeline_marks: !!this._config.timeline_marks,
      errors: this._config.errors !== undefined ? this._config.errors : this._presetErrors,
      error_ok_text: (this._config.error_ok !== undefined ? this._config.error_ok : this._presetErrorOk).join(', '), tiles_custom: custom,
      animations: this._config.animations || 'auto', flow_speed: this._config.flow_speed ?? 1, source_spread: this._config.source_spread !== false,
      theme: this._config.theme || 'auto', fullscreen: this._config.fullscreen !== false };
    if (this._config.controls === undefined) delete data.controls;
    if (custom && tiles.editable) data.tiles = tiles.value;
    this._priceShown = custom;
    if (custom) {
      const p = this._config.price;
      data.price_fixed = typeof p === 'number' ? p : undefined;
      data.price_entity = typeof p === 'string' ? p : undefined;
    }
    this._form.data = data;
  }

  // Writes back only what differs from the preset: other entities as overrides, cleared preset entities as null.
  _changed(value) {
    const own = this._config.entities || {};
    const shownBefore = { ...this._fromPreset, ...Object.fromEntries(Object.entries(own).filter(([, v]) => v)) };
    const next = value.entities || {};
    const ents = {};
    new Set([...Object.keys(next), ...Object.keys(own), ...Object.keys(this._fromPreset)]).forEach((k) => {
      const v = next[k];
      if (v) {
        if (v !== this._fromPreset[k] || own[k] === v) ents[k] = v;
      } else if (this._fromPreset[k] || own[k] === null || own[k] === 'none') {
        // A preset entity that was shown and is now empty, or one that was already removed.
        if (shownBefore[k] || own[k] === null || own[k] === 'none') ents[k] = null;
      }
    });
    const config = { ...value };
    // Nested translations are YAML-only; ha-form does not render them and therefore may omit them from value-changed.
    if (this._config.texts && value.texts === undefined) config.texts = this._config.texts;
    // The entity picker deals in ids; keep YAML-only metadata of controls that stay selected.
    if (Array.isArray(value.controls)) {
      const old = new Map((this._config.controls || []).filter((c) => c && typeof c === 'object' && c.entity).map((c) => [c.entity, c]));
      config.controls = value.controls.map((c) => {
        const id = typeof c === 'string' ? c : c?.entity;
        return old.get(id) || id;
      }).filter(Boolean);
    }
    delete config.error_ok_text;
    // The switch only knows on and off; a YAML list of marks stays as it is while the switch stays on.
    if (!value.timeline_marks) delete config.timeline_marks;
    else if (Array.isArray(this._config.timeline_marks)) config.timeline_marks = this._config.timeline_marks;
    if (!value.animations || value.animations === 'auto') delete config.animations;
    if (!value.theme || value.theme === 'auto') delete config.theme;
    if (value.fullscreen !== false) delete config.fullscreen;
    if (value.flow_speed === undefined || value.flow_speed === null || value.flow_speed === '' || +value.flow_speed === 1) delete config.flow_speed;
    if (value.source_spread !== false) delete config.source_spread;
    const errorOk = String(value.error_ok_text || '').split(',').map((state) => state.trim()).filter(Boolean);
    if (JSON.stringify(errorOk) !== JSON.stringify(this._presetErrorOk || [])) config.error_ok = errorOk; else delete config.error_ok;
    const errors = Array.isArray(value.errors) ? value.errors.filter(Boolean) : [];
    if (JSON.stringify(errors) !== JSON.stringify(this._presetErrors || [])) config.errors = errors; else delete config.errors;
    if (Object.keys(ents).length) config.entities = ents; else delete config.entities;
    // Tiles: off = default tiles; switched on = start from the default set; tiles with own options stay as in YAML.
    delete config.tiles_custom;
    delete config.price_fixed; delete config.price_entity;
    if (this._priceShown) {
      if (value.price_entity) config.price = value.price_entity;
      else if (Number.isFinite(value.price_fixed)) config.price = value.price_fixed;
      else delete config.price;
    }
    if (!value.tiles_custom) delete config.tiles;
    else if (!Array.isArray(this._config.tiles)) config.tiles = this._tiles.defaults;
    else if (!this._tiles.editable) config.tiles = this._config.tiles;
    this._config = config;
    this._loadEnergyInfo();
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
    this._render();
  }
}
// Registration. Other cards use the same generic element names (heatpump-flow-card, heatpump-flow-card-editor) and a browser keeps only the
// first definition, so this card is always available under names of its own as well: custom:heatpump-hydraulic-card.
HeatpumpFlowCard.hfcOwner = 'sturmi77';
HeatpumpFlowCardEditor.hfcOwner = 'sturmi77';
class HeatpumpHydraulicCard extends HeatpumpFlowCard {
  static getConfigElement() { return document.createElement('heatpump-hydraulic-card-editor'); }
}
class HeatpumpHydraulicCardEditor extends HeatpumpFlowCardEditor {}
const hfcDefine = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
const hfcMine = (name) => { const c = customElements.get(name); return !c || c.hfcOwner === 'sturmi77'; };
hfcDefine('heatpump-hydraulic-card-editor', HeatpumpHydraulicCardEditor);
hfcDefine('heatpump-hydraulic-card', HeatpumpHydraulicCard);
hfcDefine('heatpump-flow-card-editor', HeatpumpFlowCardEditor);
hfcDefine('heatpump-flow-card', HeatpumpFlowCard);
// The card picker lists the card once: under the generic name when this card owns it, otherwise under the unique name.
const hfcGeneric = hfcMine('heatpump-flow-card') && hfcMine('heatpump-flow-card-editor');
if (!hfcGeneric) {
  console.warn('heatpump-flow-card: the element name "heatpump-flow-card" is already used by another card, so "type: custom:heatpump-flow-card" opens that card. '
    + 'Use "type: custom:heatpump-hydraulic-card" for this card (github.com/Sturmi77/heatpump-hydraulic-card).');
}
const hfcType = hfcGeneric ? 'heatpump-flow-card' : 'heatpump-hydraulic-card';
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === hfcType)) {
  window.customCards.push({
    type: hfcType,
    name: hfcGeneric ? 'Heatpump Flow Card' : 'Heatpump Hydraulic Card',
    description: 'Animated hydraulic schematic for heat pumps (power sources, valve, tanks, heating circuit). Presets: Lambda, Viessmann (ViCare / Open3E), Vaillant, EMS-ESP (Bosch/Buderus/Junkers/Nefit), Panasonic Aquarea (HeishaMon).',
    preview: true,
    documentationURL: 'https://github.com/Sturmi77/heatpump-hydraulic-card',
  });
}
console.info(`%c HEATPUMP-FLOW-CARD %c ${HFC_VERSION} `, 'background:#f97316;color:#fff;border-radius:3px 0 0 3px', 'background:#334155;color:#fff;border-radius:0 3px 3px 0');
