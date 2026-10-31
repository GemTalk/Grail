"
Issue #1954: sys.excepthook is what an UNCAUGHT exception is reported through.

Two defects.  ``sys.excepthook = hook'' put a monkey-patch dispatcher over sys's
unary ``excepthook'' accessor, as if it were a module function, so Smalltalk's
``sys excepthook'' CALLED the hook with no arguments and answered its result
(None).  And scripts/grail.tpz printed an uncaught exception itself and never
asked sys.excepthook at all.

sys >> ___reportUncaught___: is the launcher's half, CPython's
_PyErr_PrintEx: call the hook Python would find with (type, value, traceback),
and answer what the caller still has to print -- nothing, CPython's preamble
for a hook that is missing or raised, or a SystemExit the hook raised.  These
tests drive it directly; tests/scripts/test_grail_launcher.sh runs whole
programs.

The fixture is tests/python/sys_excepthook_uncaught.py.  tearDown restores
sys's excepthook stores directly.
"
Class {
	#name : 'SysExcepthookTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'sysInst',
		'saved'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SysExcepthookTestCase >> call: aName with: args [
	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: args value: nil

]

{ #category : 'Grail-Private' }
SysExcepthookTestCase >> report: anException [
	^ sysInst @env1:___reportUncaught___: anException

]

{ #category : 'Grail-Setup' }
SysExcepthookTestCase >> setUp [
	sysInst := sys @env1:instance.
	saved := { sysInst at: #excepthook otherwise: nil. sysInst dynamicInstVarAt: #excepthook }.
	importlib @env1:modules removeKey: #'sys_excepthook_uncaught' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_excepthook_uncaught.py')
		name: 'sys_excepthook_uncaught'

]

{ #category : 'Grail-Setup' }
SysExcepthookTestCase >> tearDown [
	saved == nil ifFalse: [
		(saved at: 1) == nil
			ifTrue: [sysInst removeKey: #excepthook ifAbsent: []]
			ifFalse: [sysInst at: #excepthook put: (saved at: 1)].
		(saved at: 2) == nil
			ifTrue: [(sysInst dynamicInstVarAt: #excepthook) == nil
				ifFalse: [sysInst removeDynamicInstVar: #excepthook]]
			ifFalse: [sysInst dynamicInstVarAt: #excepthook put: (saved at: 2)].
		sysInst @env1:___unmarkGlobalDeleted___: #excepthook].
	super tearDown

]

{ #category : 'Grail-Tests' }
SysExcepthookTestCase >> testAFailingHookIsReportedAndLeavesTheOriginalToTheCaller [
	"CPython: 'Error in sys.excepthook:', the hook's own traceback, a blank
	line and 'Original exception was:' -- and then the original exception,
	which is the caller's to print."

	| text |
	self call: #install with: #('failing').
	text := self report: self uncaught.
	self assert: text isString.
	self assert: (text beginsWith: 'Error in sys.excepthook:') description: text.
	self assert: (text includesString: 'RuntimeError: hook broke') description: text.
	self assert: (text endsWith: (String with: Character lf) , 'Original exception was:' , (String with: Character lf))
		description: text

]

{ #category : 'Grail-Tests' }
SysExcepthookTestCase >> testAHookThatExitsAnswersItsSystemExit [
	"CPython exits with the status the hook's sys.exit() names."

	| result |
	self call: #install with: #('exiting').
	result := self report: self uncaught.
	self assert: (result isKindOf: SystemExit).
	self assert: ((result @env1:___pyAttrLoad___: #code) = 9)

]

{ #category : 'Grail-Tests' }
SysExcepthookTestCase >> testAMissingHookIsSaidAndLeavesTheReportToTheCaller [
	self call: #remove_hook with: #().
	self
		assert: (self report: self uncaught)
		equals: 'sys.excepthook is missing' , (String with: Character lf)

]

{ #category : 'Grail-Tests - Controls' }
SysExcepthookTestCase >> testEveryCheckAgreesWithCPython [
	"The Python-visible half, checked against CPython by
	scripts/check_python_fixtures.sh.  It held before the fix too: Python read
	back the hook it assigned."

	self
		assert: (testModule @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '2 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
SysExcepthookTestCase >> testSmalltalkReadsTheAssignedHook [
	"The issue as found: ``sys excepthook'' ran the hook and answered None."

	| hook |
	hook := self call: #install with: #('recording').
	self assert: (sysInst @env1:excepthook) == hook

]

{ #category : 'Grail-Tests - Controls' }
SysExcepthookTestCase >> testTheOriginalHookLeavesTheReportToTheCaller [
	"With sys.excepthook untouched the launcher keeps printing the traceback
	itself, exactly as before, with nothing ahead of it."

	self call: #restore_hook with: #().
	self assert: (self report: self uncaught) equals: ''

]

{ #category : 'Grail-Tests' }
SysExcepthookTestCase >> testUncaughtExceptionCallsTheAssignedHook [
	"With (type, value, traceback) -- the traceback the exception carries --
	and the report is then complete."

	| ex result |
	self call: #install with: #('recording').
	ex := self uncaught.
	result := self report: ex.
	self assert: result == true.
	self
		assert: (self call: #recorded_call with: { ex ensurePythonTraceback }) @env1:__repr__ asString
		equals: '(True, True, True, True)'

]

{ #category : 'Grail-Private' }
SysExcepthookTestCase >> uncaught [
	"A Python exception as the launcher catches it: by a Smalltalk handler,
	outside any Python except block."

	^ [self call: #boom with: #(). nil]
		on: BaseException
		do: [:ex | ex return: ex]

]
