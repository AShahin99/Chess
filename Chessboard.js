// Function to create Board: an 8x8 array
function Board(){
    let board = new Array(8);
    for(let i = 0; i < 8; i++){
        board[i] = new Array(8).fill(null);
    }
    return board;
}

// Define starting rank piece order
let order = ["R","Kn","B","Q","K","B","Kn","R","P"];

// Piece constructor
function Piece(rank, position, color){
    this.rank = rank;
    this.position = position;
    this.color = color;
}

// Setting pieces on the board
function Arrange(board){
    for(let i = 0; i<8; i++){
        for(let j = 0; j<8; j++){
            if (i == 0){
                board[i][j] = new Piece(order[j], [[i],[j]], "W");
            } else if (i == 1){
                board[i][j] = new Piece(order[8], [[i],[j]], "W");
            } else if (i == 6){
                board[i][j] = new Piece(order[8], [[i],[j]], "B");
            } else if (i == 7){
                board[i][j] = new Piece(order[j], [[i],[j]], "B");
            }
        }
    }
    return board;
}

// Initialize new Board and arrange the pieces
chessboard = new Board();
Arrange(chessboard);

// Flipping baord to print from white's perspective 
function flipped (board) {
    fboard = new Board()
    for(let i =0; i<8; i++){
        for (let j = 0; j<8; j++){
            fboard[7-i][j] = board[i][j]
        }
    }
    return fboard    
}

console.log(chessboard);