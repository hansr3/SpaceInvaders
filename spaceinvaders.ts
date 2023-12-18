import {interval, fromEvent, from, merge, TimeInterval, Observable} from 'rxjs'
import { map, scan, filter, take, concat, takeUntil, mergeMap, timeInterval} from 'rxjs/operators'
import { createArrayBindingPattern, createParameter, createTextChangeRange, flattenDiagnosticMessageText, NumericLiteral } from 'typescript';


//   type Key and Event used to determine which event is being triggered and
//   key determines which key from the keyboard to be pressed (used with keyboard event)
//   in order for a code to be executed
type Key = 'ArrowLeft' | 'ArrowRight' | 'Space' | 'KeyS' | 'ArrowUp';
type Event = 'keydown' | 'keyup';
function spaceinvaders() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  
    // asteroids example: https://tgdwyer.github.io/asteroids/
    // PiApproximationFRPSolution Video: https://www.youtube.com/watch?v=RD9v9XHA4x4

    //initial set up
    //Constant values for initialset up, boundary and stats
    //Set as constants so that properties inside wont be mutable
    const Constants = {
      CanvasSize: 600,
      BulletExpirationTime: 1000,
      BulletRadius: 3,
      BulletVelocity: 10,
      startAlienRadius: 20,
      startObject: 55,  
      startShield: 4,
      startAliens: 55,
      startOctopusCount: 22,
      startCrabCount: 22,
      startSquidCount: 11,
      StartTime: 0,
      StartScore: 0,
      OctopusScore: 10,
      CrabScore: 20,
      SquidScore: 30,
      AlienAtkSpd: 1000,
      Bottom: 500,
      AlienStartVel: 0.3
    } as const
    
    //State type similar from the one in asteroids example
    //this keeps track on the state of the game
    //State is declares as type since we need it for returns and argument pass
    //The properties represents all the object in the game and the time since the game started
    //They keep track of the states of the objects, whether they are destroyed or not,
    //their number, whether they still exist in the game or not and whether the game ends or not
    type State = Readonly<{
      time:number
      ship:Body,
      bullets:ReadonlyArray<Body>,
      alienBullets: ReadonlyArray<Body>,
      exit: ReadonlyArray<Body>,
      objCount:number,
      aliens: number,
      gameOver: boolean,
      octopus: ReadonlyArray<Body>,
      crab: ReadonlyArray<Body>,
      squid: ReadonlyArray<Body>
    }>
    // type Circle: 
    //  -used for object hitbox
    //   similar to the one in asteroids example
    //  -objects declared with this type will have round hitbox
    //  -required as an argument in create circle
    //  -declared as type so that creating the hitbox would be simpler and more efficient
    //  since we have to return as a whole Body type when creating a new object or simply updating it
    //  -making Circle a type means that it is reusable and we do not have to pass in a value pair 
    //  of vector position and radius   
    type Circle = Readonly<{pos:Vec, radius:number}>

    // type ObjectId:
    //  -Keeps track of the id of the objects and the time they were created
    //   similar to the one in asteroids example
    //  -Same reason as type circle, declared as type to make it simpler and efficient
    //  when returning or passed as argument
    //  ObjectId type contains ReadOnly data of id:string and the time an object is created in number
    type ObjectId = Readonly<{id:string, createTime:number}> 

    //  -IBody holds data that are necessary when creating an object
    //   similar to the one in asteroids example
    //  -This extends type Circle and ObjectId since we need both data types 
    //   to represent the the size and position of the objects hitbox
    //   and its id and the time it was created
    //  -Declared as an interface to represents the traits of an object
    //   which is reusable, this means that we can use it to create other
    //   that is not of type Body without having to reinitialize all the object traits
    //  -type and interface may be similar, but interface is chosen because we want to 
    //   store the traits(properties) of the objects and not make them into a data type
    //   that are used for computation
    //  -This is also chosen so that we can initialize more types to create an object
    //   without having to reinitialize all the properties
    interface IBody extends Circle, ObjectId{
      viewType: ViewType,
      vel: Vec,
      acc: Vec,
      angle: number,
      rotation: number,
      torque: number
    }

    // type Body, ViewType, Key and Event:
    //  -Similar to the one in asteroids example
    //  -type Body is the type used when declaring a game object
    //  -interface cannot be instanciated or used directly,
    //   so either a type or class that implements the interface is needed
    //  -A class would be good to implement interface for creating an object
    //   since variables are immutable returning a new instance of class 
    //   will not be efficient and properties of objects cannot be tracked easily
    //   since instanciating a new instance of a class means that that data of each properties 
    //   would be different and new
    //   usually a use of class means thats we are mutating the properties of the object
    //   Hence type is used to implement the interface

    //  -type ViewType is used to connect the view(image view on the canvas(render)) to each objects in the game
    //  -A string that use as the id of objects
    type Body = Readonly<IBody>
    type ViewType = 'ship' | 'octopus' | 'crab' |
                     'squid' | 'bullet' | 'alienBullet'
    

    //classes and its declarations
    //Shoot class from asteroids example
    // -Since if else statement is imperative and not to be used
    //  classes are declared to be instantiated by a an code action
    //  that uses event 
    class Shoot { constructor() {}}
    class MoveRight{ constructor(public readonly on:boolean) {}}
    class MoveLeft{ constructor(public readonly on:boolean) {}}
    class OctopusShoot{ constructor() {}}
    class CrabShoot { constructor() {}}
    class SquidShoot { constructor() {}}

    //Tick class derived from asteroids example
    // This keep tracks of the time in the game
    class Tick{ constructor(public readonly elapsed:number){}}
 
    
    //Vector class Derived from asteroids example
    //  Vector class is used to make calculations of x and y for velocity and
    //  positions efficient
    //  this makes it easy to make x and y as one data
    class Vec{
      constructor(public readonly x:number = 0, public readonly y: number = 0){}
      add = (b:Vec) => new Vec(this.x + b.x, this.y + b.y)
      sub = (b:Vec) => this.add(b.scale(-1))
      len = () => Math.sqrt(this.x*this.x + this.y*this.y)
      scale = (s:number) => new Vec(this.x*s,this.y*s)
      ortho = () => new Vec(this.y,-this.x)
      rotate = (deg:number) =>
                (rad =>(
                  (cos,sin,{x,y})=>new Vec(x*cos - y*sin, x*sin + y*cos)
                )(Math.cos(rad), Math.sin(rad), this)
                )(Math.PI * deg / 180)
      static unitVecInDirection = (deg: number) => new Vec(0,-1).rotate(deg)
      static Zero = new Vec();              
    }

    //flatmap derived from asteroids example
    /**
    * apply f to every element of a and return the result in a flat array
    * @param a an array
    * @param f a function that produces an array
    */
    function flatMap<T,U>(
    a:ReadonlyArray<T>,
    f:(a:T)=>ReadonlyArray<U>
    ): ReadonlyArray<U> {
    return Array.prototype.concat(...a.map(f));
    }

    //except derived from the asteroids example
    /**
    * array a except anything in b
    * @param eq equality test function for two Ts
    * @param a array to be filtered
    * @param b array of elements to be filtered out of a
    */ 
    const except = <T>(eq: (_:T)=>(_:T)=>boolean)=>
    (a:ReadonlyArray<T>)=> 
      (b:ReadonlyArray<T>)=> a.filter(not(elem(eq)(b))),

    //not function derived from the asteroids example
    /**
    * Composable not: invert boolean result of given function
    * @param f a function returning boolean
    * @param x the value that will be tested with f
    */
    not = <T>(f:(x:T)=>boolean)=> (x:T)=> !f(x),

    /**
    * is e an element of a using the eq function to test equality?
    * @param eq equality test function for two Ts
    * @param a an array that will be searched
    * @param e an element to search a for
    */
    elem = <T>(eq: (_:T)=>(_:T)=>boolean)=> 
    (a:ReadonlyArray<T>)=> 
      (e:T)=> a.findIndex(eq(e)) >= 0,

    //attr derived from the asteroids example
    /**
    * set a number of attributes on an Element at once
    * @param e the Element
    * @param o a property bag
    */         
    attr = (e:Element,o:Object) =>
      { for(const k in o) e.setAttribute(k,String(o[k])) }
    
    // isNotNullOrUndefined derived from the asteroids example
    function isNotNullOrUndefined<T extends Object>(input: null | undefined | T): input is T {
      return input != null;
    }
    
    // get random number with specified range
    // using RNG class from piApproximation discussed in the video
    // returns a single random number with range 0 to max - 1
    // generated using the seed
    // this function is pure since the same seed and max will return the same value
    /**
     * 
     * @param max the max value the function is allowed to generate
     * @param seed a value passed into the function used to generate random value
     * @returns a random value of maximum value max generated using seed
     */
   function getRandNum(max:number, seed:number){
      //a simple, seedable, pseudo-random number generator
      class RNG{
        // LCG using GCC's constants
        readonly m = 0x80000000// 2**31
        readonly a = 1103515245
        readonly c = 12345
        constructor(readonly state) {}
        int() {
          return(this.a * this.state + this.c) % this.m;
        }
        float() {
          // returns in range[0,1]
          return this.int() / (this.m - 1);
        }
        next() {
          return new RNG(this.int())
        } 
      }
     return Math.floor(new RNG(seed).float() * max)

    }
    
    // createCircle derived from the asteroids example
    // creates a game object with round hitbox
    // returns the whole object properties of type readonly
    // hence immutable
    // this means we do not have to worry that we mutate any properties of the game object
    // we can use this to create any game object that uses round hitbox
    // only the Id is needed to distinguish which object is which
    // hence we do not have to create a function for each type of object
    // reusable to create all the game objects
    /**
     * @param viewType the id of the game object that connects it to the view
     * @param OId the unique identifier of the game object of type ObjectId
     * @param circ used to determine the size of the hitbox of type Circle
     * @param vel the velocity of the game object of type Vec from the class Vec
     * @returns a game object with complete properties of type Body
     */
    const createCircle = (viewType: ViewType) => (oId:ObjectId) => (circ:Circle) => (vel:Vec) =>
      <Body>{
        ...oId,
        ...circ,
        vel:vel,
        acc:Vec.Zero,
        angle:0,
        rotation:0,
        torque:0,
        id: viewType + oId.id,
        viewType: viewType
      },
      
      // uses createCircle to declare non playable characters game objects
      createOctopus = createCircle('octopus'),
      createCrab = createCircle('crab'),
      createSquid = createCircle('squid'),
      createBullet = createCircle('bullet'),
      createAlienBullet = createCircle('alienBullet')
    
    // createShip similar to asteroids example
    // returns a ship object playable by player of type body
    function createShip():Body{
      return{
        id: 'ship',
        viewType: 'ship',
        pos: new Vec(Constants.CanvasSize/2, Constants.CanvasSize-100),
        vel: Vec.Zero,
        acc: Vec.Zero,
        angle: 0,
        rotation: 0,
        torque: 0,
        radius: 20,
        createTime: 0
      }
    } 

    //game initial state (position)
    //Initializes the initial position of the aliens
    const 
        //initialize the positions of each Octopus, Crabs and Squid aliens
        //in an array
        initialOctopusPos = [...Array(Constants.startOctopusCount)]
          .map((_, i)=> i == 0? new Vec(50,300) : 
          i > 10? new Vec(50 + (i-11)*50, 250):
          new Vec(50 + i*50, 300)),

        initialCrabPos = [...Array(Constants.startCrabCount)]
          .map((_, i)=>i == 0? new Vec(50,200): 
          i > 10? new Vec(50 + (i-11)*50, 150):
          new Vec(50+i*50, 200)),

        initialSquidPos = [...Array(Constants.startSquidCount)]
          .map((_, i)=> i == 0? new Vec(50,100): 
          new Vec(50 + i*50, 100)),
        
        //Create each alien object (Octopus, Crab and Squid) using the array of positions initialized before
        //Initializing each alien objects using CreateOctopus, CreateCrab and CreateSquid
        startOctopus = [...Array(Constants.startOctopusCount)]
          .map((_,i)=>createOctopus({id:String(i),createTime:Constants.StartTime})
                                ({pos:initialOctopusPos[i], radius: Constants.startAlienRadius})
                                (new Vec(Constants.AlienStartVel,0))
        ), 
        startCrab = [...Array(Constants.startCrabCount)]
          .map((_,i)=>createCrab({id:String(i),createTime:Constants.StartTime})
                              ({pos:initialCrabPos[i], radius: Constants.startAlienRadius})
                              (new Vec(Constants.AlienStartVel,0))
        ), 
        startSquid = [...Array(Constants.startSquidCount)]
          .map((_,i)=>createSquid({id:String(i),createTime:Constants.StartTime})
                              ({pos:initialSquidPos[i], radius: Constants.startAlienRadius})
                              (new Vec(Constants.AlienStartVel,0))
        ),

        //Declaring initialState of the game of type State 
        //Properties are immutable (readonly)
        initialState: State = {
          time: 0,
          ship: createShip(),
          bullets: [],
          alienBullets: [],
          octopus: startOctopus,
          crab: startCrab,
          squid: startSquid,
          aliens: Constants.startAliens,
          exit: [],
          objCount: Constants.startObject,
          gameOver: false
        },
      
      //rectBound used to determine the canvas boundaries
      //This keeps the object from traveling more than the x and y points of the canvas
      // by returning a new Vec instance that was calculated from the param no outside object properties are mutated (pure)
      /**
       * @param {x,y}:Vec the position of the object
       * @param v value of either x or y from pos:Vec of the game objects
       * @returns a new position of type Vec of the game object
       */
      rectBound = ({x,y}:Vec) => {
        const bound = (v:number) =>
          v < 20? v = 20 : v > Constants.CanvasSize - 20? v = Constants.CanvasSize - 20 : v;
        return new Vec(bound(x),bound(y)) 
      };
      
    //keyObservable from asteroids example
    // used to keep track if a key is pressed from the keyboard
    // using keyboard event
    // if a key is pressed, a new class object is instanciated 
    // to determine which action to be executed later in the code
    // using a stream of keyboard events that is filtered to determined whether the
    // has been pressed since imperative are not allowed to be used
    /**
     * @param e of type Event which determines what event is currently happening
     * @param k of type Key which determines which key is being pressed in the keyboard
     * @param result the class to be instanciated
     * @returns an Observable containing the instanciated action class
     */
    const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document,e).pipe(
        filter(({code})=> code === k), 
        filter(({repeat})=>!repeat),
        map(result)),
      
      // keeps track using interval() of game object
      // to execute a certain code
      // used by the aliens to shoot bullets
      /**
       * @param time the time interval at which the game object has to execute an action
       * @param result the action class that is to be instanciated
       * @returns an Observable containing the instanciated action class that is mapped to the event
       */
      autoObservable = <T>(time: number, result:()=>T)=>
        interval(time).pipe(map(result)),

    //gameClock derived from the asteroids example 
    //Computes the time in the game
      gameClock = interval(10)
      .pipe(map(elapsed=>new Tick(elapsed)));

      //moveObj derived from the asteroids example
      //handles all movement of objects
      // uses rectBound() to determine the position at which
      // the game objects are allowed to be placed
      // returns a new game object properties of type Body to keep the function pure
      // (not mutating other variables)
      /**
       * 
       * @param o of type Body the object which movement is to be processed
       * @returns a new Body type game object properties with new vel and pos of type Vec
       */
      const moveObj = (o:Body) => <Body>{
        ...o,
        pos: rectBound(o.pos.add(o.vel)),
        vel: o.vel.add(o.acc)
      }

      //handleCollisions derived from the asteroids example
      //handles the collisions for all objects such as:
      //  the ship bullets and aliens
      //  alien bullets and the ship
      //  alien reaching the bottom
      /**
       * 
       * @param s the game state of type State
       * @returns a new game state of type State
       */
      const handleCollisions = (s:State) => {
        const
          //a function used to determine if two bodies have collided
          //done by calculating their distances
          //if less than their total radius, they have collided
          bodiesCollided = ([a,b]:[Body,Body]) => a.pos.sub(b.pos).len() < a.radius + b.radius,

          //filter from all the alien bullets that have collided with the ship and store it in a new array
          //if the length of the new array is more than 0 that means the ship has collided with at least one alien bullet
          shipCollided = s.alienBullets.filter(r=>bodiesCollided([s.ship,r])).length > 0,

          //filter all the aliens that has reached a certain position in the canvas(Bottom)
          //and store it in a new array
          octReachedDown = s.octopus.filter(a=>a.pos.y - Constants.Bottom >= 0),
          crabReachedDown = s.crab.filter(a=>a.pos.y - Constants.Bottom >= 0),
          squidReachedDown = s.squid.filter(a=>a.pos.y - Constants.Bottom >= 0),
          aliensReachedDown = octReachedDown.concat(crabReachedDown, squidReachedDown),

          //store all the bullets and aliens into a pair data [a,b]
          bulletsAndOctopus = flatMap(s.bullets, b=> s.octopus.map<[Body,Body]>(r=>([b,r]))),
          bulletsAndCrab = flatMap(s.bullets, b=> s.crab.map<[Body,Body]>(r=>([b,r]))),
          bulletsAndSquid = flatMap(s.bullets, b=> s.squid.map<[Body,Body]>(r=>([b,r]))),
          
          //store all the aliens that have collided with the bullets in one array
          collidedBulletsAndOctopus = bulletsAndOctopus.filter(bodiesCollided),
          collidedBulletsAndCrab = bulletsAndCrab.filter(bodiesCollided),
          collidedBulletsAndSquid = bulletsAndSquid.filter(bodiesCollided),
          collidedBulletsAndAliens = collidedBulletsAndOctopus.concat(collidedBulletsAndCrab, collidedBulletsAndSquid),

          //seperate each type of bullets, octopus, crab and squid into different arrays
          collidedBullets = collidedBulletsAndAliens.map(([bullet,_])=>bullet),
          collidedOctopus = collidedBulletsAndOctopus.map(([_,aliens])=>aliens),
          collidedCrab = collidedBulletsAndCrab.map(([_,aliens])=>aliens),
          collidedSquid = collidedBulletsAndSquid.map(([_,aliens])=>aliens),

          //function cut remove all the bodies from an array based on id
          cut = except((a:Body)=>(b:Body)=>a.id===b.id)

          return <State>{
            ...s,
            bullets: cut(s.bullets)(collidedBullets),
            octopus: cut(s.octopus)(collidedOctopus),
            crab: cut(s.crab)(collidedCrab),
            squid: cut(s.squid)(collidedSquid),
            exit: s.exit.concat(collidedBullets,collidedOctopus, collidedCrab, collidedSquid),
            objCount: s.objCount - collidedOctopus.length - collidedCrab.length - collidedSquid.length ,
            gameOver: shipCollided == true || aliensReachedDown.length > 0? true:false 
          }
          

      }

      //player's controll hotkeys
      // determines what action to do when a certain event is happening
      const 
        shoot = keyObservable('keydown', 'Space', ()=> new Shoot()),
        startRight = keyObservable('keydown', 'ArrowRight', ()=>new MoveRight(true)),
        startLeft = keyObservable('keydown', 'ArrowLeft', ()=>new MoveLeft(true)),
        stopRight = keyObservable('keyup', 'ArrowRight', ()=>new MoveRight(false)),
        stopLeft = keyObservable('keyup', 'ArrowLeft', ()=>new MoveLeft(false)),
        octopusShooting = autoObservable(1000,()=>new OctopusShoot()),
        crabShooting = autoObservable(2737,()=>new CrabShoot),
        squidShooting = autoObservable(3377,()=>new SquidShoot)

      //TICK
      //tick function derived from asteroids example
      //handles each game object on what to do at a certain tick of the game time
      /**
       * 
       * @param s of type State the game state
       * @param elapsed the time which shows for how long the game has started
       * @returns a new game state which collisions has been processed of type State
       */
      const tick = (s:State, elapsed:number) =>{
        //filters all alienBullets and Bullets that still exist and do not exist in the game
        const
          expired = (b:Body)=>(elapsed - b.createTime) > 100,         //game object is labled as expired if it has exist in the game for more than 100 ms

          //Expired alienBullets and Bullets are filtered into a new array of type Body to indicate which bullet are still active or expired
          expiredBullets:Body[] = s.bullets.filter(expired),          
          activeBullets = s.bullets.filter(not(expired)),
          expiredAlienBullets: Body[] = s.alienBullets.filter(expired),
          activeAlienBullet:Body[] = s.alienBullets.filter(not(expired)),

          //alienDir determins the direction of the aliens
          //whether it should go right or left
          //determines when to shift down too
          //takes in a game object of type body as an argument
          //checks the position of the game object:
          //  if it is at the edge of the canvas of x axis
          //  shift down and change the direction of its movement to the opposite direction
          alienDir = (o:Body) =><Body>{...o,
            pos: o.pos.x == Constants.CanvasSize-20 || o.pos.x == 20? o.pos.add(new Vec(0,50)):o.pos,
            vel: o.pos.x == Constants.CanvasSize-20? new Vec(-Constants.AlienStartVel,0): o.pos.x == 20?new Vec(Constants.AlienStartVel, 0):o.vel
          }

        return handleCollisions({
          ...s,
          ship:moveObj(s.ship), 
          bullets:activeBullets.map(moveObj), 
          alienBullets: activeAlienBullet.map(moveObj), 
          octopus: s.octopus.map(alienDir).map(moveObj) ,
          crab: s.crab.map(alienDir).map(moveObj),
          squid: s.squid.map(alienDir).map(moveObj),
          exit:expiredBullets.concat(expiredAlienBullets),
          time:elapsed
        })
      }

      //reduce state derived from the asteroids example
      //handles events and link them to their appropriate action(code)
      //since if else is considered imperative we use ternary operators
      //to check if an event is an instance of a certain code action
      //these events are triggered by either time interval or key pressed(KeyboardEvent)
      //which is checked in line 131 to 136 of the code
      /**
       * 
       * @param s current game state of type State
       * @param e instance of the action code
       * @returns a new game state of type State
       */ 
      const 
        reduceState = (s:State, e:MoveRight|MoveLeft|Tick|Shoot)=>
        //if the event is an instance of MoveRight (ship moving right ArrowRight key pressed)
        //returns a new state with a new property of the ship moving
        //in the right direction
        e instanceof MoveRight? {...s,
        ship: {...s.ship, acc:Vec.Zero, vel:e.on? new Vec(10,0): Vec.Zero} 
        }:

        //if the event is an instance of MoveRight (ship moving right by ArrowLeft key pressed)
        //returns a new state with a new property of the ship moving
        //in the right direction
        e instanceof MoveLeft? {...s,
          ship: {...s.ship, acc:Vec.Zero, vel:e.on? new Vec(-10,0): Vec.Zero}
        }:

        //if the event is an instance of Shoot (ship shooting bullets by Space key pressed)
        //create bullets spawning at the tip of the ship with their velocity calculated 
        //and store them in the bullets array from the game state
        e instanceof Shoot? {...s,
          bullets: s.bullets.concat([
            ((unitVec:Vec)=>
            createBullet({id:String(s.objCount),createTime:s.time})
              ({radius:Constants.BulletRadius,pos:s.ship.pos.add(unitVec.scale(s.ship.radius))})
              (s.ship.vel.add(unitVec.scale(Constants.BulletVelocity)))
           )(Vec.unitVecInDirection(360))  //determines the bullet direction
          ]),
          objCount: s.objCount + 1
        } :

        //if the event is an instance of OctopusShoot, CrabShoot, SquidShoot(alien shooting bullets triggered by time interval)
        //and they still exist in the game
        //create alien bullets spawning at the bottom of the aliens with their velocity calculated
        //and store them in the alienBullets array from the game state
        //function getRandNum is used to randomised the aliens that shoot
        //the time in the game state is passed as seed to generate the random numbers
        e instanceof OctopusShoot && s.octopus.length > 0 ? 
        {...s,
          alienBullets: s.alienBullets.concat([
            ((unitVec:Vec)=>
            createAlienBullet({id:String(s.objCount),createTime:s.time})
              ({radius:Constants.BulletRadius,pos:s.octopus[getRandNum(s.octopus.length, s.time)].pos.add(unitVec.scale(s.octopus[getRandNum(s.octopus.length,s.time)].radius))})
              (s.octopus[getRandNum(s.octopus.length, s.time)].vel.add(unitVec.scale(Constants.BulletVelocity)))
           )(Vec.unitVecInDirection(180))  //determines the bullet direction
          ]),
          objCount: s.objCount + 1
        }:
        e instanceof CrabShoot && s.crab.length > 0 ? 
        {...s,
          alienBullets: s.alienBullets.concat([
            ((unitVec:Vec)=>
            createAlienBullet({id:String(s.objCount),createTime:s.time})
              ({radius:Constants.BulletRadius,pos:s.crab[getRandNum(s.crab.length, Math.floor(s.time/2))].pos.add(unitVec.scale(s.crab[getRandNum(s.crab.length, Math.floor(s.time/2))].radius))})
              (s.crab[getRandNum(s.crab.length,  Math.floor(s.time/2))].vel.add(unitVec.scale(Constants.BulletVelocity)))
           )(Vec.unitVecInDirection(180))  //determines the bullet direction
          ]),
          objCount: s.objCount + 1
        }:
        e instanceof SquidShoot && s.squid.length > 0 ? 
        {...s,
          alienBullets: s.alienBullets.concat([
            ((unitVec:Vec)=>
            createAlienBullet({id:String(s.objCount),createTime:s.time})
              ({radius:Constants.BulletRadius,pos:s.squid[getRandNum(s.squid.length, Math.floor(s.time/7))].pos.add(unitVec.scale(s.squid[getRandNum(s.squid.length, Math.floor(s.time/2))].radius))})
              (s.squid[getRandNum(s.squid.length,  Math.floor(s.time/2))].vel.add(unitVec.scale(Constants.BulletVelocity)))
           )(Vec.unitVecInDirection(180))  //determines the bullet direction
          ]),
          objCount: s.objCount + 1
        }
        //passed in all the new states and time elapsed into the tick function
        : tick(s,e.elapsed)
        
        

      // main game stream
      const subscription =
        merge(gameClock,
          startLeft,startRight,
          stopLeft,stopRight,
          shoot,octopusShooting,
          crabShooting, squidShooting)
        .pipe(
          scan(reduceState, initialState))
        .subscribe(updateView)
      
    // //function to remove default settings on the webPage (scroll to the bottom page when space is pressed)
    // function removeDef() {
    //   event
    // }
    //updateView derived from the asteroids example
    //updates the view in the canvas (of the game)
    //this is the only function in which it is impure,
    //since we need to update game objects and states 
    //update elements in HTML too
    //this function does not return anything
    //instead it updates game objects and state inside
    //the function
    /**
     * 
     * @param s current game state
     */
    function updateView(s: State) {
      const
      //get reference of the ship and canvas from the HTML
        svg = document.getElementById("canvas")!,
        ship = document.getElementById("ship"),
        
        //removing default behaviour of the page (in this case scroll down on Space Keydown)
        
        //function to update each game object in the game
        //if the object exist in the games already, only 
        //the attributes are updated
        //otherwise create a new body of that object
        //to make it visible in the view
        //the viewType of each objects links to the style.css
        //which handles the appearance of the objects on the screen
        updateBodyView = (b:Body) => {
          function createBodyView() {
            const v = document.createElementNS(svg.namespaceURI, "ellipse")!;
            attr(v,{id:b.id,rx:b.radius});
            v.classList.add(b.viewType)
            svg.appendChild(v)
            return v
          }
          const v = document.getElementById(b.id) || createBodyView();
          attr(v,{cx:b.pos.x,cy:b.pos.y});
        };
      //assign an updated attributes of the ship which position is calculated by the function
      //moveObj()
      attr(ship,{transform:`translate(${s.ship.pos.x},${s.ship.pos.y}) rotate(${s.ship.angle})`});
      
      //update all the views of the game objects if it already existed in the game
      //otherwise create that view
      s.bullets.forEach(updateBodyView);
      s.alienBullets.forEach(updateBodyView)
      s.octopus.forEach(updateBodyView);
      s.crab.forEach(updateBodyView);
      s.squid.forEach(updateBodyView);

      //handles the scoring that players can get from shooting aliens
      //score is calculated by adding all the multiplication of each alien score and how many
      //aliens have been destroyed
      const currScore = Constants.OctopusScore * (Constants.startOctopusCount-s.octopus.length) + 
        Constants.CrabScore * (Constants.startCrabCount-s.crab.length) +
        Constants.SquidScore * (Constants.startSquidCount-s.squid.length)
      const t = document.createElementNS(svg.namespaceURI,"text")!;       //create a text view in the canvas
      attr(t,{x:20, y:50,class:"score", id:"scr"});                       //set its attribute{id, position, class}
      svg.appendChild(t)                                                  //append it to the canvas
      document.getElementById("scr").innerHTML = `SCORE: ${currScore}`    //update the score view in the canvas with the current score stored in currScore
      
      //remove all the views of the objects that are stored in exit array (that has been destroyed in game)
      s.exit.map(o=>document.getElementById(o.id))
            .filter(isNotNullOrUndefined)
            .forEach(v=>{
              try {
                svg.removeChild(v)
              } catch(e) {
                // rarely it can happen that a bullet can be in exit 
                // for both expiring and colliding in the same tick,
                // which will cause this exception
                console.log("Already removed: "+v.id)
              }
            })

      //if gameOver state is true
      //unsubscribe any subscribtion
      //and put out a "Game Over" writting on the canvas
      //and stops the game
      if(s.gameOver) {
        subscription.unsubscribe();
        const v = document.createElementNS(svg.namespaceURI, "text")!;
        attr(v,{x:Constants.CanvasSize/6,y:Constants.CanvasSize/2,class:"gameover"});
        v.textContent = "Game Over";
        svg.appendChild(v);
      }
    } 
  }
  
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    /* window.onload = ()=>{
      spaceinvaders();
    } */
    setTimeout(spaceinvaders,0)

    //showKeys derived from asteroids example
    //used to highlight the keys on the screen when pressed
    function showKeys() {
      function showKey(k:Key) {
        const arrowKey = document.getElementById(k)!,
          o = (e:Event) => fromEvent<KeyboardEvent>(document,e).pipe(
            filter(({code})=>code === k))
        o('keydown').subscribe(e => arrowKey.classList.add("highlight"))
        o('keyup').subscribe(_=>arrowKey.classList.remove("highlight"))
      }
      showKey('ArrowLeft');
      showKey('ArrowRight');
      showKey('Space');
    }
    
    setTimeout(showKeys, 0)
  




