! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- gemstone class (Python 'gemstone' module)
expectvalue /Class
doit
module subclass: 'gemstone'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
gemstone comment:
'Python gemstone module.

Provides basic metadata about the Grail runtime and interoperability
with existing GemStone data and operations:

  * gemstone.system — the GemStone System class.  Transaction control
    goes through it: gemstone.system.commit() / gemstone.system.abort()
    (env-1 class-side methods on System, installed by System.gs).
  * gemstone.mySymbolList — a list of the session''s SymbolDictionary
    instances (GsCurrentSession currentSession symbolList).
  * gemstone[name] — namespace lookup via the subscript protocol.

Methods on this class are real env-1 fast-path methods, dispatched
directly via `gemstone.method(args)` Python calls compiled to
`((gemstone instance) method: args)` Smalltalk sends.  Value attributes
(system, mySymbolList, version) live in the Grail-Accessors category so
attribute reads perform them instead of wrapping a BoundMethod.
'
%

expectvalue /Class
doit
gemstone category: 'Grail-Modules'
%

! ===============================================================================
! gemstone Module (Python 'gemstone' module)
! ===============================================================================

! ------------------- Remove existing Python methods from gemstone
expectvalue /Metaclass3
doit
gemstone removeAllMethods: 1.
gemstone class removeAllMethods: 1.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: gemstone
initialize
	"No-op. The `module>>instance` class method still calls `initialize`
	on the newly-created instance, so this stub keeps that contract."
%

! ===============================================================================
! Subscript protocol — namespace access via gemstone[name]
! ===============================================================================

category: 'Grail-Subscript Protocol'
method: gemstone
__delitem__: key
	"Remove the object named key from UserGlobals. Raises KeyError if not found."

	| name |
	name := key @env0:asSymbol.
	(UserGlobals @env0:includesKey: name) ifFalse: [
		KeyError ___signal___: key
	].
	UserGlobals @env0:removeKey: name.
	^ None
%

category: 'Grail-Subscript Protocol'
method: gemstone
__getitem__: key
	"Return the object named key from the current session. Raises KeyError if not found."

	| name session result |
	name := key @env0:asSymbol.
	session := GsCurrentSession @env0:currentSession.
	result := session @env0:objectNamed: name.
	result ifNil: [
		KeyError ___signal___: key
	].
	^ result
%

category: 'Grail-Subscript Protocol'
method: gemstone
__setitem__: key _: value
	"Set the object named key in the current session. If an Association exists, update it; otherwise add to UserGlobals."

	| name session assoc |
	name := key @env0:asSymbol.
	session := GsCurrentSession @env0:currentSession.
	assoc := session @env0:resolveSymbol: name.
	assoc ifNotNil: [
		assoc @env0:value: value.
		^ None
	].
	UserGlobals @env0:at: name put: value.
	^ None
%

! ===============================================================================
! GemStone interoperability — value attributes
! ===============================================================================

category: 'Grail-Accessors'
method: gemstone
mySymbolList
	"Python gemstone.mySymbolList — a Python list of the current session's
	SymbolDictionary instances, from GsCurrentSession currentSession
	symbolList.  A fresh list is built per read so Python-side
	mutation of the list cannot disturb the session's real symbol list
	(the SymbolDictionary elements themselves are the live objects).

	Compiled in the Grail-Accessors category so a bare attribute read
	performs this method and returns the value (see ___pyAttrLoad___'s
	module branch) rather than wrapping it as a BoundMethod."

	^ list @env0:withAll: (GsCurrentSession @env0:currentSession @env0:symbolList)
%

category: 'Grail-Accessors'
method: gemstone
system
	"Python gemstone.system — the GemStone System class.  Transaction
	control is dispatched through it: gemstone.system.commit() and
	gemstone.system.abort() resolve to env-1 class-side methods compiled
	on System by System.gs (replacing the former module-level
	gemstone.commit()/gemstone.abort()).

	Compiled in the Grail-Accessors category so a bare attribute read
	performs this method and returns the class."

	^ System
%

! ===============================================================================
! Session-local storage
! ===============================================================================

category: 'Grail-Session State'
method: gemstone
sessionDict: name
	"Return a session-local Python dict registered under `name`.

	The dict lives in SessionTemps, so it is created fresh for each Gem
	process and is NEVER committed.  Grail uses it for caches that hold
	process-bound objects — compiled regex patterns (SrePattern) and jinja2
	lexers — which must not leak into the commit set or collide between
	concurrent sessions.  Python callers go through the `SessionDict` proxy
	in stdlib `_grail_session.py`, which forwards every dict operation here."

	| temps key |
	temps := SessionTemps @env0:current.
	key := ('___GrailSessionDict___' @env0:, name @env0:asString) @env0:asSymbol.
	^ temps @env0:at: key ifAbsentPut: [dict ___new___]
%

! ===============================================================================
! Deploy audit
! ===============================================================================

category: 'Grail-Deploy Audit'
method: gemstone
deploy_check: aModule
	"Python gemstone.deploy_check(module) -- a PRE-DEPLOY audit
	(docs/Persistent_Modules_and_Classes.md par.10.4).  Walks the
	not-yet-committed object graph reachable from the module and returns a
	Python list of one-line descriptions of every SESSION-BOUND value it
	would sweep into the repository (open files/sockets, semaphores,
	threads, raw C pointers, un-recompilable regex patterns / matches,
	weak references), each with a class-path from the module.  An empty
	list means the module's new closure is commit-clean.

	Accepts a module object or its dotted-name string.  Never commits."

	| name |
	name := (aModule isKindOf: CharacterCollection)
		ifTrue: [aModule @env0:asString]
		ifFalse: [(aModule __name__) @env0:asString].
	^ importlib @env0:___deployCheck___: name
%

! ===============================================================================
! Metadata
! ===============================================================================

category: 'Grail-Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str @env0:withAll: (System @env0:stoneVersionAt: 'gsVersion')
%

set compile_env: 0
