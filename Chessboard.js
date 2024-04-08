// Define starting rank piece order
let dict = { "P": 10, "p": 11, "N": 20, "n": 21, "B": 30, "b": 31, "R": 40, "r": 41, "Q": 50, "q": 51, "K": 60, "k": 61 }
let revDict = { "10": "P", "11": "p", "20": "N", "21": "n", "30": "B", "31": "b", "40": "R", "41": "r", "50": "Q", "51": "q", "60": "K", "61": "k" }

/* Game */

function Game(fen) { // TO DO: extract remaining information from FEN string
    this.fen = splitFen(fen)[0]; // extract the board position from the Fen string
    
    this.board = createboard(this.fen);
    this.alterboard = this.board;

    this.movecount = 0;
    this.altmovecount = 0;
    this.inCheck = 0;
}
Game.prototype.move = function (moves) {
    
    if (typeof(moves) !== Array){
        moves = [moves];
    }

    let board = this.board;
    runlegals(board,this);

    let parsedSan = sanCoor(moves[0][0], this.movecount); // Parse SAN move into below array form
    let targetRank = parsedSan[0], targetFile = parsedSan[1], rankId = parsedSan[2], startingRank = parsedSan[3], startingFile= parsedSan[4], castling = parsedSan[5];

    let searchedCoor = piecesearch(board, [targetRank, targetFile], [startingRank, startingFile], rankId); // use piecesearch to find candidate active pieces for given move
    if(!searchedCoor){
        return console.log("Illegal Move");
    }

    startingRank = settleStartingCoor(searchedCoor, startingRank, startingFile)[0];
    startingFile = settleStartingCoor(searchedCoor, startingRank, startingFile)[1];      
    
    enPassantUpdate(board,[targetRank, targetFile], [startingRank, startingFile], rankId);
    
    board = movePieces(board, startingRank, startingFile, targetRank, targetFile);

    if(castling){ // to move Rooks; castling is false or equal to target file of king.
        board = movePieces(board, 0+7*(rankId%2), 7-(targetFile-6)*(7/4), 0+7*(rankId%2), targetFile/2 + 2);
    }
    this.movecount = (this.movecount + 1) % 2;
    this.castling = castlingUpdate(board, [startingRank,startingFile],rankId);
    
    if(moves[0].length > 1){
        this.move(moves[0].slice(1));
    }
}

/* Piece */

function Piece(position, rank) {
    this.position = position;
    this.rank = rank;
    this.legalmoves = [];
}

/* Legals */

function runlegals(board){
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            if(board[i][j]){
                board[i][j].legalmoves = findlegals(board,[i,j],board[i][j].rank);
            }
        }
    }
}
function findlegals(board, curPos, rank) {
    if (rank == 10 || rank == 11) {
        return pawnlegals(board, curPos, rank);
    } else if (rank == 20 || rank == 21) {
        return knightlegals(board, curPos, rank);
    } else if (rank == 30 || rank == 31 || rank == 40 || rank == 41 || rank == 50 || rank == 51) {
        return slidelegals(board, curPos, rank)
    } else if (rank == 60 || rank == 61){
        return kinglegals(board, curPos, rank);
    }
}
function piecesearch(board, targetPos, curPos, rankId) {
    let startingRank = curPos[0], startingFile = curPos[1];
    
    if(startingRank && startingFile){
        return isincluded(targetPos, board[startingRank][startingFile].legalmoves); 
    } else if (startingRank || startingFile) {
        for(let j = 0; j < 8; j++){
            if (board[(startingRank || j)][(startingRank || j)] && isincluded(targetPos, board[(startingRank || j)][(startingRank || j)].legalmoves)) {               // If the move is legal for a candiate piece, return
                return [(startingRank || j),(startingFile || j)];
            }
        }
    }  else {
        for (let i = 0; i < 8; i++) {
            for(let j = 0; j < 8; j++){
                if (board[i][j] && board[i][j].rank == rankId && isincluded(targetPos, board[i][j].legalmoves)){
                        return [i,j];
                }
            }
        }
        return false;
    } 
}

/* Piece Legals */

function knightlegals(board, curPos, rank) {
    let legals = [];
    let x = curPos[0], y = curPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = squaresgen(rank);

    for (let sq of squares) {
        if ((x + sq[0] in boardrange) && (y + sq[1] in boardrange)){
            // Check if knight jump in bounds
            if(!(board[x + sq[0]][y + sq[1]]) || (rank + board[x + sq[0]][y + sq[1]].rank) % 2 == 1){
                if(!(kSight(altmove([x,y], [x + sq[0], y + sq[1]], resetAlt(board)),rank))){
                    legals.push([x + sq[0], y + sq[1]]);
                }
            }
        } 
    }
    return legals;
}
function slidelegals(board, curPos, rank) {
    let legals = [];
    let x = curPos[0], y = curPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = squaresgen(rank);
    for (let sq of squares) {
        let csq = [x + sq[0], y + sq[1]]
        if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){             //If out of board range 
            continue;
        }
        while ((board[csq[0]][csq[1]]) == undefined /* if candidate square is empty */ || (board[csq[0]][csq[1]].rank + rank) % 2 === 1 /* if piece of opposite color */ ) {
            if(!(kSight(altmove([x,y], [csq[0],csq[1]], resetAlt(board)),rank))){
                legals.push([csq[0],csq[1]]);
            }
            if(board[csq[0]][csq[1]]) {                                // if candidate square is not empty (contains an opposite color piece), stop.
                break;
            }
            csq = [csq[0] + sq[0],csq[1] + sq[1]];                          // keep moving in the same direction until a piece or edge of board is found
            if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){         // if new candidate square out of board range 
                break;
            }
        }
    }
    return legals;
}
function knightjumps() {
    let twos = [2, -2];
    let ones = [1, -1];
    let knightsquares = [];
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            knightsquares.push([twos[i], ones[j]]);
            knightsquares.push([ones[j], twos[i]]);
        }
    }
    return knightsquares;
}
function squaresgen(rank) {
    if (rank == 30 || rank == 31) {
        return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    } else if (rank == 40 || rank == 41) {
        return [[1, 0], [-1, 0], [0, 1], [0, -1]];
    } else if (rank == 50 || rank == 51 || rank == 60 || rank == 61) {
        return [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    } else if (rank == 20 || rank == 21){
        return knightjumps();
    }
}

/* Pawn Legals */

function pawnlegals(board, curPos, rank) {                               // TO DO: Tidy up and add En passant
    let legals = [];
    let x = curPos[0];
    let y = curPos[1];
    rank = rank % 2;

    let up = 1 - (rank % 2) * 2                                             // Up or down a rank depending on color
    let onStartingRank = ((x + 3 * (rank)) % 8 === 1)                         // Checks if on starting rank depending on color
    // Pushes
    if (!board[x + up][y] && !(kSight(altmove([x,y], [x + up,y], resetAlt(board)),rank))) {                                       // If square ahead is empty
        legals.push([x + up, y]);
        if (!board[x + 2 * up][y] /* If two squares ahead are empty */ && (onStartingRank) && !(kSight(altmove([x,y], [x + 2*up,y], resetAlt(board)),rank))) {
            legals.push([x + 2 * up, y]);
        }
    }
    // Captures
    for (sq of [-1, 1]) {
        if ((board[x + up][y + sq]) /* square not empty */ && ((board[x + up][y + sq].rank % 2) !== (rank % 2))) /* target of opposite color */ {
            if (y + sq < 8 && y + sq > 0) /* Remove cases at edge of board*/ {
                legals.push([x + up, y + sq]);
            }
        } else if((board[9+((rank+1)%2)][y + sq]) == 1) {
                legals.push([x + up, y + sq]);
        }
    }
    return legals;
}
function enPassantUpdate(board,[targetRank, targetFile], [startingRank, startingFile], rankId){
    board[9] = new Array(8).fill(0);
    board[10] = new Array(8).fill(0);

    if(isPawnJump([targetRank, targetFile], [startingRank, startingFile], rankId)){
        board[9+(rankId%2)][startingFile] = 1;
    }
}
function isPawnJump([targetRank, targetFile], [startingRank, startingFile], rankId) {
    let isPawnMove = (Math.round(rankId/10) == 1)
    let isJump = ((targetRank - startingRank)%2 == 0) && (targetFile == startingFile);

    return isJump && isPawnMove;
}
/* King Legals */

function kinglegals(board, curPos, rank) {
    let legals = [];
    let x = curPos[0], y = curPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];
    
    let squares = squaresgen(rank);

    // Normal Moves
    for (let sq of squares) {
        if ((x + sq[0] in boardrange) && (y + sq[1] in boardrange)) { // Check if move is in board range
            if(!(board[x + sq[0]][y + sq[1]]) || (board[x + sq[0]][y + sq[1]].rank + rank) % 2 === 1) { // Check if empty or occupied by opposing piece
                if(!(kSight(altmove([x,y], [x + sq[0],y + sq[1]], resetAlt(board)),rank))){
                        legals.push([x + sq[0],y + sq[1]]);
                }
            }
        }
    }

    // Castling

    if(canCastle(board,[0 + 7*(rank%2), 2],rank)){ // If can castle long
        legals.push([0 + 7*(rank%2), 2]);
    } 
    if(canCastle(board,[0 + 7*(rank%2), 6],rank)){ // If can castle short
        legals.push([0 + 7*(rank%2), 6]);
    }

    return legals;
}

/* Check Functions */

function kSight(board,rank) {
    return kSightStr8(board, rank) || kSightDiag(board,rank) || kSightL(board, rank);
}
function kSightStr8(board, rank) {
    let legals = [];
    let x = getKing(board,rank)[0], y = getKing(board, rank)[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = squaresgen(40+(rank%2));
    // Check as Queen
    for (let sq of squares) {
        let csq = [x + sq[0], y + sq[1]]
        if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){                 //If out of board range 
            continue;
        }                    
        while ((board[csq[0]][csq[1]]) == undefined /* if candidate square is empty */ || (board[csq[0]][csq[1]].rank + rank) % 2 === 1 /* if piece of opposite color */ ) {
            if(board[csq[0]][csq[1]]){
                if(Math.round(board[csq[0]][csq[1]].rank / 10) == 4 || Math.round(board[csq[0]][csq[1]].rank / 10) == 5){                                      // if candidate square is not empty (contains an opposing rook or queen), push and stop.
                    legals.push([csq[0],csq[1]]);
                }
                break;
            }          
            csq = [csq[0] + sq[0],csq[1] + sq[1]];    
            if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){         // if new candidate square out of board range 
                break;
            }
        }
    }
    return legals.length > 0;
}
function kSightDiag(board, rank) {
    let legals = [];
    let x = getKing(board,rank)[0], y = getKing(board, rank)[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = squaresgen(30+(rank%2));
    // Check as Queen
    for (let sq of squares) {
        let csq = [x + sq[0], y + sq[1]]
        if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){                 //If out of board range 
            continue;
        }                                    
        while ((board[csq[0]][csq[1]]) == undefined /* if candidate square is empty */ || (board[csq[0]][csq[1]].rank + rank) % 2 === 1 /* if piece of opposite color */ ) {
            if(board[csq[0]][csq[1]] && (Math.round(board[csq[0]][csq[1]].rank / 10) == 3 || Math.round(board[csq[0]][csq[1]].rank / 10) == 5)) {// if candidate square is not empty (contains an opposing bishop or queen), push and stop.
                legals.push([csq[0],csq[1]]);                                   // push to legals
                break;
            }
            csq = [csq[0] + sq[0],csq[1] + sq[1]];                          // keep moving in the same direction until a piece or edge of board is found
            if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){         // if new candidate square out of board range 
                break;
            }
        }
    }
    return legals.length > 0;
}
function kSightL(board, rank) {
    let legals = [];
    let x = getKing(board,rank)[0], y = getKing(board, rank)[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];
    let squares = squaresgen(20+rank%2);

    for (let sq of squares) {
        if ((x + sq[0] in boardrange) && (y + sq[1] in boardrange)){
            // Check if knight jump in bounds
            if(!(board[x + sq[0]][y + sq[1]]) || (rank + board[x + sq[0]][y + sq[1]].rank) % 2 == 1){
                if((board[x + sq[0]][y + sq[1]]) && Math.round(board[x + sq[0]][y + sq[1]].rank / 10) == 2){
                    legals.push([x + sq[0], y + sq[1]]);
                }
            }
        } 
    }
    return legals.length > 0;
}

/* Castling Function */

function castlingUpdate(board, curPos, rankid){
    
    let castlingArray = board[8];
    if(!(Math.round(rankid/10) == 4 || Math.round(rankid/10) == 6)) { // If not a rook or a king move, return
        return castlingArray;
    }

    x = curPos[0];
    y = curPos[1];

    if(y == 7 && castlingArray[1][rankid%2] == 1){ // Queenside rook and hasn't moved
        castlingArray[1][rankid%2] = 0;
    } else if(y == 0 && castlingArray[2][rankid%2] == 1){ // Kingside rook and hasn't moved
        castlingArray[2][rankid%2] = 0;
    } else if(y == 4 && x == 0 + (rankid%2)*7 && castlingArray[0][rankid%2] == 1){ // White or black king and hasn't moved
        castlingArray[0][rankid%2] = 0;
        castlingArray[1][rankid%2] = 0
        castlingArray[2][rankid%2] = 0
    }

    return castlingArray; 
}
function canCastle(board, targetposition, rankid){
    let castlingArray = board[8];

    if(targetposition[1] == 6 && castlingArray[1][rankid%2] == 1) { // Short
        return safePassage(board, rankid, false);
    } else if (targetposition[1] == 2 && castlingArray[2][rankid%2] == 1) { // Long
        return safePassage(board, rankid, true);
    }
    return false;
}
function safePassage(board, rankid, longCastle){
    let sq = [0,1 - (2*longCastle)]; // if longCastle, move westward
    let kPos = [0+(rankid%2)*7, 4];

    if(longCastle && board[kPos[0]][kPos[1]+3*sq[1]]){ // if piece in the way for longcastle
        return false;
    }
    if(!kSight(board,rankid) && !board[kPos[0]][kPos[1]+sq[1]] && !kSight(altmove(kPos,[kPos[0],kPos[1]+sq[1]],board),rankid)){ // If next two squares to king are empty and wont pass through checks
        if(!board[kPos[0]][kPos[1]+2*sq[1]] && !kSight(altmove(kPos,[kPos[0],kPos[1]+2*sq[1]],board),rankid)){
            return true;
        }
    }
    return false;
}

/* Board Creation Helpers */

function splitFen(fen) {
    if (!(fen)) {
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
    return fen.split(" ")
}
function createboard(fen) {
    let board = new Array(11);       // Create 8 x 8 array

    for (let i = 0; i < 8; i++) {
        board[i] = new Array(8);
    }

    board[8] = [[1,1],[1,1],[1,1]];
    board[9] = new Array(8).fill(0);
    board[10] = new Array(8).fill(0);

    let rank = 0;
    let file = 0;

    for (let elt of fen) {          // Sort through Fen string and populate board
        file = file % 8;
        let space = parseInt(elt);  // convert fen character to a number
        if (elt === "/") {
            rank++;
        } else if (!(isNaN(space))) { // if elt is a number
            file += space; // skip square
        } else {
            board[7 - rank][file] = new Piece([7 - rank, file], dict[elt]); //set new piece with current location in array and rank from dict
            file++; // move to next square
        }
    }
    return board;
}
function getfen(board){
    let str = "";
    for(let i = 0; i < 8; i++){            
        let space = 0;
        for(let j = 0; j < 8; j++){
            if (board[7-i][j]) { // check if square is not empty
                if(space > 0){
                    str += space;
                    space = 0;
                }
                str += revDict[board[7-i][j].rank];
            } else {
                space ++;
            } 
        }
        if(space > 0){
            str += space;
            space = 0;
        }
        if(i < 7){
            str += "/"
        }
    }
    return str;
}
function resetAlt(ogboard){
    return createboard(getfen(ogboard));
}
function display (board) {
    console.log(" ====================== ");
    for (let i = 0; i < 8; i++) {
        boardstr = "";
        for (let j = 0; j < 8; j++) {
            if (board[7 - i][j]) { // check if square is not empty
                boardstr += " " + revDict[board[7 - i][j].rank] + " ";
            } else {
                boardstr += " - ";
            }
        }
        console.log(boardstr);
    }
    console.log(" ====================== ");
}

/* SAN Parsers */

function sanCoor(string, moveCount) {                                                                           // returns the target position and the rank id of the active piece
    let targetFile = string.charCodeAt(string.length - 2) - 97, targetRank = string[string.length - 1] - 1;     // extract target square (last two chars)
    let moveClass = classifySan(string);
    let castling = isCastling(string, moveClass);
    if(castling){
        return [0+7*(moveCount%2), castling /* castling == false or castling file */, rankIdFromSan(string, moveClass, moveCount), rankFromSan(string,moveClass), fileFromSan(string,moveClass), castling];
    }
    return [targetRank, targetFile, rankIdFromSan(string, moveClass, moveCount), rankFromSan(string,moveClass), fileFromSan(string,moveClass), castling]
}
function classifySan(string){
    if (string[string.length - 1] == "+" || string[string.length - 1] == "#") {                     // if check or mate, remove trailing # or +
        string = string.slice(0, string.length - 1);
    }

    let pawnmove = /^[a-h][1-8]([+#])?/;                                                            //#1 e.g. "e4"
    let startingFilePawnCapture = /^[a-h][x][a-h][1-8]([+#])?/;                                     //#2 e.g. "exd4"
    let pieceMove = /^[BNRQ][a-h][1-8]([+#]?)/;                                                     //#3 e.g. "Nf6"
    let startingMoveRank = /^[BNRQ][1-8][a-h][1-8]([+#]?)/;                                         //#4 e.g. "Q5a5"
    let startingMoveFile = /^[BNRQ][a-h][a-h][1-8]([+#]?)/;                                         //#5 e.g. "Qea5"
    let startingMoveSquare = /^[BNRQ][a-h][1-8][a-h][1-8]([+#]?)/;                                  //#6 e.g. "Qe5a5"
    let castle = /^O(-O)?-O/;                                                                      //#7 
    
    return 1*pawnmove.test(string)+ 2*startingFilePawnCapture.test(string) + 3*pieceMove.test(string)  + 4*startingMoveRank.test(string) + 5*startingMoveFile.test(string) + 6*startingMoveSquare.test(string) + 7*castle.test(string);
}
function rankIdFromSan(string, moveClass, moveCount){
    if(moveClass == 1 || moveClass == 2){ // Pawn Move
        return (10 + (moveCount % 2));
    } else if (moveClass >= 3 && moveClass <= 6){
        return (dict[string[0]] +(moveCount % 2) );
    } else if (moveClass == 7){
        return (60 + (moveCount % 2));
    }
}
function rankFromSan(string, moveClass){
    if(moveClass == 4 || moveClass == 6){
        return string[1]-1;
    }
    return false;
}
function fileFromSan(string, moveClass){
    if(moveClass == 2){
        return string.charCodeAt(0) - 97;
    } else if (moveClass == 5 || moveClass == 6){
        return string.charCodeAt(1) - 97;
    }
    return false;
}
function isCastling(string, moveClass){
    if(moveClass == 7){
        if(string.length == 3){     // Short Castle "O-O"
            return 6;
        } else {                    // Long Castle "O-O-O"
            return 2;
        }
    }
    return false;
}

/* Move Making Helpers */
function isincluded(move, list) {
    if (list == [] || list == undefined) {
        return false;
    }
    for (element of list) {
        counter = 0;
        for (let i = 0; i < 2; i++) {
            if (move[i] == element[i]) {
                counter++;
            }
        }
        if (counter == 2) {
            return move;
        }
    }
    return false;
}
function ispiece(board, squares){
    let pieces = [];
    for(sq of squares){
        if(board[sq[0]][sq[1]]){
            pieces.push(sq)
        }
    }
    if (pieces.length > 0){return pieces}
    return;
}
function getKing(board,rank){
    for(let i = 0; i < 8; i++){
        for(let j = 0; j < 8; j++){
            if(board[i][j] && board[i][j].rank == 60 + (rank % 2)){
                return [i,j];
            }
        }
    }
    return "The KING is DEAD"
}
function altmove(strtmove,endmove, board){
    altboard = resetAlt(board);
    altboard[strtmove[0]][strtmove[1]].position = [endmove[0],endmove[1]]; // update piece position
    altboard[endmove[0]][endmove[1]] = altboard[strtmove[0]][strtmove[1]]; // update end square reference

    altboard[strtmove[0]][strtmove[1]] = null; // update start square
    return altboard;
}
function movePieces(board, startingRank, startingFile, targetRank, targetFile){
    
    board[startingRank][startingFile].position = [targetRank,targetFile]; // update piece position
    board[targetRank][targetFile] = board[startingRank][startingFile]; // update end square reference
    board[startingRank][startingFile] = null; // update start square
    
    return board;
}
function settleStartingCoor(searchedCoor, startingRank, startingFile){
    if (!(startingRank || startingFile)){           // San move contains no discriminating info
        startingRank = searchedCoor[0];
        startingFile = searchedCoor[1];
    } else if(startingRank && !startingFile){       // San move contains starting rank
        startingFile = searchedCoor[1];
    } else if (!startingRank && startingFile ) {    // San move contains starting file
        startingRank = searchedCoor[0];
    }
    return [startingRank, startingFile];
}

/* Testing */
function test(){
    let game = new Game();
    let board = game.board;

    game.move(["e4","h6","e5","f5","d4","h5"]);
    display(board);
    runlegals(board);
    console.log(board[4][4]);
}

test();


/* Notes *
* TO DO: 
* 1. Fix Ambiguous moves
* 2. Restrict moves that cause checks 
*/