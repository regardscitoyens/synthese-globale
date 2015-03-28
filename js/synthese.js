/* TODO:
- autocomplete search
- select indicateur:
 + min/max/mean/median + /time (week or month or year?)
 + histogram through time for mp
 + histogram deciles by time of all mps with bin highlighted
- handle current mps only?
- by group?
*/


var deputes = {},
  indicateurs = [
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
  ],
  start = [6, 12],
  end = [(new Date()).getMonth() + 1, (new Date()).getFullYear() - 2000];
  month = function(){
    return "20" + start[1] + (String(start[0]).length < 2 ? "0" : "") + start[0];
  },
  timeout = 0,
  download = function(m, last){
    setTimeout(function(){
      d3.json("http://www.nosdeputes.fr/synthese/" + m + "/json", function(error, data){
        data.deputes.forEach(function(d){
          if (deputes[d.depute.id] == undefined) deputes[d.depute.id] = {};
          Object.keys(d.depute).forEach(function(k){
            var i = parseInt(d.depute[k]);
            if (k != "id" && k != "nom" && k != "groupe") {
              if (deputes[d.depute.id][k] == undefined) deputes[d.depute.id][k] = 0;
              deputes[d.depute.id][k] += i; 
            }
          });
        });
        if (last) {
          document.getElementById("loader").style.display = "none";
          document.getElementById("menu").style.display = "";
        }
      });
    }, timeout);
    timeout += 110;
  },
  displayTop = function(){
    var selec = document.getElementById("deputes"),
      sel = selec.options[selec.selectedIndex].value;
    d3.select("#data").html("").append("ul")
      .selectAll("li")
      .data(indicateurs)
      .enter().append("li")
      .html(function(d) {
        return d[1] + " : <span>" + deputes[sel][d[0]] + "</span>";
      });
    d3.select("#photo").html('<img src="' + deputes[sel].photo + '" alt="' + deputes[sel].nom + '" title="' + deputes[sel].nom + '"/>');
  };

while (start[0] != end[0] || start[1] != end[1]) {
  download(month());
  if (start[0] == 12) {
    start = [1, start[1]+1];
  } else start[0]++;
}
download(month(), true);

d3.json("http://www.nosdeputes.fr/deputes/json", function(error, data){
  var select = d3.select("#menu").append("select")
    .attr("id", "deputes")
    .on("change", displayTop)
    .selectAll('option')
    .data(data.deputes.sort(function(a,b){
      return d3.ascending(a.depute.nom_de_famille, b.depute.nom_de_famille);
    }))
    .enter().append("option")
    .attr("value", function(d) {
      return d.depute.id;
    })
    .text(function(d) {
      return d.depute.nom_de_famille + ' ' + d.depute.prenom + ' (' + d.depute.groupe_sigle + ')';
    });
  data.deputes.forEach(function(d){
    if (deputes[d.depute.id] == undefined) deputes[d.depute.id] = d.depute;
    else for (var key in d.depute)
      deputes[d.depute.id][key] = d.depute[attrname];
    deputes[d.depute.id].photo = d.depute.url_nosdeputes.replace('.fr/', '.fr/depute/photo/') + '/110';
  });
});

