// Define starting rank piece order
let dict = { "P": 10, "p": 11, "N": 20, "n": 21, "B": 30, "b": 31, "R": 40, "r": 41, "Q": 50, "q": 51, "K": 60, "k": 61 }
let revDict = { "10": "P", "11": "p", "20": "N", "21": "n", "30": "B", "31": "b", "40": "R", "41": "r", "50": "Q", "51": "q", "60": "K", "61": "k" }

/* Game */

function Game(fen) { // TO DO: extract remaining information from FEN string
    let fenPos = fenArray(fen)[0]; // extract the board position from the Fen string
    this.board = createboard(fenPos);
    this.movecount = 0;
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
Game.prototype.getpiece = function (position) {
    return this.board[position[0]][position[1]];
}

/* Piece */

function Piece(position, rank) {
    this.position = position;
    this.rank = rank;
    this.legalmoves = [];
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

/* Legals */

function piecesearch(game, targetposition, rank) {
    for (let i = 0; i < 8; i++) {
        for(let j = 0; j < 8; j++){
            if (game.board[i][j] && game.board[i][j].rank == rank) { // Search board for piece with the same rank id as intended active piece
                legals = findlegals(game, [i,j], rank); // Calculate legal moves for candidate pieces w/ same rank id
                if (isincluded(targetposition, legals)) { // If the move is legal for a candiate piece, return
                    return [i,j];
                }
            }
        }
    }
    return "Not Legal";
}
function findlegals(game, position, rank) {
    if (rank == 10 || rank == 11) {
        return pawnlegals(game, position, rank);
    } else if (rank == 20 || rank == 21) {
        return knightlegals(game, position, rank);
    } else if (rank == 30 || rank == 31 || rank == 40 || rank == 41 || rank == 50 || rank == 51) {
        return slidelegals(game, position, rank)
    } else {
        return [];
    }
}
function pawnlegals(game, curPos, rank) { // TO DO: Tidy up and add En passant
    let legals = [];
    rank = rank % 2; 
    x = curPos[0];
    y = curPos[1];

    if(x === 0 ||  x === 7){ // Pawns should not be found on first or last rank
        return "error"
    }

    up = 1 - (rank % 2) * 2 // Up or down a rank depending on color
    onStartingRank = ((x + 3*(rank)) % 8 === 1) // Checks if on starting rank depending on color

    // Pawn pushes
    if (!game.board[x + up][y]) { // If square ahead is empty
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

    let knightsquares = knightjumps();

    for (let sq of knightsquares) {
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
        let csq = [x + sq[0], y + sq[1]]                                    // candidate square
        while ((game.board[csq[0]][csq[1]]) == undefined /* if candidate square is empty */ || (game.board[csq[0]][csq[1]].rank + rank) % 2 === 1 /* if piece of opposite color */ ) {
            legals.push([csq[0],csq[1]]);                                   // push to legals
            if(game.board[csq[0]][csq[1]]) {                                // if candidate square is not empty (contains an opposite color piece), stop.
                break;
            }
            csq = [csq[0] + sq[0],csq[1] + sq[1]];                          // keep moving in the same direction until a piece or edge of board is found
            if(!(csq[0] in boardrange) || !(csq[1] in boardrange)){         //If out of board range 
                break;
            }
        }
    }
    return legals;
}

/* Helpers */

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
    } else if (rank == 50 || rank == 51) {
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
game.display();
