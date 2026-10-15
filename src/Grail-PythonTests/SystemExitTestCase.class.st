Class {
	#name : 'SystemExitTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SystemExitTestCase >> assertMatchesCPythonAt: key [
	"Compare Grail's result for one fixture probe against the CPython 3.14.6
	value recorded in the fixture, by repr on both sides -- so a tuple, a str
	and an int are all compared as what they print as, and ``0'' does not match
	``False''."

	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
SystemExitTestCase >> setUp [
	"Reload tests/python/system_exit_code.py fresh each test: the module body
	runs every probe at import, so each test reads results produced by its own
	import rather than by whichever test happened to run first."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'system_exit_code' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/system_exit_code.py')
		name: 'system_exit_code'.

]

{ #category : 'Grail-Tests - code Is Derived From args' }
SystemExitTestCase >> testAnExplicitNoneIsNotTheSameAsNoArgument [
	"THE CASE THAT PINS THE RULE TO THE LENGTH OF args RATHER THAN ITS VALUE.
	``SystemExit(None)'' has args ``(None,)'' while ``SystemExit()'' has args
	``()'', and both have code None -- so a derivation cannot decide by looking
	at args[0] and treating a missing value as absent.  0 is the other half:
	``code == 0'' with ``code is None'' false, because 0 and None both mean
	success and are still different objects."

	self assertMatchesCPythonAt: 'explicit_none_argument'.
	self assertMatchesCPythonAt: 'zero_is_not_none'.

]

{ #category : 'Grail-Tests - Regression Guards' }
SystemExitTestCase >> testArgsStrAndReprAreUndisturbed [
	"Adding code must not move anything else.  str/repr read args, and the
	sys.exit() fix CHANGES what the bare exit's repr says -- ``SystemExit()''
	rather than ``SystemExit(0)'' -- so pinning them is what says the change is
	the intended one and not a second, quieter difference."

	self assertMatchesCPythonAt: 'str_and_repr'.

]

{ #category : 'Grail-Tests - code Is Writable' }
SystemExitTestCase >> testAssigningCodeShadowsTheDerivationAndLeavesArgsAlone [
	"CPython's ``code'' is a plain writable member, so ``e.code = 99'' is an
	ordinary store that does NOT rewrite args.  Storing None must read back as
	None rather than falling through to the derivation, which would answer 1 --
	the guard that the store is genuinely consulted first and not merely
	non-nil."

	self assertMatchesCPythonAt: 'assignment_wins'.
	self assertMatchesCPythonAt: 'assignment_of_none'.
	self assertMatchesCPythonAt: 'assignment_without_args'.

]

{ #category : 'Grail-Tests - Every Construction Path Agrees' }
SystemExitTestCase >> testBareSysExitPassesNoArgumentAtAll [
	"THE SECOND BUG.  Grail signalled ``___signal___: 0'', so args was ``(0,)''
	and code 0 where CPython gives ``()'' and None.  Invisible while code did
	not exist -- 0 and None are the same exit status to a shell -- and wrong the
	moment anything read it, because ``e.code is None'' is how ``exited without a
	status'' is spelled."

	self assertMatchesCPythonAt: 'sys_exit_bare'.

]

{ #category : 'Grail-Tests - code Is Derived From args' }
SystemExitTestCase >> testCodeIsTheSingleConstructorArgument [
	"THE TEST THIS EXISTS FOR.  ``SystemExit(3).code'' raised AttributeError --
	the attribute was absent, not merely unset -- so every reader of an exit
	status got an error instead of a status.  A str code is a MESSAGE rather
	than a number and is kept verbatim."

	self assertMatchesCPythonAt: 'one_argument'.
	self assertMatchesCPythonAt: 'string_argument'.

]

{ #category : 'Grail-Tests - Regression Guards' }
SystemExitTestCase >> testCreation [
	"Test creating a SystemExit instance."

	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: exc notNil.

]

{ #category : 'Grail-Tests - Inheritance' }
SystemExitTestCase >> testInheritance [
	"Why SystemExit hangs off BaseException and not Exception: ``except
	Exception'' must NOT swallow an exit request.  Nothing to do with code, and
	everything to do with whether the code is ever read."

	| exc |
	exc := SystemExit ___new___:  SystemExit .
	self assert: (exc isKindOf: BaseException).
	self assertMatchesCPythonAt: 'still_a_baseexception_not_an_exception'.

]

{ #category : 'Grail-Tests - code Is Derived From args' }
SystemExitTestCase >> testMoreThanOneArgumentMakesCodeTheWholeTuple [
	"CPython slices the whole args tuple in the size > 1 branch, so code IS args
	-- not args[0], and not a TypeError."

	self assertMatchesCPythonAt: 'two_arguments'.
	self assertMatchesCPythonAt: 'three_arguments'.

]

{ #category : 'Grail-Tests - code Is Derived From args' }
SystemExitTestCase >> testNoConstructorArgumentMeansNone [
	"CPython's SystemExit_init returns early on an empty args tuple, leaving the
	member unassigned -- which reads as None.  ``raise SystemExit'' with no call
	at all takes the same path."

	self assertMatchesCPythonAt: 'no_argument'.
	self assertMatchesCPythonAt: 'raise_bare_class'.

]

{ #category : 'Grail-Tests - Inheritance' }
SystemExitTestCase >> testSubclassesInheritCode [
	"A subclass gets code for free precisely BECAUSE it follows args: a plain
	subclass sets args through the inherited __init__, and one with its own
	__init__ sets them by forwarding to super()."

	self assertMatchesCPythonAt: 'plain_subclass'.
	self assertMatchesCPythonAt: 'subclass_with_init'.

]

{ #category : 'Grail-Tests - Every Construction Path Agrees' }
SystemExitTestCase >> testSysExitWithAStatusCarriesIt [
	"sys.exit() is the commonest producer, and it builds the instance by a route
	of its own -- so it has to be checked separately from the constructor."

	self assertMatchesCPythonAt: 'sys_exit_status'.
	self assertMatchesCPythonAt: 'sys_exit_zero'.
	self assertMatchesCPythonAt: 'sys_exit_message'.

]

{ #category : 'Grail-Tests - Every Construction Path Agrees' }
SystemExitTestCase >> testTheRaiseStatementAgreesWithTheConstructor [
	"``raise SystemExit(7)'' goes through ___signalNew___:kw:, a third path,
	which must produce the same args -- and therefore the same code -- as the
	other two."

	self assertMatchesCPythonAt: 'raise_statement'.

]
