/* TODO:
- fix mandats repris
- filter time (from bottom histo?)
- handle current mps only?
- by group?
*/
(function (ns){

  ns.ind = "semaines_presence";
  ns.indicateurs = [,
    ["semaines_presence", "Semaines d'activité"],
    ["commission_presences", "Commissions &mdash; réunions"],
    ["commission_interventions", "Commissions &mdash; interventions"],
    ["hemicycle_interventions", "Hémicycle &mdash; interventions longues"],
    ["hemicycle_interventions_courtes", "Hémicycle &mdash; interventions courtes"],
    ["amendements_signes", "Amendements signés"],
    ["amendements_adoptes", "Amendements adoptés"],
    ["rapports", "Rapports"],
    ["propositions_ecrites", "Propositions de loi écrites"],
    ["propositions_signees", "Propositions de loi signées"],
    ["questions_orales", "Questions orales"],
    ["questions_ecrites", "Questions écrites"]
  ];

  ns.accentMap = {
    "á": "a", "à": "a", "â": "a",
    "é": "e", "è": "e", "ê": "e", "ë": "e",
    "ç": "c",
    "î": "i", "ï": "i",
    "ô": "o", "ö": "o",
    "ù": "u", "û": "u", "ü": "u"
  };
  ns.clean_accents = function(term){
    var ret = "";
    for (var i = 0; i < term.length; i++)
      ret += ns.accentMap[term.charAt(i)] || term.charAt(i);
    return ret;
  };

  ns.readdate = function(d){
    return d ? d3.time.format("%Y-%m-%d").parse(d) : new Date();
  };
  ns.fmtfloat = function(f){
    return d3.format(".1f")(f).replace('.', ',');
  };

  ns.deputes = {};
  ns.downloadDeputes = function(){
    d3.json("http://www.nosdeputes.fr/deputes/json", function(error, data){
      data.deputes.forEach(function(d){
        d.depute.months = (ns.readdate(d.depute.mandat_fin) - ns.readdate(d.depute.mandat_debut)) / 2628000000;
        if (ns.deputes[d.depute.id] == undefined)
          ns.deputes[d.depute.id] = d.depute;
        else for (var key in d.depute)
          ns.deputes[d.depute.id][key] = d.depute[key];
        ns.deputes[d.depute.id].photo = (d.depute.url_nosdeputes + '/100')
          .replace('.fr/', '.fr/depute/photo/');
      });
    });
  };

  ns.allmonths = [];
  ns.downloadMonthApi = function(start, timeout, last){
    var m = "20" + start[1] +
            (String(start[0]).length < 2 ? "0" : "") + start[0];
    ns.allmonths.push(m);
    setTimeout(function(){
      d3.json("http://www.nosdeputes.fr/synthese/"+m+"/json", function(e, data){
        data.deputes.forEach(function(d){
          if (ns.deputes[d.depute.id] == undefined)
            ns.deputes[d.depute.id] = {};
          Object.keys(d.depute).forEach(function(k){
            if (k != "id" && k != "nom" && k != "groupe") {
              if (ns.deputes[d.depute.id][k] == undefined)
                ns.deputes[d.depute.id][k] = {
                  total: 0,
                  months: {}
                };
              var v = parseInt(d.depute[k]);
              ns.deputes[d.depute.id][k].total += v;
              ns.deputes[d.depute.id][k].months[m] = v;
            }
          });
        });
        // Enable interface after last load
        if (last) {
          ns.deputesAr = Object.keys(ns.deputes).map(function(d){
            return ns.deputes[d];
          });
          ns.dep = ns.deputesAr[parseInt(Math.random() * ns.deputesAr.length)];
          ns.buildSelectMenu();
        }
      });
    }, timeout);
  };

  ns.downloadSynthese = function(){
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

  ns.buildSelectMenu = function(){
    $("#deputes").autocomplete({
      source: function(request, response){
        var matcher = new RegExp($.ui.autocomplete.escapeRegex(ns.clean_accents(request.term)), "i");
        response($.grep(
          ns.deputesAr.sort(function(a, b){
            return d3.ascending(a.nom_de_famille, b.nom_de_famille);
          }).map(function(d){
            var name = d.nom_de_famille + ' ' + d.prenom +
                     ' (' + d.groupe_sigle + ')';
            return {
              label: name,
              value: name,
              dep: d
            };
          }),
          function(d){
            return matcher.test(ns.clean_accents(d.label));
          }
        ));
      },
      select: function(event, ui){
        event.preventDefault();
        ns.dep = ui.item.dep;
        ns.displayMP();
      }
    });

    $("#loader").hide();
    $("#content").show();
    ns.displayMP();
  };

  ns.displayMP = function(){
    $("#name").text(ns.dep.prenom + ' ' + ns.dep.nom_de_famille +
      ' (' + ns.dep.groupe_sigle + ')');
    d3.select("#data").html("")
      .append("table")
      .append("tbody")
      .html("<tr><th></th><td>total</td><td>moyenne<br/>mensuelle</td></tr>")
      .selectAll("tr")
      .data(ns.indicateurs)
      .enter().append('tr')
      .attr('class', 'ind')
      .html(function(d) {
        return '<th>' + d[1] + "</th>" +
               '<td>' + (ns.dep[d[0]] ? ns.dep[d[0]].total : 0) + "</td>" +
               '<td>' + (ns.dep[d[0]] ? ns.fmtfloat(ns.dep[d[0]].total / ns.dep.months) : 0) + "</td>";
      })
      .on("click", function(d){
        ns.ind = d[0];
        $('#data table tr.ind').css("background-color", "white");
        $(this).css("background-color", "yellow");
        ns.drawComparison();
        ns.drawTimeline();
      });
    $("#photo").html(
      '<a href="' + ns.dep.url_nosdeputes + '">' +
      '<img src="' + ns.dep.photo + '" alt="' + ns.dep.nom + '"' +
          ' title="' + ns.dep.nom + '"/>' +
      '<br/><small>NosDéputés.fr</small></a>' +
      '<br/><span>' + ns.fmtfloat(ns.dep.months) + ' mois de mandat'
    );
    $("#data table tr")[1].click();
  };

  ns.drawComparison = function(){
    var monthly = $("input[name=stats]:checked").val() === "month",
      accessindic = function(d){
        return d[ns.ind] ? d[ns.ind].total / (monthly ? d.months : 1) : 0;
      },
      min = d3.min(ns.deputesAr, accessindic),
      max = d3.max(ns.deputesAr, accessindic),
      data = d3.layout.histogram()
        .bins(
          d3.scale.linear()
          .domain([min, max])
          .range([0, 280])
          .ticks(Math.min(Math.round(max - min), 10))
        )(ns.deputesAr.map(accessindic))
        .reverse();

    nv.addGraph(function(){
      var chart = nv.models.multiBarHorizontalChart()
        .x(function(d) { return d.x + " -> " + (d.x + d.dx) })
        .y(function(d) { return Math.sqrt(d.y) })
        .barColor(function(d){
          var depval = accessindic(ns.dep);
          return (depval >= d.x && depval < d.x + d.dx) ? "#00FF00" : "#4444FF";
        })
        .margin({top: 10, right: 20, bottom: 5, left: 110})
        .showYAxis(false)
        .showLegend(false)
        .showControls(false)
        .showValues(true)
        .valueFormat(function(d){
          var real = parseInt(d * d);
          return real + " député" + (real > 1 ? "s" : "");
        });

      d3.select('#comparison svg').html('')
        .datum([
          {key: ' ', values: data}
        ])
        .transition().duration(350)
        .call(chart);

      nv.utils.windowResize(chart.update);
    });
  };

  ns.drawTimeline = function(){
    var data = [], start = false;
    ns.allmonths.forEach(function(d){
      if (ns.dep[ns.ind] != undefined) {
        if (!start && d > ns.dep.mandat_debut.replace(/-/g, '')) start = true;
        if (start)
          data.push({ label: d, value: ns.dep[ns.ind] ? ns.dep[ns.ind].months[d] : 0 });
      } else if (start && (!ns.dep.mandat_fin || d < ns.dep.mandat_fin.replace(/-/g, '')))
        data.push({ label: d, value: 0 });
    });

    $('#timeline svg').empty();
    nv.addGraph(function(){
      var chart = nv.models.discreteBarChart()
        .x(function(d){ return d.label })
        .y(function(d){ return d.value })
        .staggerLabels(true)
        .tooltips(false)
        .showValues(true)
        .valueFormat(function(d){ return parseInt(d) });
      chart.xAxis.tickFormat(function(d){ return d.replace(/^20(..)/, "$1/") });

      d3.select('#timeline svg')
        .datum([
          {key: ' ', values: data}
        ])
        .transition().duration(350)
        .call(chart);
      $("g text:contains(NaN)").remove();
      nv.utils.windowResize(chart.update);
    });
  };

  ns.init = function(){
    ns.downloadDeputes();
    ns.downloadSynthese();
    $("input[name=stats]").change(function(d){
      console.log(d, this);
      ns.drawComparison();
    });
  };

  $(document).ready(ns.init);

})(window.synthese = window.synthese || {});
