var width = $("#svg-id").innerWidth(),
    height = $("#svg-id").innerHeight(),
    id_count = 1,
    tf_barrier = 100,
    aua_barrier = 365,
    mf_barrier = 20,
    fd_barrier = 12,
    msp = 0.5,
    r = 5,
    nodes = [{ "id": 0, "name": "Ego Node", "TF": "", "AUA": "", "CF": [], "MF": [], "FD": [], "Weight": -1, "TSP": -1, "level": 0 }
    //{ "id": 1000, "name": "a", "TF": 100, "AUA": 365, "CF": [0], "MF": [35], "FD": [16], "Weight": 1, "TSP": -1, "level": 1 },
    //{ "id": 1001, "name": "b", "TF": 100, "AUA": 365, "CF": [1], "MF": [35], "FD": [16], "Weight": 1, "TSP": 1, "level": 2 },
    //{ "id": 1002, "name": "c", "TF": 1, "AUA": 1, "CF": [1], "MF": [0], "FD": [0], "Weight": 1, "TSP": 0.001, "level": 2 }
    ],
    bad_nodes = new Set([]),
    links = [
        //{ "source": 0, "target": 1000 }, { "source": 1000, "target": 1001 }, { "source": 1000, "target": 1002 }
    ],
    bad_links = new Set([]),
    getXloc = d3.scalePoint().domain([0, 1, 2]).range([100, width - 100]),
    there_are_bad_connections = false,
    show_bad_connections = false;

var simulation = d3.forceSimulation(nodes)
    .force('x', d3.forceX((d) => getXloc(d.level)).strength(4))
    .force('collide', d3.forceCollide(r*4))
    .force('charge', d3.forceManyBody().strength(0))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('link', d3.forceLink().links(links).id(function (d) { return d.id }))
    .on('tick', ticked);

//drag handler
//d is the node
function drag_start(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function drag_drag(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function drag_end(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

var drag_handler = d3.drag()
    .on("start", drag_start)
    .on("drag", drag_drag)
    .on("end", drag_end);

// add 1 to id_count
function increase_id_count(){
    id_count++;
}
// node and link weight calculator
var calc_node_weight = function (TF, AUA) {
    var c_TF, c_AUA;
    if (TF > tf_barrier) { c_TF = 1; }
    else { c_TF = TF / tf_barrier; }
    if (AUA > aua_barrier) { c_AUA = 1; }
    else { c_AUA = AUA / aua_barrier; }
    return (c_TF + c_AUA) / 2;
}
var calc_link_weight = function (MF, FD) {
    var c_MF, c_FD;
    if (MF > mf_barrier) { c_MF = 1; }
    else {c_MF = MF / mf_barrier;}
    if (FD > fd_barrier) { c_FD = 1; }
    else {c_FD = FD / fd_barrier; }
    return (c_MF + c_FD) / 2;
}

// add find remove of nodes and links in DS
function removeNode(name) {
    nodes = _.filter(nodes, function (node) { return (node["name"] != name) });
    links = _.filter(links, function (link) { return ((link["source"]["name"] != name) && (link["target"]["name"] != name)) });
    update();
}

function findNode(Id) {
    for (var i in nodes) if (nodes[i]["id"] === Id) return nodes[i];
}

function get_all_low_tsp_second_level_nodes() {
    var nodes_to_return = [];
    for (var i in nodes) {
        if (nodes[i]["level"] === 2 && nodes[i]["TSP"] < msp) {
            var node_to_add = {
                "id": nodes[i]["id"],
                "name": nodes[i]["name"],
                "TF": nodes[i]["TF"],
                "AUA": nodes[i]["AUA"],
                "CF": nodes[i]["CF"],
                "MF": nodes[i]["MF"],
                "FD": nodes[i]["FD"],
                "Weight": nodes[i]["Weight"],
                "TSP": nodes[i]["TSP"],
                "level": nodes[i]["level"]
            }
            nodes_to_return.push(node_to_add);
            console.log(node_to_add);
        }
    }
    return nodes_to_return;
}

function get_first_circle_nodes_and_links_of_second(id_of_second) {
    var nodes_to_return = [];
    var links_to_return = [];
    for (var i in links) {
        if (links[i]["target"]["id"] === id_of_second) {
            var node_to_add = {
                "id": links[i]["source"]["id"],
                "name": links[i]["source"]["name"],
                "TF": links[i]["source"]["TF"],
                "AUA": links[i]["source"]["AUA"],
                "CF": links[i]["source"]["CF"],
                "MF": links[i]["source"]["MF"],
                "FD": links[i]["source"]["FD"],
                "Weight": links[i]["source"]["Weight"],
                "TSP": links[i]["source"]["TSP"],
                "level": links[i]["source"]["level"]
            }
            nodes_to_return.push(node_to_add);
            var link_to_add = {
                "FD": links[i]["FD"],
                "MF": links[i]["MF"],
                "Weight": links[i]["Weight"],
                "source": links[i]["source"]["id"],
                "target": links[i]["target"]["id"],
            }
            links_to_return.push(link_to_add);
        }
    }
    return [nodes_to_return, links_to_return]
}


function findLink(source, target) {
    for (var i in links) {
        if (links[i]["source"]["id"] === source && links[i]["target"]["id"] === target)
            return links[i];
    }
}

function calculateLevel(CF) {
    if (CF.includes(0)) { return 1; }
    else { return 2; }
}

function getLevelPerId(id) {
    for (var i in nodes) if (nodes[i]["id"] === id) return nodes[i]["level"];
}

function validateAddNodeLevels(lvl, CF) {
    if (lvl === 2) {
        for (i = 0; i < CF.length; i++) {
            if (getLevelPerId(CF[i]) === 2) {
                window.alert("Adding 2nd circle node can be linked only to 1st circle nodes");
                return false;
            }
        }
    }
    return true;
}

function addNode(Name, TF, AUA, CF, MF, FD) {
    var node_weight = calc_node_weight(TF, AUA),
        lvl = calculateLevel(CF);
    if (validateAddNodeLevels(lvl, CF)) {
        nodes.push({
            "id": id_count, "name": Name, "TF": TF, "AUA": AUA, "CF": CF, "MF": MF, "FD": FD,
            "Weight": node_weight, "TSP": -1, 'level': lvl
        });
        return true;
    }
    return false;
}

var get_first_circle_link_weight = function (source_as_target) {
    return findLink(0, source_as_target)['Weight'];
}

function addLink(source, i) {
    var target_node = findNode(id_count);
    var link_weight = calc_link_weight(target_node['MF'][i], target_node['FD'][i]);
    var source_node = findNode(source);

    links.push({
        "source": source_node.id, "target": target_node.id,
        "MF": target_node['MF'][i], "FD": target_node['FD'][i], "Weight": link_weight
    });


    if (source > 0) {
        first_circle_link_weight = get_first_circle_link_weight(source);
        tsp_to_add = target_node['Weight'] * link_weight * source_node['Weight'] * first_circle_link_weight;
        if (tsp_to_add > target_node['TSP']) {
            target_node['TSP'] = tsp_to_add;
            if (tsp_to_add < msp)
                there_are_bad_connections = true;
            
        }
    }
}

function update() {

    var link = d3.select('.links').selectAll('line.link');

    link = link.data(show_bad_connections ? bad_links : links);
    link.exit().remove();

    link.enter().insert("line")
        .attr("class", "link")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

    

    var node = d3.select('.nodes')
        .selectAll('g.node');

    node = node.data(show_bad_connections ? bad_nodes : nodes)

    

    node_enter = node.enter().append("g")
        .attr("class", "node").merge(node);
    

    node_enter.append("text")
        .attr("class", "nodetext")
        .attr("x", "0em")
        .attr("y", 15)
        .text(function (d) { return d.name });

    node_enter.append("circle")
        .style("fill", function (d) {
            if (d.id == 0) { return "#0099ff" }
            if (d.CF.includes(0)) { return "#00cc00" }
            if (d.TSP > 0.5) { return "#ff9900" } else { return "#ff0000" }
        })
        .attr("r", r);
    node_enter.exit().remove();

    

    node_enter.on("mouseover", function (d) {
        var g = d3.select(this); // The node
        // The class is used to remove the additional text later
        var info = g.append('text')
            .classed('info', true)
            .attr('dx', "0em")
            .attr('dy', -10)
            .text(function (d) {
                if (d.id == 0) { return "id=0" }
                else if (d.level == 1) { return "id=" + d.id.toString() + ",TF=" + d.TF.toString() + ",AUA=" + d.AUA.toString() }
                else { return "id=" + d.id.toString() + ",TF=" + d.TF.toString() + ",AUA=" + d.AUA.toString() + ",TSP=" + d.TSP.toString().substring(0, 6); }
            })
            .style("font-size", "12px");

        d3.selectAll('line.link')
            .filter(function (l) {
                return (d.id != 0 && (d.id == l.source.id || d.id == l.target.id));
            })
            .style("opacity", 1)

    }).on("mouseout", function () {
        d3.selectAll('line.link').style("opacity", 0.1)
        // Remove the info text on mouse out.
        d3.select(this).select('text.info').remove();

    });

    drag_handler(node_enter);
    simulation.nodes(show_bad_connections ? bad_nodes : nodes);
    simulation.force("link").links(show_bad_connections ? bad_links : links).id(function (d) { return d.id });
    simulation.on('tick', ticked)
    simulation.alpha(1).restart();
}


function ticked() {
    var link = d3.select('.links').selectAll('line.link');
    link = link.data(show_bad_connections ? bad_links : links);
    link.exit().remove();

    link.attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });


    var node = d3.select('.nodes').selectAll('g.node');
    node = node.data(show_bad_connections ? bad_nodes : nodes);
    node.exit().remove();
    node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

}

update();

function cfIdIsLargerThenNodesLen(cf) {
    var i;
    for (i = 0; i < cf.length; i++) {
        if (cf[i] >= nodes.length) {
            window.alert("No such node: " + cf[i].toString());
            return true;
        }
    }
    return false;
}

function checkIfCfCorrect(cf) {
    if (cf.includes(0) && cf.length > 1) {
        window.alert("Adding link to Ego node, cannot add to more nodes");
        return false;
    } else if (cfIdIsLargerThenNodesLen(cf)){
        return false;
    }
    return true;
}

function addNodeToGraph() {
    var name = document.getElementById("NodeName").value,
        tf = parseInt(document.getElementById("TF").value),
        aua = parseInt(document.getElementById("AUA").value),
        cf = document.getElementById("CF").value.split(",").map(function (num) { return parseInt(num, 10); }),
        mf = document.getElementById("MF").value.split(",").map(function (num) { return parseInt(num, 10); }),
        fd = document.getElementById("FD").value.split(",").map(function (num) { return parseInt(num, 10); });
    if (checkIfCfCorrect(cf)) {
        if (addNode(name, tf, aua, cf, mf, fd)) {
            var i;
            for (i = 0; i < cf.length; i++) {
                addLink(cf[i], i);
            }
            increase_id_count();
            update();
        }
    }
}

function showAllConnections() {

    show_bad_connections = false;

    d3.select('.links').selectAll('line.link').remove();
    d3.select('.nodes').selectAll('g.node').remove();

    update();
}


function show_only_bad_connections() {
    if (!there_are_bad_connections)
        window.alert("All connections are GOOD connections!")
    else if (show_bad_connections)
        window.alert("Already show bad connections..")
    else {
        show_bad_connections = true;
        bad_links = new Set([]);
        second_level_nodes_with_low_tsp = new Set(get_all_low_tsp_second_level_nodes());
        bad_nodes = new Set([]);
        bad_nodes = new Set([...bad_nodes, ...second_level_nodes_with_low_tsp]);
        for (let item of second_level_nodes_with_low_tsp) {
            first_circle_nodes_and_links_of_bad_node = get_first_circle_nodes_and_links_of_second(item['id']);
            first_circle_nodes = new Set(first_circle_nodes_and_links_of_bad_node[0]);
            second_circle_links = new Set(first_circle_nodes_and_links_of_bad_node[1]);
            bad_nodes = new Set([...bad_nodes, ...first_circle_nodes]);
            bad_links = new Set([...bad_links, ...second_circle_links]);
            for (let node of first_circle_nodes) {
                var first_circle_link = findLink(0, node['id']);
                var first_circle_link_to_add = {
                    "FD": first_circle_link["FD"],
                    "MF": first_circle_link["MF"],
                    "Weight": first_circle_link["Weight"],
                    "source": first_circle_link["source"]["id"],
                    "target": first_circle_link["target"]["id"],
                }
                bad_links.add(first_circle_link_to_add);
            }
        }
        var ego_node = findNode(0);
        var ego_node_to_add = {
            "id": ego_node["id"],
            "name": ego_node["name"],
            "TF": ego_node["TF"],
            "AUA": ego_node["AUA"],
            "CF": ego_node["CF"],
            "MF": ego_node["MF"],
            "FD": ego_node["FD"],
            "Weight": ego_node["Weight"],
            "TSP": ego_node["TSP"],
            "level": ego_node["level"]
        }
        bad_nodes.add(ego_node_to_add);

        bad_nodes = Array.from(bad_nodes);
        bad_links = Array.from(bad_links);

        d3.select('.links').selectAll('line.link').remove();
        d3.select('.nodes').selectAll('g.node').remove();

        update();
    }
}


function downloadDataAsCSV() {
    var result, columnDelimiter, lineDelimiter, filename, link;

    columnDelimiter = ',';
    lineDelimiter = '\n';
    result = '';
    result += 'id,name,TF,AUA,CF,MF,FD,TSP\n';

    nodes.forEach(function (node) {
        result += node['id'] + columnDelimiter;
        result += node['name'] + columnDelimiter;
        result += node['TF'] + columnDelimiter;
        result += node['AUA'] + columnDelimiter;
        result += JSON.stringify(node['CF']) + columnDelimiter;
        result += JSON.stringify(node['MF']) + columnDelimiter;
        result += JSON.stringify(node['FD']) + columnDelimiter;
        result += node['TSP'] + lineDelimiter;
    });

    result = 'data:text/csv;charset=utf-8,' + result;

    filename = 'export.csv';

    data = encodeURI(result);

    link = document.createElement('a');
    link.setAttribute('href', data);
    link.setAttribute('download', filename);
    link.click();

}