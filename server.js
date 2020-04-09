const express = require("express");
const exphbs  = require('express-handlebars');
const bodyParser = require('body-parser')

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
})); 
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.static("public"));

app.get("/:roomId/join", (request, response) => {
  response.render('join', {layout: false, room: request.params.roomId});
});

app.post("/:roomId/join", (request, response) => {
  response.render('room', {
    layout: false, 
    room: request.params.roomId,
    name: request.body.name
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
