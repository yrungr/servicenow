function() {
  var serverLink = this;
  var output = serverLink.data.output;
  var dataDiv = document.getElementById("output");
  var preformatted = document.createElement("PRE");
  var linebreak = document.createElement("br");
  var textNode = document.createTextNode(JSON.stringify(output, null, 2));
  preformatted.appendChild(textNode);
  dataDiv.appendChild(preformatted);
}