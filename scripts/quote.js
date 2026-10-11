/* Pure quote rules. Prices are supplied by the page, including admin refreshes. */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VitalcarQuote = factory();
})(typeof window !== 'undefined' ? window : globalThis, function(){
  'use strict';
  var rules = {
    'lav-1': { group: 'wash' },
    'lav-2': { group: 'wash' },
    'lav-3': { group: 'wash' },
    'pol-1': { group: 'polish', includes: ['lav-2'] },
    'pol-2': { group: 'polish', includes: ['lav-3'] },
    'pol-3': {},
    'pol-4': {},
    'vit-1': { group: 'coating', includes: ['lav-2', 'pol-1'] },
    // No published inclusions for the 3-year coating: never infer any.
    'vit-3': { group: 'coating' },
    'vit-5': { group: 'coating', includes: ['lav-3', 'pol-2'] },
    'hig-1': { group: 'interior' },
    'hig-2': { group: 'interior' },
    'mot-1': { group: 'moto' },
    'mot-2': { group: 'moto' },
    'mot-3': { group: 'moto' },
    'mot-4': { group: 'moto' }
  };

  function inclusions(id){
    var result = [];
    function visit(key){
      ((rules[key] || {}).includes || []).forEach(function(child){
        if (result.indexOf(child) !== -1) return;
        result.push(child);
        visit(child);
      });
    }
    visit(id);
    return result;
  }

  function calculate(options){
    options = options || {};
    var type = options.type || 'hatch';
    var catalog = {};
    (options.services || []).forEach(function(service){ catalog[service.id] = service; });
    var selected = (options.selected || []).filter(function(id, index, all){
      return rules[id] && catalog[id] && all.indexOf(id) === index &&
        (rules[id].group === 'moto') === (type === 'moto');
    });
    // An explicitly selected item that is already bundled is not billed again.
    selected = selected.filter(function(id){
      return !selected.some(function(other){ return other !== id && inclusions(other).indexOf(id) !== -1; });
    });
    var included = [];
    var expanded = selected.slice();
    selected.forEach(function(id){
      inclusions(id).forEach(function(child){
        if (expanded.indexOf(child) !== -1) return;
        expanded.push(child);
        included.push({ id: child, includedBy: id });
      });
    });
    var groups = {}, conflicts = [];
    expanded.forEach(function(id){
      var group = rules[id].group;
      if (!group) return;
      if (groups[group] && groups[group] !== id) conflicts.push({ ids: [groups[group], id], group: group });
      else groups[group] = id;
    });
    var unpriced = [];
    var items = selected.map(function(id){
      var raw = catalog[id].prices && catalog[id].prices[type];
      var price = Number(raw);
      if (raw === '' || raw == null || !isFinite(price) || price <= 0) {
        unpriced.push(id);
        price = 0;
      }
      return { id: id, base: price };
    });
    var gross = items.reduce(function(sum, item){ return sum + item.base; }, 0);
    var promo = options.promo || {};
    var rate = promo.ativo ? Number(promo.desconto) : 0;
    rate = isFinite(rate) ? Math.max(0, Math.min(1, rate)) : 0;
    // Keep the site's existing whole-real promotion rounding.
    var total = rate > 0 ? Math.round(gross * (1 - rate)) : gross;
    return {
      selected: selected, items: items, included: included, conflicts: conflicts, unpriced: unpriced,
      gross: gross, total: total, discount: gross - total, discountPct: Math.round(rate * 10000) / 100,
      valid: items.length > 0 && conflicts.length === 0 && unpriced.length === 0
    };
  }

  function select(options, id, checked){
    var current = calculate(options).selected;
    var group = (rules[id] || {}).group;
    var replaced = [];
    var candidate = current.filter(function(other){
      if (other === id) return false;
      if (checked && group && rules[other].group === group) { replaced.push(other); return false; }
      return true;
    });
    if (checked && rules[id]) candidate.push(id);
    var result = calculate({ services: options.services, type: options.type, promo: options.promo, selected: candidate });
    if (result.conflicts.length) return { selected: current, replaced: [], conflict: result.conflicts[0] };
    return { selected: result.selected, replaced: replaced, conflict: null };
  }

  return { calculate: calculate, select: select };
});
