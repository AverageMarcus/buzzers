const express = require("express");
var exphbs  = require('express-handlebars');
const app = express();

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static("public"));

app.get("/:roomId/join", (request, response) => {
  response.render('join', {layout: false, room: request.params.roomId});
});

app.post("/:roomId/join", (request, response) => {
  response.render('room', {layout: false, room: request.params.roomId});
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
