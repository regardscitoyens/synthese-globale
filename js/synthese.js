/* TODO:
- autocomplete search
- select indicateur:
 + min/max/mean/median + /time (week or month or year?)
 + histogram through time for mp
 + histogram deciles by time of all mps with bin highlighted
- handle current mps only?
- by group?
*/
(function (ns) {

  ns.indicateurs = [
    ["semaines_presence", "Semaines d'activité"],
    ["commission_presences", "Commissions &mdash; réunions"],
    ["commission_interventions", "Commissions &mdash; interventions"],
    ["hemicycle_interventions", "Hémicycle &mdash; interventions longues"],
    ["hemicycle_interventions_courtes", "Hémicycle &mdash; interventions longues"],
    ["amendements_signes", "Amendements signés"],
    ["amendements_adoptes", "Amendements adoptés"],
    ["rapports", "Rapports"],
    ["propositions_ecrites", "Propositions de loi écrites"],
    ["propositions_signees", "Propositions de loi signées"],
    ["questions_orales", "Questions orales"],
    ["questions_ecrites", "Questions écrites"]
  ];

  ns.deputes = {};
  ns.downloadDeputes = function() {
    d3.json("http://www.nosdeputes.fr/deputes/json", function(error, data){
      data.deputes.forEach(function(d){
        if (ns.deputes[d.depute.id] == undefined)
          ns.deputes[d.depute.id] = d.depute;
        else for (var key in d.depute)
          ns.deputes[d.depute.id][key] = d.depute[key];
        ns.deputes[d.depute.id].photo = (d.depute.url_nosdeputes + '/110')
          .replace('.fr/', '.fr/depute/photo/');
      });
    });
  };

  ns.downloadMonthApi = function(start, timeout, last) {
    var m = "20" + start[1] +
            (String(start[0]).length < 2 ? "0" : "") + start[0];
    setTimeout(function(){
      d3.json("http://www.nosdeputes.fr/synthese/"+m+"/json", function(e, data){
        data.deputes.forEach(function(d){
          if (ns.deputes[d.depute.id] == undefined)
            ns.deputes[d.depute.id] = {};
          Object.keys(d.depute).forEach(function(k){
            if (k != "id" && k != "nom" && k != "groupe") {
              if (ns.deputes[d.depute.id][k] == undefined)
                ns.deputes[d.depute.id][k] = 0;
              ns.deputes[d.depute.id][k] += parseInt(d.depute[k]); 
            }
          });
        });
        // Save data in local storage & enable interface after last load
        if (last) {
          localStorage.setItem('dataUpdate', new Date().getTime());
          localStorage.setItem('deputes', JSON.stringify(ns.deputes));
          ns.buildSelectMenu();
        }
      });
    }, timeout);
  };

  ns.downloadSynthese = function() {
    var timeout = 0,
        start = [6, 12],
        end = [(new Date()).getMonth() + 1, (new Date()).getFullYear() - 2000];
    while (start[0] != end[0] || start[1] != end[1]) {
      ns.downloadMonthApi(start, timeout);
      if (start[0] == 12)
        start = [1, start[1]+1];
      else start[0]++;
      timeout += 110;
    }
    ns.downloadMonthApi(start, timeout, true);
  };
 
  ns.buildSelectMenu = function() {
    d3.select("#menu").append("select")
      .attr("id", "deputes")
      .on("change", ns.displayMP)
      .selectAll('option')
      .data(Object.keys(ns.deputes).sort(function(a, b){
        return d3.ascending(ns.deputes[a].nom_de_famille, ns.deputes[b].nom_de_famille);
      }))
      .enter().append("option")
      .attr("value", function(d) {
        return d;
      })
      .text(function(d) {
        return ns.deputes[d].nom_de_famille + ' ' + ns.deputes[d].prenom +
               ' (' + ns.deputes[d].groupe_sigle + ')';
      });
      document.getElementById("loader").style.display = "none";
      document.getElementById("menu").style.display = "";
  };

  ns.displayMP = function() {
    var selec = document.getElementById("deputes"),
      sel = selec.options[selec.selectedIndex].value;
    d3.select("#data").html("").append("ul")
      .selectAll("li")
      .data(ns.indicateurs)
      .enter().append("li")
      .html(function(d) {
        return d[1] + " : <span>" + ns.deputes[sel][d[0]] + "</span>";
      });
    d3.select("#photo").html(
      '<img src="' + ns.deputes[sel].photo + '"' +
          ' alt="' + deputes[sel].nom + '" title="' + deputes[sel].nom + '"/>'
    );
  };

  ns.init = function() {
    var update = parseInt(localStorage.getItem('dataUpdate')) + 86400000;
    if ((new Date()).getTime() < update) {
      ns.deputes = JSON.parse(localStorage.getItem('deputes'));
      ns.buildSelectMenu();
    } else {
      ns.downloadDeputes();
      ns.downloadSynthese();
    }
  }();
  
})(window.synthese = window.synthese || {});
