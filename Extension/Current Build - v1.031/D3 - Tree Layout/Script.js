//D3 Tree Layout Extension
//Created by Renato Vieira - rvr@qlikview.com

//This was developed and tested with QV 11.2 SR4 and Google Chrome. Minimum requirement recommendation is QV11 to ensure jQuery is available.

//Feel free to contact me if you find any bug or suggestion for improvements.

//Remember, rendering is browser based (client-side). Always test your extension before planting a General Sherman!! [http://en.wikipedia.org/wiki/General_Sherman_(tree)] 

var path = Qva.Remote + "?public=only&name=Extensions/D3 - Tree Layout/";
function extension_Init()
{
	Qva.AddExtension('D3 - Tree Layout', function(){ 
		 
		var _this = this;
		_this.ExtSettings = {};
		extensionProperties(); //initializing the extension's main properties

		extensionCSS(); //loading additional CSS files;

				
		var jsFiles=extensionJS(); //loading additional JS files;
		
		Qv.LoadExtensionScripts(jsFiles, function(){
			renderChart(); //start rendering chart, including initialized properties, loaded CSS and JS files
		})

		function plantTree(){			

			var unordered_leafs=new Array();
			
			var node_id = 'global leaf #';
			var iterator=0;

			for (tree_depth=1;tree_depth<=_this.ExtSettings.MaxDepth;tree_depth++){ //getting to the tree level
				for(row_nr=0;row_nr<_this.Data.Rows.length;row_nr++){ //iterating rows to create the tree
					if(_this.Data.Rows[row_nr][0].text==tree_depth){
						var child = new node(node_id+iterator,
											 _this.Data.Rows[row_nr][1].text,  //element_id
											 _this.Data.Rows[row_nr][2].text,  //parent_id
											 _this.Data.Rows[row_nr][3].text,  //name
											 _this.Data.Rows[row_nr][4].text,  //measure
											 _this.Data.Rows[row_nr][0].text); //depth

						unordered_leafs.push(child);
						iterator++;
					}
				}			
			}

			var tree = growTree(unordered_leafs, _this.ExtSettings.MaxDepth, _this.ExtSettings.MinDepth);
			
			return tree;
		};
		
		//Core function to render the chart
		function renderChart(){
			$divContainer = $(document.createElement('div'));
			$divContainer.attr('id',_this.ExtSettings.UniqueId);
			$divContainer.addClass('divTemplateContainer');

			$(_this.Element).empty();
			$(_this.Element).append($divContainer);

			//Update Extension info with the containers position
			_this.ExtSettings.Position = document.getElementById(_this.ExtSettings.UniqueId).getBoundingClientRect();

			//Create Tooltip for additional information display when over the node
			$divToolTip = $(document.createElement('div'));
			$divToolTip.attr('id', 'tooltip');
			
			$divToolTip.css({
						backgroundColor: 'white',
						color: '#000',
						opacity:0,
						position: 'absolute',
						border: '1px solid black'
					});
			$divContainer.append($divToolTip);

			/** This section was intensionally commented for v1.02. Add the header in the measure expression using HTML tags **/
			// $divToolTipHeader = $(document.createElement('div')); //header configuration
			// $divToolTipHeader.attr('id', 'tooltipheader');
			// $divToolTipHeader.css({
			// 			color: '#000',
			// 			font: '13px sans-serif',
			// 			"font-weight": "bold",
			// 			"text-align": "center"
			// 		});
			// $divToolTipHeader.html('Header');
			// $divToolTip.append($divToolTipHeader);

			$divToolTipContent = $(document.createElement('div')); //contents configuration
			$divToolTipContent.attr('id', 'tooltipcontent');
			$divToolTipContent.css({
						color: '#000',
						font: '11px sans-serif',
						"text-align": "left",
						"padding": "7px"
					});
			$divToolTipContent.html('content here');
			$divToolTip.append($divToolTipContent);

			var toolTip = d3.select('#tooltip');
			// var toolTipHeader = d3.select('#tooltipheader'); //This was intensionally commented for v1.02. Add the header in the measure expression using HTML tags
			var toolTipContent = d3.select('#tooltipcontent');

			var	margin = {top: 20, right: 20, bottom: 30, left: 40},
				width = _this.GetWidth() - margin.left - margin.right,
				height = _this.GetHeight() - margin.top - margin.bottom,
				i = 0,
				root;

			// Toggle children.
			function toggle(d) {
			  if (d.children) {
			    d._children = d.children;
			    d.children = null;
			  } else {
			    d.children = d._children;
			    d._children = null;
			  }
			}

			function update(source) {
			  var duration = d3.event && d3.event.altKey ? 5000 : 500;

			  // Compute the new tree layout.
			  var nodes = tree.nodes(root).reverse();

			  // Normalize for fixed-depth.
			  _this.ExtSettings.Inverter==0 ? 
							_this.ExtSettings.Orientation==0 ? nodes.forEach(function(d) { d.y = d.depth * 160; }) : nodes.forEach(function(d) { d.y = d.depth * 90; })									
							:
							_this.ExtSettings.Orientation==0 ? nodes.forEach(function(d) { d.y = d.depth * -160; }) : nodes.forEach(function(d) { d.y = d.depth * -90; })	
							;

			  // Update the nodes…
			  var node = vis.selectAll("g.node")
			      .data(nodes, function(d) { return d.id || (d.id = ++i); });
			  

			  // Enter any new nodes at the parent's previous position.
			  var nodeEnter = node.enter().append("svg:g")
			      .attr("class", "node")
			      .style("font", _this.ExtSettings.FontSize+"px sans-serif")
			      .attr("transform", function(d) { return _this.ExtSettings.Orientation==0 ? "translate(" + source.y0 + "," + source.x0 + ")" : "translate(" + source.x0 + "," + source.y0 + ")"; });

			  nodeEnter.append("svg:circle")
			      .attr("r", 1e-6)
			      .style("stroke", _this.ExtSettings.CircleStrokeColor)
			      .style("stroke-width", _this.ExtSettings.CircleStrokeWidth)
			      .style("fill", function(d) { return d._children ? _this.ExtSettings.ParentFillColor : _this.ExtSettings.ChildFillColor; })
			      .on("click", function(d) { toggle(d); update(d); })
			      .on("mouseover", function(d) { node_onMouseOver(d);})
                  .on("mouseout", function(d) {							// when the mouse leaves a circle, do the following
                    toolTip.transition()									// declare the transition properties to fade-out the div
                            .duration(500)									// it shall take 500ms
                            .style("opacity", "0");							// and go all the way to an opacity of nil
                    });

			  nodeEnter.append("svg:text")
			      .attr("x", function(d) { return _this.ExtSettings.Orientation==0 ? (d.children || d._children ? -10 : 10) : (d.children || d._children ? 0 : 0);	})
			      .attr("dy", _this.ExtSettings.Orientation==0 ? ".35em" : "1.35em")
			      .attr("text-anchor", function(d) { return _this.ExtSettings.Orientation==0 ? (d.children || d._children ? "end" : "start") : ( d.children || d._children ? "middle" : "middle"); })
			      .text(function(d) { return d.name })
			      .style("fill-opacity", 1e-6)
			      .style("fill", _this.ExtSettings.FontColor)
			      .style("cursor", "pointer")
			      .on("click", function(d) { _this.Data.SelectTextsInColumn(3,true, d.name)})
			      .on("mouseover", function(d) { node_onMouseOver(d);})
                  .on("mouseout", function(d) {							// when the mouse leaves a circle, do the following
                    toolTip.transition()									// declare the transition properties to fade-out the div
                            .duration(500)									// it shall take 500ms
                            .style("opacity", "0")							// and go all the way to an opacity of nil
                            .style("z-index", -1);							
                    });

			  // Transition nodes to their new position.
			  var nodeUpdate = node.transition()
			      .duration(duration)
			      .attr("transform", function(d) { return _this.ExtSettings.Orientation==0 ? "translate(" + d.y + "," + d.x + ")" : "translate(" + d.x + "," + d.y + ")"; });

			  nodeUpdate.select("circle")
			      .attr("r", _this.ExtSettings.CircleRadius)
			      .style("fill", function(d) { return d._children ? _this.ExtSettings.ParentFillColor : _this.ExtSettings.ChildFillColor; });

			  nodeUpdate.select("text")
			      .style("fill-opacity", 1);

			  // Transition exiting nodes to the parent's new position.
			  var nodeExit = node.exit().transition()
			      .duration(duration)
			      .attr("transform", function(d) { return _this.ExtSettings.Orientation==0 ? "translate(" + source.y + "," + source.x + ")" : "translate(" + source.x + "," + source.y + ")"; })
			      .remove();

			  nodeExit.select("circle")
			      .attr("r", 1e-6);

			  nodeExit.select("text")
			      .style("fill-opacity", 1e-6);

			  // Update the links…
			  var link = vis.selectAll("path.link")
			      .data(tree.links(nodes), function(d) { return d.target.id; });

			  // Enter any new links at the parent's previous position.
			  link.enter().insert("svg:path", "g")
			      .attr("class", "link")
			      .style("stroke", _this.ExtSettings.LinkStrokeColor)
			      .style("stroke-width", _this.ExtSettings.LinkStrokeWidth)
			      .style("fill", "none")
			      .attr("d", function(d){
			      	var o = {x: source.x0, y: source.y0};
			        return diagonal({source: o, target: o});
			      })
			    .transition()
			      .duration(duration)
			      .attr("d", diagonal);

			  // Transition links to their new position.
			  link.transition()
			      .duration(duration)
			      .attr("d", diagonal);

			  // Transition exiting nodes to the parent's new position.
			  link.exit().transition()
			      .duration(duration)
			      .attr("d", function(d) {
			        var o = {x: source.x, y: source.y};
			        return diagonal({source: o, target: o});
			      })
			      .remove();

			  function node_onMouseOver(d) {
	            toolTip.transition()
	                    .duration(200)
	                    .style("opacity", ".9");
	          // toolTipHeader.html(d.name); //This was intensionally commented for v1.02. Add the header in the measure expression using HTML tags
	            toolTipContent.html(d.size); 

	            //placing tooltip near cursor //UPDATE DEV VERSION
	            toolTip.style("left", (d3.event.pageX-_this.ExtSettings.Position.left+20) + "px")
	                   .style("top", (d3.event.pageY- _this.ExtSettings.Position.top) + "px")
	                   .style("z-index", 5);
	        }

			  // Stash the old positions for transition.
			nodes.forEach(function(d) {
			    d.x0 = d.x;
			    d.y0 = d.y;
			  });
			}

			var	tree = d3.layout.tree()
    			.size([_this.ExtSettings.Orientation==0 ? height : width, _this.ExtSettings.Orientation==0 ? width : height]);

    		var diagonal = d3.svg.diagonal().projection(function(d) { return _this.ExtSettings.Orientation==0 ? [d.y, d.x] : [d.x, d.y]; });

    		var vis = d3.select("#"+_this.ExtSettings.UniqueId).append("svg:svg")
			    .attr("width", width + margin.left + margin.right)
			    .attr("height", height + margin.top + margin.bottom)
			  	.append("svg:g")
			    .attr("transform",  _this.ExtSettings.Inverter==0 ?
							_this.ExtSettings.Orientation==0 ? "translate("+ (40) + "," + margin.top + ")" : "translate("+ margin.bottom +","+ margin.top + ")"
							:
							_this.ExtSettings.Orientation==0 ? "translate("+ (width-40) + "," + margin.top + ")" : "translate("+ margin.bottom +","+ (height-40) + ")"
							);
																		

			var data_for_chart = plantTree();
			var jsontree = JSON.stringify(data_for_chart);

			//render chart
		 	root = data_for_chart;
		  	root.x0 = _this.ExtSettings.Orientation==0 ? height / 2 : width / 2;
		  	root.y0 = 0;

		  	function toggleAll(d) {
			    if (d.children) {
			      	d.children.forEach(toggleAll);
			      	if(d.depth>=_this.ExtSettings.CollapseLvl){
			      		toggle(d);
			      	}
			    }
			}

			if(!root.children){
				update(root);
			}
			else
				root.children.forEach(toggleAll);
				update(root);
		};

		//Function to load JavaScript files. 
		function extensionJS(){
			var jsFiles = ['rvr_tree.js','d3.js','d3.layout.js'];
			var jsFilesPath = [];
			
			for (var i=0; i<jsFiles.length; i++)
				jsFilesPath[i] = _this.ExtSettings.JSFolder+'/'+jsFiles[i];
						
			return jsFilesPath;
		};

		//Function to initialize additional CSS files. 
		function extensionCSS(){
			var cssFiles = ['style.css']; 
			
			for (var i=0; i<cssFiles.length; i++){
				Qva.LoadCSS(_this.ExtSettings.CSSFolder+'/'+cssFiles[i]);
			}
		};

		//Function to initialize the extension's main properties. This will extend the _this.ExtSettings object.
		function extensionProperties(){
			//Basic extension info
			_this.ExtSettings.ExtensionName = 'D3 - Tree Layout'; 
			_this.ExtSettings.UniqueId = _this.Layout.ObjectId.replace('\\', '_');	
			_this.ExtSettings.LoadUrl = Qva.Remote + (Qva.Remote.indexOf('?') >= 0 ? '&' : '?') + 'public=only' + '&name=';
			_this.ExtSettings.ContainerId = 'Tree Layout_' + _this.ExtSettings.UniqueId ;

			//Multiple folders
			_this.ExtSettings.CSSFolder = _this.ExtSettings.LoadUrl + 'Extensions/' + _this.ExtSettings.ExtensionName + '/lib/css';
			_this.ExtSettings.JSFolder = _this.ExtSettings.LoadUrl + 'Extensions/' + _this.ExtSettings.ExtensionName + '/lib/js';
			_this.ExtSettings.ImagesFolder = _this.ExtSettings.LoadUrl + 'Extensions/' + _this.ExtSettings.ExtensionName + '/lib/images';

			//Main extension properties
			_this.ExtSettings.CircleStrokeColor = _this.Layout.Text0.text;
			_this.ExtSettings.CircleStrokeWidth = _this.Layout.Text1.text;
			_this.ExtSettings.CircleRadius = _this.Layout.Text2.text;
			_this.ExtSettings.ParentFillColor = _this.Layout.Text3.text;
			_this.ExtSettings.ChildFillColor = _this.Layout.Text4.text;
			_this.ExtSettings.CollapseLvl = _this.Layout.Text5.text;
			_this.ExtSettings.LinkStrokeColor = _this.Layout.Text6.text;
			_this.ExtSettings.LinkStrokeWidth = _this.Layout.Text7.text;
			_this.ExtSettings.FontSize = _this.Layout.Text8.text;
			_this.ExtSettings.FontColor = _this.Layout.Text9.text;
			_this.ExtSettings.Orientation = _this.Layout.Text10.text;
			_this.ExtSettings.Inverter = _this.Layout.Text11.text;
			_this.ExtSettings.MaxDepth = _this.Data.Rows[_this.Data.Rows.length-1][0].text;
			_this.ExtSettings.MinDepth = _this.Data.Rows[0][0].text;
		};
	});
}

//Initiate extension
extension_Init();
