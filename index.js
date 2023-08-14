//テスト
const port = 3000,
    express = require("express"),
    app = express();

//乱数生成を生成するための関数
function getRandomVal(max){
    return Math.floor(Math.random()*max);
}


app.get("/", (req, res) => {

    let retStatusIndex = getRandomVal(100);
    if( retStatusIndex < 70 ){
        res.send("New Relic!");
    }else if( retStatusIndex <= 90){
        res.status(404).send("Not Found");
    }else{
        res.status(503).send("Service Unavailable")
    }
})
.listen(port, () => {
    console.log('The Express.js server has started and is listening on port number:' + ` ${port}`);
});