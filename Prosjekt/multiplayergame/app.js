const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: { //Adds blocked spaces to certain places in the map, places that either have objects in them or places that you visually are not supposed to be able to walk over
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

//Misc Helpers
function randomFromArray(array) { //spawner i random steder, og 
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) { //transforms x and y into something like: check line (7 to 18)
  return `${x}x${y}`;
}

function createName() { //Here we have an array for both prefix and animal name for random character name. One word gets chosen at random from prefx and animal and they get put together
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`; // We get back the random name we got from the array where prefix word is first and the animal is second
}

function isSolid(x,y) {

  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)]; //This is for the blocked spaces in the map, and it looks up a key string using x, y (that is in line 29)
  return ( // Checks if the space is okay to step on in the map
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  //These are all safe locations to spawn on in the map, in other words no objects/blocked spaces on any of the coordinates from the array in the map
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}


(function () {

  let playerId; // This is the string of who we are logged in as in firebase
  let playerRef; // Our firebase reference so we can interact with data in the database site
  let players = {}; //Local list of the players in the game, where it will be x and y values
  let playerElements = {}; //List of references to our DOM elements
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");


  function placeCoin() {
    const { x, y } = getRandomSafeSpot(); // Places coins in safe spots that are not blocked and have no objects on them
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`); // Creating a reference in the firebase
    coinRef.set({ //adds coin reference to firebase
      x,
      y,
    })

    const coinTimeouts = [2000, 3000, 4000, 5000]; //makes a break between each time it places a coin in the map
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts)); // Randomly chooses from the array in coinTimeouts from 2, 3, 4, or 5 seconds
  }

  function attemptGrabCoin(x, y) { //Basically going to check when a player moves if there is a coin present, if yes then will update the player's score and remove the coin from the data, line 169
    const key = getKeyString(x, y);
    if (coins[key]) {
      firebase.database().ref(`coins/${key}`).remove(); // Remove this key from data, then uptick Player's coin count
      playerRef.update({
        coins: players[playerId].coins + 1,
      })
    }
  }


  function handleArrowPress(xChange=0, yChange=0) {
    const newX = players[playerId].x + xChange; // New x's position for our character is what our current x location is, plus the change in x
    const newY = players[playerId].y + yChange; // Same as line 156, except this is for y instead of x
    if (!isSolid(newX, newY)) { //("isSolid" function in line 73). If the space that we're moving to is !isSolid (not solid), then run the codes beneath
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) { // If your x changed position has increased by 1, then change your character's direction to be facing the right side
        players[playerId].direction = "right";
      }
      if (xChange === -1) { // If your x changed position has decreased by 1, then change your character's direction to be facing the left side
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]); //Notify firebase of the change 
      attemptGrabCoin(newX, newY);
    }
  }

  function initGame() {
    // Makes you able to move your character
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1)) // 0, -1 it has gone up in the grid
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1)) // 0, 1 gone down
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0)) // -1, 0 left
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0)) // 1, 0 right 

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

    allPlayersRef.on("value", (snapshot) => {
      //Fires whenever a change occurs, so whenever someone leaves or theres a change in color or name to a player or a player position, this code fires
      players = snapshot.val() || {}; // If I would delete a character in firebase, then the value would turn into NULL, so I'm going to change that with a blank object using this line (185)
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        // Now update the DOM
        el.querySelector(".Character_name").innerText = characterState.name; //Other players names
        el.querySelector(".Character_coins").innerText = characterState.coins; //Other players' Coins count
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px"; //Gridsize multiplied by other characters' x position and then adding the string pixel
        const top = 16 * characterState.y - 4 + "px"; //Same thing for line 194, except the -4 is to make the character in the middle of the cell appearence wise
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      })
    })
    allPlayersRef.on("child_added", (snapshot) => {
      //Fires whenever a new node (player) is added the tree
      const addedPlayer = snapshot.val(); // Gets the added players using snapshot value
      const characterElement = document.createElement("div"); 
      characterElement.classList.add("Character", "grid-cell"); // Makes classes for the line 202
      if (addedPlayer.id === playerId) { //If the characterid that's being added is your id then add a "you" class 
        characterElement.classList.add("you"); 
      }
      // Character shadow and sprite (character color) + chracter name container that includes both character name and how many coins he has devoured. And then a small arrow on top of your character that shows that it's you
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div> 
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;

      //Fill in some initial state
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name; //Your player name
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins; //Your Coin count
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px"; //Gridsize multiplied by your character's x position and then adding the string pixel
      const top = 16 * addedPlayer.y - 4 + "px"; //Same thing for line 224, except the -4 is to make the character in the middle of the cell appearence wise
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    })


    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    })


    
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });
    //

    allCoinsRef.on("child_added", (snapshot) => { //When a coin enters the map
      const coin = snapshot.val(); // Grab the coin that was created using snapshot.val
      const key = getKeyString(coin.x, coin.y); // We take the x and y of the coin and make a string key 
      coins[key] = true; // update where our coins are in local definition

      // Create the DOM Element
      const coinElement = document.createElement("div"); //creating a new div, which is for the coin
      coinElement.classList.add("Coin", "grid-cell"); //adding some classes such as coin and grid-cell to give it the right spacing
      //The coin is going to have a shadow and a sprite
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element, same as we did for the character.
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement; //keep track of the coins in our coinElement object, that way we have a clear referense to it so that we can remove it whenever someone collects it
      gameContainer.appendChild(coinElement);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y); 
      gameContainer.removeChild( coinElements[keyToRemove] );
      delete coinElements[keyToRemove];
    })


    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName(); // When someone changes his name in the name box, it will give him that new name and it will appear on his character. BUT if someone keeps the box empty, in that case it will re-give him a random name from the array above with the createName function
      playerNameInput.value = newName; //Syncs the name that is randomly chosen from the array with the name that appears on the character
      playerRef.update({
        name: newName
      })
    })

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color); // Find what my current color is, and set our self to the next one
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0]; // Changes to next color in the array, but if that color doesn't exist then go back to the first color in the array 
      playerRef.update({
        color: nextColor
      })
    })

    //Place my first coin because in the function placecoin above it won't actually spawn a first coin
    placeCoin();

  }

  firebase.auth().onAuthStateChanged((user) => { 
    console.log(user)
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`); // This is going to refer to the player's unique id (uid)

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();


      playerRef.set({
        id: playerId,
        name,
        direction: "right", // Hvor spillerens karakter skal se på, altså hvilken direction, og jeg bruker høyre for dette
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
      })

      //Remove me from Firebase when I diconnect instead of keeping my shadow character in the game forever
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  })

  firebase.auth().signInAnonymously().catch((error) => { //signerer deg inn anonymt, og hvis noen error skjer så kommer en vennlig melding at det har skjedd noe feil
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
    console.log(errorCode, errorMessage);
  });


})();
