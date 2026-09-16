! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SysHookAttributesTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
SysHookAttributesTestCase comment:
'sys.excepthook must be READABLE before anyone assigns to it, and ASSIGNABLE
without being invoked.  Two separate defects, both raising UNCATCHABLE
Smalltalk errors -- the worst failure class, because Python cannot see them.

1. READING BEFORE ASSIGNMENT.  CPython starts every hook equal to its
   __-prefixed twin -- on a fresh interpreter ``sys.excepthook is
   sys.__excepthook__'''' is True -- and programs read it in order to CHAIN,
   which is the documented way to install a handler:

       previous = sys.excepthook
       sys.excepthook = lambda *arguments: my_handler(previous, *arguments)

   Only the dunder twins were seeded, while excepthook and displayhook kept
   accessor methods reading a key nobody had put, so the read raised a raw
   LookupError (error 2021, rtErrKeyNotFound).  The chaining read took the
   whole program down.

2. ASSIGNING TO displayhook INVOKED IT.  displayhook owns a one-argument call
   form ``displayhook: value'''', and a unary getter beside a one-argument
   method is exactly the shape ___mayDispatchToSetter___ reads as a
   getter/setter PAIR.  So ``sys.displayhook = my_handler'''' dispatched to the
   CALL form and tried to DISPLAY the handler rather than install it, dying
   inside printString.

   excepthook escaped because its call form takes THREE arguments
   (excepthook:_:_:), which is not setter-shaped.  breakpointhook escaped
   because its accessor had already been removed for the neighbouring reason
   its own comment gives.  The fix gives displayhook the same treatment: no
   unary accessor, the seeded dict entry answering the read.

WHAT WAS NOT WRONG, worth recording because it was the first suspicion and it
was WRONG: assignment does not fail in general.  Storing a hook writes a
dynamic instance variable the read then finds, so excepthook, breakpointhook
and unraisablehook all round-tripped correctly the whole time.'
%

doit
SysHookAttributesTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
SysHookAttributesTestCase removeAllMethods: 0.
SysHookAttributesTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: SysHookAttributesTestCase
setUp

	| loadedModules |

	loadedModules := importlib @env1:modules.
	loadedModules removeKey: #'sys_hook_attributes' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_hook_attributes.py')
		name: 'sys_hook_attributes'
%

category: 'Grail-Helpers'
method: SysHookAttributesTestCase
resultAt: aKey

	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: SysHookAttributesTestCase
assertAll: keys

	keys do: [:eachKey |
		| outcome |
		outcome := self resultAt: eachKey.
		self assert: outcome == true description: eachKey , ' -> ' , outcome printString]
%

category: 'Grail-Tests'
method: SysHookAttributesTestCase
testEveryHookIsReadableBeforeAnyAssignment

	"The read that used to raise an uncatchable LookupError.  All four hooks
	and all four dunder twins, because only two of the eight were broken and
	nothing marked which."

	self assertAll: #('every_hook_is_readable' 'every_dunder_twin_is_readable')
%

category: 'Grail-Tests'
method: SysHookAttributesTestCase
testTheChainingIdiomWorks

	"Why the read matters: reading the current hook to wrap it is the
	documented way to install a handler, and it was the exact shape that
	failed."

	self assertAll: #('the_chaining_idiom_works')
%

category: 'Grail-Tests'
method: SysHookAttributesTestCase
testAssigningAHookStoresItRatherThanInvokingIt

	"``sys.displayhook = my_handler'' used to DISPLAY the handler, because a
	unary getter beside a one-argument call form reads as a getter/setter
	pair.  All four hooks are asserted: three already worked, and the test
	does not say which, so a regression in any of them is caught."

	self assertAll: #('assignment_round_trips')
%

category: 'Grail-Tests'
method: SysHookAttributesTestCase
testTheDunderTwinCanRestoreTheHook

	"``sys.excepthook = sys.__excepthook__'' is CPython's documented reset,
	and it needs both halves readable."

	self assertAll: #('the_dunder_twin_can_restore_the_hook')
%
