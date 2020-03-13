function() {
  /* widget controller */
  var c = this;
	
	redraw();
	window.addEventListener("resize", redraw);
	
	function redraw(){
		var intFrameHeight = window.innerHeight - 16;
		var intFrameWidth = window.innerWidth - 16;	
		var thingdiv = document.getElementById('thing');
		thingdiv.style.width = intFrameWidth + "px";
		thingdiv.style.height = intFrameHeight + "px";
	}
}
