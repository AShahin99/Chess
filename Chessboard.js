// Define starting rank piece order
let dict = { "P": 10, "p": 11, "N": 20, "n": 21, "B": 30, "b": 31, "R": 40, "r": 41, "Q": 50, "q": 51, "K": 60, "k": 61 }
let revDict = { "10": "P", "11": "p", "20": "N", "21": "n", "30": "B", "31": "b", "40": "R", "41": "r", "50": "Q", "51": "q", "60": "K", "61": "k" }

/* Game */

function Game(fen) { // TO DO: extract remaining information from FEN string
    this.fen = fenArray(fen)[0]; // extract the board position from the Fen string
    
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

    let moveCoor = sanCoor(moves[0][0], this.movecount); // find target square and rank id of active piece
    let endrank = moveCoor[0];
    let endfile = moveCoor[1];
    let rankid = moveCoor[2];
    let castling = moveCoor[3];

    runlegals(board,this);

    let startCoor = piecesearch(board, [endrank,endfile], rankid); // use piecesearch to find candidate active pieces for given move
    let startrank = startCoor[0];
    let startfile = startCoor[1];

    this.castling = castlingUpdate(board, [startrank,startfile],rankid);
    
    board[startrank][startfile].position = [endrank,endfile]; // update piece position
    board[endrank][endfile] = board[startrank][startfile]; // update end square reference
    board[startrank][startfile] = null; // update start square

    if(castling){ // if castling, move rooks too
        if(endfile == 6){ // short castle
            board[0+7*(rankid%2)][7].position = [0+7*(rankid%2),5]; // update piece position
            board[0+7*(rankid%2)][5] = board[0+7*(rankid%2)][7]; // update end square reference
            board[0+7*(rankid%2)][7] = null; // update start square
        } else if(endfile == 2){ // long castle
            board[0+7*(rankid%2)][0].position = [0+7*(rankid%2),3]; // update piece position
            board[0+7*(rankid%2)][3] = board[0+7*(rankid%2)][0]; // update end square reference
            board[0+7*(rankid%2)][0] = null; // update start square
        }
    }

    this.movecount = (this.movecount + 1) % 2;
    
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
function piecesearch(board, targetposition, rank) {
    for (let i = 0; i < 8; i++) {
        for(let j = 0; j < 8; j++){
            if (board[i][j] && board[i][j].rank == rank) {
                if (isincluded(targetposition, board[i][j].legalmoves)) {               // If the move is legal for a candiate piece, return
                    return [i,j];
                }
            }
        }
    }
    return "AA"; 
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

function pawnlegals(board, curPos, rank, hello) {                               // TO DO: Tidy up and add En passant
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
        }
    }
    return legals;
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

function fenArray(fen) {
    if (!(fen)) {
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
    return fen.split(" ")
}
function createboard(fen) {
    let board = new Array(9);       // Create 8 x 8 array
    for (let i = 0; i < 8; i++) {
        board[i] = new Array(8);
    }
    board[8] = [[1,1],[1,1],[1,1]];
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

/* Move-making Helpers */

function sanCoor(string, movecount) { // returns the target position and the rank id of the active piece
    let pawnmove = /^[a-h]([x][a-h])?[1-8]([+#])?/;
    if (string[string.length - 1] == "+" || string[string.length - 1] == "#") { // if check or mate, remove trailing # or +
        string = string.slice(0, string.length - 1);
    }

    let x = string.charCodeAt(string.length - 2) - 97, y = string[string.length - 1] - 1; // extract target square (last two chars)
    
    if (pawnmove.test(string)) { // If pawn move (pawns are not labelled in SAN)
        return [y, x, 10 + (movecount % 2),false]; // returns [rank, file, rank id, castling]
    } else if (string == "O-O-O"){ //long castle
        return [0+7*(movecount%2), 2, 60 + (movecount % 2), true];
    } else if (string == "O-O"){ //short castle
        return [0+7*(movecount%2), 6, 60 + (movecount % 2), true]
    } else { // If any other move, use first char & move count to identify piece
        return [y, x, dict[string[0]] + (movecount % 2),false];
    }
}
function isincluded(moves, list) {
    if (list == [] || list == undefined) {
        return false;
    } if (!(moves[0].length > 1)){
        moves = [moves];
    }
    for(move of moves){
        for(element of list){
            counter = 0;
            for (let i = 0; i < 2; i++){
                if (move[i] == element[i]){
                    counter++;
                }
            }
            if(counter == 2){
                return true;
            }
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

/* Testing */
function test(){
    let game = new Game();
    let board = game.board;
    game.move(["e4","f6","d3",'a5',"Qh5","g6","Nf3","Bg7","Be2","b6","Be3","c6","Nc3","b5","Nb1","a4"])
    board[1][4] = null;
    board[4][7] = new Piece([4,7], 51);
    game.move(["Nc3","Ra7","O-O-O","e6","h3","Ne7","g3","O-O"])
    runlegals(board);
    display(board);
}
test();

/* Notes *
* TO DO: 
* 1. Fix Ambiguous moves
* 2. Restrict moves that cause checks 
*/