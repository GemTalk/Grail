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

This class provides basic metadata about the Grail runtime.
'
%

expectvalue /Class
doit
gemstone category: 'Modules'
%

! ===============================================================================
! gemstone Module (Python 'gemstone' module)
! ===============================================================================
! This file contains the Python gemstone module implementation.
! The gemstone module provides basic metadata about the Grail runtime.
! ===============================================================================

! ------------------- Remove existing Python methods from gemstone
expectvalue /Metaclass3
doit
gemstone removeAllMethods: 1.
gemstone class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Subscript Protocol'
method: gemstone
__delitem__: key
	"Remove the object named key from UserGlobals. Raises KeyError if not found."

	| name |
	name := key perform: #'asSymbol' env: 0.
	(UserGlobals perform: #'includesKey:' env: 0 withArguments: { name }) ifFalse: [
		KeyError ___signal___: key
	].
	UserGlobals perform: #'removeKey:' env: 0 withArguments: { name }.
	^ nil
%

category: 'Python-Subscript Protocol'
method: gemstone
__getitem__: key
	"Return the object named key from the current session. Raises KeyError if not found."

	| name session result |
	name := key perform: #'asSymbol' env: 0.
	session := GsCurrentSession perform: #'currentSession' env: 0.
	result := session perform: #'objectNamed:' env: 0 withArguments: { name }.
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
	name := key perform: #'asSymbol' env: 0.
	session := GsCurrentSession perform: #'currentSession' env: 0.
	assoc := session perform: #'resolveSymbol:' env: 0 withArguments: { name }.
	assoc ifNotNil: [
		assoc perform: #'value:' env: 0 withArguments: { value }.
		^ nil
	].
	UserGlobals perform: #'at:put:' env: 0 withArguments: { name . value }.
	^ nil
%

category: 'Accessors'
method: gemstone
abort

	^ self ___at___: #'abort'
%

category: 'Accessors'
method: gemstone
abort: aBlock

	self ___at___: #'abort' put: aBlock.
%

category: 'Accessors'
method: gemstone
commit

	^ self ___at___: #'commit'
%

category: 'Accessors'
method: gemstone
commit: aBlock

	self ___at___: #'commit' put: aBlock.
%

category: 'Initialization'
method: gemstone
initialize
	"Initialize all module attributes with their default values."
	self
		initialize_abort;
		initialize_commit;
		yourself
%

category: 'Initialization'
method: gemstone
initialize_abort

	self ___at___: #'abort' put: [:positional :keywords |
		System perform: #'abort' env: 0.
	]
%

category: 'Initialization'
method: gemstone
initialize_commit

	self ___at___: #'commit' put: [:positional :keywords |
		System perform: #'commit' env: 0.
	]
%

category: 'Metadata'
method: gemstone
version
	"Return the GemStone version."
	^ str ___withAll___: (System perform: #'stoneVersionAt:' env: 0 withArguments: { 'gsVersion' })
%

set compile_env: 0
