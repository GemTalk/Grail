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

Provides basic metadata about the Grail runtime and convenience access
to GemStone session features (commit/abort, namespace lookup).

Methods on this class are real env-1 fast-path methods, dispatched
directly via `gemstone.method(args)` Python calls compiled to
`((gemstone instance) method: args)` Smalltalk sends.
'
%

expectvalue /Class
doit
gemstone category: 'Modules'
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

category: 'Initialization'
method: gemstone
initialize
	"No-op. The `module>>instance` class method still calls `initialize`
	on the newly-created instance, so this stub keeps that contract."
%

! ===============================================================================
! Subscript protocol — namespace access via gemstone[name]
! ===============================================================================

category: 'Python-Subscript Protocol'
method: gemstone
__delitem__: key
	"Remove the object named key from UserGlobals. Raises KeyError if not found."

	| name |
	name := key @env0:asSymbol.
	(UserGlobals @env0:includesKey: name) ifFalse: [
		KeyError ___signal___: key
	].
	UserGlobals @env0:removeKey: name.
	^ nil
%

category: 'Python-Subscript Protocol'
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

category: 'Python-Subscript Protocol'
method: gemstone
__setitem__: key _: value
	"Set the object named key in the current session. If an Association exists, update it; otherwise add to UserGlobals."

	| name session assoc |
	name := key @env0:asSymbol.
	session := GsCurrentSession @env0:currentSession.
	assoc := session @env0:resolveSymbol: name.
	assoc ifNotNil: [
		assoc @env0:value: value.
		^ nil
	].
	UserGlobals @env0:at: name put: value.
	^ nil
%

! ===============================================================================
! Fast-path methods
! ===============================================================================

category: 'Python-Built-in Functions'
method: gemstone
abort
	"Python builtin gemstone.abort() — fast path. Aborts the current
	GemStone session, discarding uncommitted changes."

	^ System @env0:abort
%

category: 'Python-Built-in Functions'
method: gemstone
commit
	"Python builtin gemstone.commit() — fast path. Commits the current
	GemStone session."

	^ System @env0:commit
%

! ===============================================================================
! Metadata
! ===============================================================================

category: 'Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str ___withAll___: (System @env0:stoneVersionAt: 'gsVersion')
%

set compile_env: 0
