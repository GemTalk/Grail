! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%
! ------------------- Class definition for SelfCheckingFixturesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SelfCheckingFixturesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%
expectvalue /Class
doit
SelfCheckingFixturesTestCase category: 'Grail-SUnit'
%
! ===============================================================================
! SelfCheckingFixturesTestCase
!
! Runs a tests/python fixture's CHECKS under Grail.
!
! scripts/check_python_fixtures.sh runs every self-running fixture under
! CPython -- that is what proves each check describes CPython -- but it never
! runs one under GRAIL.  Grail runs a fixture only through a TestCase that
! loads it, and a fixture nobody wired up is evidence about CPython alone:
! tests/python/mro_builtins_and_mi_closures.py (PR #1126) shipped that way.
!
! A fixture whose checks are a ``CHECKS'' list of functions answering True
! needs nothing fixture-specific to be run here, so one TestCase serves them
! all: each test loads one fixture fresh and fails naming every check that did
! not answer True, or raised.
! ===============================================================================
set compile_env: 0
expectvalue /Metaclass3
doit
SelfCheckingFixturesTestCase removeAllMethods.
SelfCheckingFixturesTestCase class removeAllMethods.
%

category: 'Grail-Private'
method: SelfCheckingFixturesTestCase
___failingChecksIn___: aName
	"Load tests/python/<aName>.py fresh and call each function in its CHECKS,
	answering the names of those that did not answer True (a raise counts as
	a failure, and is named with its exception).  AlmostOutOfStack is passed
	on, never swallowed: catching it would spend the VM's one warning."

	| mods module checks failing |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	module := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	checks := module @env1:___pyAttrLoad___: #'CHECKS'.
	failing := OrderedCollection new.
	checks do: [:fn | | name result |
		name := (fn @env1:___pyAttrLoad___: #'__name__') asString.
		result := [(fn @env1:___pyCallValue___: #() kw: nil) == true
				ifTrue: [nil]
				ifFalse: [name]]
			on: AbstractException
			do: [:ex |
				(AlmostOutOfStackError handles: ex) ifTrue: [ex pass].
				ex return: name , ' raised ' , ex messageText asString].
		result isNil ifFalse: [failing add: result]].
	^ failing asArray
%

category: 'Grail-Tests'
method: SelfCheckingFixturesTestCase
testCodecsConformance
	"The codec behaviours test_codecs exposed: the charmap contract,
	bytes-like decoder input, UTF-8 well-formedness, the UTF-16/32 BOM
	contract, UTF-7, escape warnings, the registry and keyword calls."
	self assert: (self ___failingChecksIn___: 'codecs_conformance') equals: #()
%

category: 'Grail-Tests'
method: SelfCheckingFixturesTestCase
testCodecsCjkAndIdna
	"The CJK codecs, IDNA over stringprep, and unicodedata.ucd_3_2_0."
	self assert: (self ___failingChecksIn___: 'codecs_cjk_idna') equals: #()
%

category: 'Grail-Tests'
method: SelfCheckingFixturesTestCase
testMroBuiltinsAndMiClosures
	"PR #1126's fixture, which until now was only ever run under CPython."
	self assert: (self ___failingChecksIn___: 'mro_builtins_and_mi_closures') equals: #()
%

category: 'Grail-Tests'
method: SelfCheckingFixturesTestCase
testSessionPatching
	"Monkey-patching through session methods: an instance patch reaches only
	its instance, a builtin patch reaches bare calls, and a class carrying a
	patch can still have methods removed."
	self assert: (self ___failingChecksIn___: 'session_patching') equals: #()
%
