// Define starting rank piece order
let dict = { "P": 10, "p": 11, "N": 20, "n": 21, "B": 30, "b": 31, "R": 40, "r": 41, "Q": 50, "q": 51, "K": 60, "k": 61 }
let revDict = { "10": "P", "11": "p", "20": "N", "21": "n", "30": "B", "31": "b", "40": "R", "41": "r", "50": "Q", "51": "q", "60": "K", "61": "k" }

/* Game */

function Game(fen) { // TO DO: extract remaining information from FEN string
    let fenPos = fenArray(fen)[0]; // extract the board position from the Fen string
    this.board = createboard(fenPos);
    this.movecount = 0;
    this.wK = [0,4];
    this.bK = [7,4];
}
Game.prototype.display = function () {
    for (let i = 0; i < 8; i++) {
        boardstr = "";
        for (let j = 0; j < 8; j++) {
            if (this.board[7 - i][j]) { // check if square is not empty
                boardstr += revDict[this.board[7 - i][j].rank];
            } else {
                boardstr += "x";
            }
        }
        console.log(boardstr);
    }
}
Game.prototype.move = function (move) {
    let moveCoor = sanCoor(move, this.movecount); // find target square and rank id of active piece
    let endrank = moveCoor[0];
    let endfile = moveCoor[1];
    let rankid = moveCoor[2];

    let startCoor= piecesearch(this, [endrank,endfile], rankid); // use piecesearch to find candidate active pieces for given move
    let startrank = startCoor[0];
    let startfile = startCoor[1];

    this.board[startrank][startfile].position = [endrank,endfile]; // update piece position
    this.board[endrank][endfile] = this.board[startrank][startfile]; // update end square reference

    this.board[startrank][startfile] = null; // update start square

    this.movecount = (this.movecount + 1) % 2;
}
Game.prototype.getmovecount = function () {
    return this.movecount;
}
Game.prototype.inCheck= function (){ // TO DO: Add option to check for double check
    return inCheck(this);
}

/* Piece */

function Piece(position, rank) {
    this.position = position;
    this.rank = rank;
    this.legalmoves = [];
}

/* Legals */

function piecesearch(game, targetposition, rank) {
    for (let i = 0; i < 8; i++) {
        for(let j = 0; j < 8; j++){
            if (game.board[i][j] && game.board[i][j].rank == rank) {    // Search board for piece with the same rank id as intended active piece
                legals = findlegals(game, [i,j], rank);                 // Calculate legal moves for candidate pieces w/ same rank id
                if (isincluded(targetposition, legals)) {               // If the move is legal for a candiate piece, return
                    return [i,j];
                }
            }
        }
    }
    return "Piecesearch failed"; 
}
function findlegals(game, curPos, rank) {
    if (rank == 10 || rank == 11) {
        return pawnlegals(game, curPos, rank);
    } else if (rank == 20 || rank == 21) {
        return knightlegals(game, curPos, rank);
    } else if (rank == 30 || rank == 31 || rank == 40 || rank == 41 || rank == 50 || rank == 51) {
        return slidelegals(game, curPos, rank)
    } else {
        return undefined;
    }
}
function pawnlegals(game, curPos, rank) {                               // TO DO: Tidy up and add En passant
    let legals = [];
    rank = rank % 2; 
    x = curPos[0];
    y = curPos[1];

    if(x === 0 ||  x === 7){                                            // Pawns should not be found on first or last rank
        return 'Why is a Pawn Here?' 
    }

    up = 1 - (rank % 2) * 2                                             // Up or down a rank depending on color
    onStartingRank = ((x + 3*(rank)) % 8 === 1)                         // Checks if on starting rank depending on color

    // Pawn pushes
    if (!game.board[x + up][y]) {                                       // If square ahead is empty
        legals.push([x + up,y]);
        if (!game.board[x + 2*up][y] /* If two squares ahead are empty */ && (onStartingRank)) {
            legals.push([x + 2*up,y]);
        }
    }
    // Capture eastward
    if ((game.board[x + up][y + 1]) /* square not empty */ && ((game.board[x + up][y + 1].rank % 2) !== (rank % 2))) /* target of opposite color */ {
        if (y + 1 < 8) /* Remove cases at edge of board*/ {
            legals.push([x+up,y+1]); 
        }
    } 
    // Capture westward
    if ((game.board[x + up][y - 1]) /* square not empty */ && ((game.board[x + up][y - 1].rank % 2) !== (rank % 2))) /* target of opposite color */ {
        if (y - 1 > 0) /* Remove cases at edge of board*/ {
            legals.push([x+up,y-1]); 
        }
    }
    return legals;
}
function knightlegals(game, curPos, rank) {
    let legals = [];
    let x = curPos[0], y = curPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = knightjumps();

    for (let sq of squares) {
        if ((x + sq[0] in boardrange) && (y + sq[1] in boardrange)){
            // Check if knight jump in bounds
            if(!(game.board[x + sq[0]][y + sq[1]]) || (rank + game.board[x + sq[0]][y + sq[1]].rank) % 2 == 1){
                legals.push([x + sq[0], y + sq[1]]);
            }
        } 
    }
    return legals;
}
function slidelegals(game, curPos, rank) {
    let legals = [];
    let x = curPos[0], y = curPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];

    let squares = slidesquares(rank);
    for (let sq of squares) {
        let csq = [x + sq[0], y + sq[1]]
        if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){             //If out of board range 
            continue;
        }                                    
        while ((game.board[csq[0]][csq[1]]) == undefined /* if candidate square is empty */ || (game.board[csq[0]][csq[1]].rank + rank) % 2 === 1 /* if piece of opposite color */ ) {
            legals.push([csq[0],csq[1]]);                                   // push to legals
            if(game.board[csq[0]][csq[1]]) {                                // if candidate square is not empty (contains an opposite color piece), stop.
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
function kinglegals(game, rank) {
    let legals = [];
    let kPos = [game.wK[0]*(1-game.movecount) + game.bK[0]*game.movecount, game.wK[1]*(1-game.movecount) + game.bK[1]*game.movecount] // King is the color of the side that is about to move, i.e. white if White's move.
    let x = kPos[0], y = kPos[1];
    let boardrange = [0, 1, 2, 3, 4, 5, 6, 7];
    
    let squares = slidesquares(rank);

    for (let sq of squares) {
        if ((x + sq[0] in boardrange) && (y + sq[1] in boardrange)){ // Check if move is in board range
            if(!(game.board[x + sq[0]][y + sq[1]])){ // Check if empty
                legals.push([x + sq[0], y + sq[1]]);
            } else if ((rank + game.board[x + sq[0]][y + sq[1]].rank) % 2 == 1){ // Check if occupied by a different colored piece
                if(!(inCheck(game,[x + sq[0], y + sq[1]]))){ // if King will not be in check in candidate square
                    legals.push([x + sq[0], y + sq[1]]);
                }        
            }
        } 
    }
    return legals;
}
function inCheck(game, kPos){
    let squares = kSight(game,kPos) // set of squares that can be checking the king in question
    let checkers = 0;
    if (!kPos){
        kPos = [game.wK[0]*(1-game.movecount) + game.bK[0]*game.movecount, game.wK[1]*(1-game.movecount) + game.bK[1]*game.movecount]
    }
    for(list of squares){ 
        for(sq of list){
            if(game.board[sq[0]][sq[1]]){ // if not empty
                if((game.board[sq[0]][sq[1]].rank + game.board[kPos[0]][kPos[1]].rank) % 2 === 1){ // if occupied by a piece of a different color
                    if(seesKing(game, sq, kPos)){
                        checkers = checkers + 1;
                    }
                }
            }
        }
    }
    return checkers; // return number of times king is checked
}
function kSight(game,kPos){ // To check if the king is in check - search potential checking squares from King's position
    if (!kPos){
        kPos = [game.wK[0]*(1-game.movecount) + game.bK[0]*game.movecount, game.wK[1]*(1-game.movecount) + game.bK[1]*game.movecount]
    }    
    ranks = [20, 50] // Search from King's position as a Knight and a Queen
    checkers = [];
    for(rank of ranks){
        checkers.push(findlegals(game, kPos, rank + (game.board[kPos[0]][kPos[1]].rank % 2))) // Checks legal squares form king's position from a Queen and Kinght of the same color's perspective
    }
    return checkers;  
}
function seesKing(game, curPos, kPos){ // checks if piece in curPos can see the King in question
    if (!kPos){
        kPos = [game.wK[0]*(1-game.movecount) + game.bK[0]*game.movecount, game.wK[1]*(1-game.movecount) + game.bK[1]*game.movecount]
    }
    let rank = game.board[curPos[0]][curPos[1]].rank;
    let sightRange = findlegals(game,curPos,rank);
    return isincluded(kPos,sightRange);
}
function exposesKing(game, curPos, move, rank){ // To check if a piece moving would expose King
    // If there's a piece, save its rank 
    let rankMem = 0;
    if(game.board[move[0]][move[1]]){
        rankMem = game.board[move[0]][move[1]].rank;
    }

    // Make move
    game.board[move[0]][move[1]] = game.board[curPos[0]][curPos[1]];
    game.board[curPos[0]][curPos[1]] = null; 
    
    game.display();
    // Check if move puts your king
    let exposed = inCheck(game) > 0;

    // Unmake move
    game.board[curPos[0]][curPos[1]] = null
    if(rankMem !== 0){
        game.board[curPos[0]][curPos[1]] = new Piece([curPos[0], curPos[1]], rank)
    }
    game.board[move[0]][move[1]] = new Piece([move[0], move[1]], rankMem)

    return exposed;
}
/* Helpers */

function fenArray(fen) {
    if (!(fen)) {
        fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
    return fen.split(" ")
}
function createboard(fen) {
    let board = new Array(8);       // Create 8 x 8 array
    for (let i = 0; i < 8; i++) {
        board[i] = new Array(8);
    }

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
function sanCoor(string, movecount) { // returns the target position and the rank id of the active piece
    let pawnmove = /^[a-h]([x][a-h])?[1-8]([+#])?/;
    if (string[string.length - 1] == "+" || string[string.length - 1] == "#") { // if check or mate, remove trailing # or +
        string = string.slice(0, string.length - 1);
    }

    let x = string.charCodeAt(string.length - 2) - 97, y = string[string.length - 1] - 1; // extract target square (last two chars)

    if (pawnmove.test(string)) { // If pawn move (pawns are not labelled in SAN)
        return [y, x, 10 + (movecount % 2)]; // returns [rank, file, rank id]
    } else { // If any other move, use first char & move count to identify piece
        return [y, x, dict[string[0]] + (movecount % 2)];
    }
}
function slidesquares(rank) {
    if (rank == 30 || rank == 31) {
        return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    } else if (rank == 40 || rank == 41) {
        return [[1, 0], [-1, 0], [0, 1], [0, -1]];
    } else if (rank == 50 || rank == 51 || rank == 60 || rank == 61) {
        return [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    }
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
function isincluded(move, list) {
    if (list == [] || list == undefined) {
        return false;
    }
    for (let element of list) {
        let count = 0;
        for (let i = 0; i < 2; i++) {
            if (element[i] !== move[i]) {
                break;
            }
            count++;
        }
        if (count == 2) { return true; }
    }
    return false;
}

/* Exporting */

module.exports = { Game };

/* Testing */

game = new Game();

game.move('e4')
game.move('e5')
game.move('f4')
game.move('Qh4')
game.move('h3')

game.board[1][4] = new Piece([1,4],21);
game.display();
console.log(inCheck(game))
//console.log(exposesKing(game,[2,6],[3,6],10));