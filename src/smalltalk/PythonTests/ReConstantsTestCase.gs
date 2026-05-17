! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReConstantsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReConstantsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReConstantsTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ReConstantsTestCase removeAllMethods.
ReConstantsTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! ReConstantsTestCase
!
! Locks in that ``re/_constants.py`` loads in its upstream-shaped
! form: ``_NamedIntConstant = NamedIntConstant`` + ``_makecodes(*names)
! + globals().update(...)``.  Exercises three Grail-specific pieces
! together — NamedIntConstant, Phase 1's late module-name binding,
! and the @env0:class @env0:perform: paths the wrapper uses.
! ===============================================================================

category: 'Grail-Setup'
method: ReConstantsTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	mods @env0:removeKey: #'re._constants' ifAbsent: [].
	mods @env0:removeKey: #'re' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/re/_constants.py')
		name: 're._constants'.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testModuleLoads

	self assert: testModule notNil.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testNamedConstantsHaveNames
	"Opcode constants are NamedIntConstants — name survives."

	self assert: (testModule @env1:LITERAL @env1:name) equals: 'LITERAL'.
	self assert: (testModule @env1:BRANCH @env1:name) equals: 'BRANCH'.
	self assert: (testModule @env1:MAXREPEAT @env1:name) equals: 'MAXREPEAT'.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testOpcodeValuesAreSequential
	"`_makecodes` allocates sequential 0..N codes in argument order.
	FAILURE=0, SUCCESS=1, then the OPCODES list above hits LITERAL
	at the same index regardless of representation."

	self assert: (testModule @env1:FAILURE) equals: 0.
	self assert: (testModule @env1:SUCCESS) equals: 1.
	self assert: (testModule @env1:LITERAL) equals: 16.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testOpcodesListSize
	"OPCODES drops MIN_REPEAT and MAX_REPEAT (we use slice rebind
	`OPCODES = OPCODES[:-2]` since Grail can't `del OPCODES[-2:]`).
	The two still exist as module-level names — re._parser uses them."

	self assert: (testModule @env1:OPCODES @env1:__len__) equals: 43.
	self assert: (testModule @env1:MIN_REPEAT @env1:name) equals: 'MIN_REPEAT'.
	self assert: (testModule @env1:MAX_REPEAT @env1:name) equals: 'MAX_REPEAT'.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testAtcodesAndChcodesLoad
	"_makecodes also drives ATCODES and CHCODES."

	self assert: (testModule @env1:ATCODES @env1:__len__) equals: 12.
	self assert: (testModule @env1:AT_BEGINNING) equals: 0.
	self assert: (testModule @env1:AT_BEGINNING @env1:name) equals: 'AT_BEGINNING'.
	self assert: (testModule @env1:CHCODES @env1:__len__) equals: 18.
	self assert: (testModule @env1:CATEGORY_DIGIT) equals: 0.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testMaxrepeatSentinel
	"MAXREPEAT is the ``no upper limit`` sentinel — 2**32 - 1.
	Comparisons with plain ints work in both directions (the
	Int>>__eq__ __index__ fallback handles the reverse direction)."

	self assert: (testModule @env1:MAXREPEAT) equals: 4294967295.
	self assert: (testModule @env1:MAXREPEAT @env1:__index__) equals: 4294967295.
%

category: 'Grail-Tests - re._constants'
method: ReConstantsTestCase
testOpIgnoreMapsCorrectly
	"OP_IGNORE is a dict keyed by opcode NamedIntConstants —
	verifies hash/eq agree so dict lookup works."

	| opIgnore |
	opIgnore := testModule @env1:OP_IGNORE.
	self assert: (opIgnore @env1:__getitem__: (testModule @env1:LITERAL))
		equals: (testModule @env1:LITERAL_IGNORE).
%
