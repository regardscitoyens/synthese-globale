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

  ns.deputes = {};
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

  ns.start = [6, 12];
  ns.end = [(new Date()).getMonth() + 1, (new Date()).getFullYear() - 2000];
  ns.downloadMonthApi = function(timeout, last) {
    var m = "20" + ns.start[1] +
            (String(ns.start[0]).length < 2 ? "0" : "") + ns.start[0];
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
        // Enable interface after last load
        if (last) {
          document.getElementById("loader").style.display = "none";
          document.getElementById("menu").style.display = "";
        }
      });
    }, timeout);
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
  
    // Start downloading synthese per month every 110ms
    var timeout = 0;
    while (ns.start[0] != ns.end[0] || ns.start[1] != ns.end[1]) {
      ns.downloadMonthApi(timeout);
      if (ns.start[0] == 12) {
        ns.start = [1, ns.start[1]+1];
      } else ns.start[0]++;
      timeout += 110;
    }
    ns.downloadMonthApi(timeout, true);

    // Download députés data simultaneously
    d3.json("http://www.nosdeputes.fr/deputes/json", function(error, data){

      // Build select menu from list députés
      d3.select("#menu").append("select")
        .attr("id", "deputes")
        .on("change", ns.displayMP)
        .selectAll('option')
        .data(data.deputes.sort(function(a, b){
          return d3.ascending(a.depute.nom_de_famille, b.depute.nom_de_famille);
        }))
        .enter().append("option")
        .attr("value", function(d) {
          return d.depute.id;
        })
        .text(function(d) {
          return d.depute.nom_de_famille + ' ' + d.depute.prenom +
                 ' (' + d.depute.groupe_sigle + ')';
        });

      // Populate data with députés meta
      data.deputes.forEach(function(d){
        if (ns.deputes[d.depute.id] == undefined)
          ns.deputes[d.depute.id] = d.depute;
        else for (var key in d.depute)
          ns.deputes[d.depute.id][key] = d.depute[key];
        ns.deputes[d.depute.id].photo = (d.depute.url_nosdeputes + '/110')
          .replace('.fr/', '.fr/depute/photo/');
      });

    });

  }();
  
})(window.synthese = window.synthese || {});
