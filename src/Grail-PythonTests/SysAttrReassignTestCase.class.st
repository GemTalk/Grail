"
Issue #1933: a Python assignment to a sys attribute has to be what SMALLTALK
reads too, and a Smalltalk store has to be what Python reads.

sys keeps its data attributes (argv, executable, flags, ...) as dictionary
entries behind one-line accessors, while a Python ``sys.x = v'' stores a dynamic
instVar that shadows the entry.  Python's read probes that instVar first, so
Python always agreed with itself; the accessors read only the entry, so
``sys argv'' kept the old list -- or, after ``del sys.argv'', none at all.

The fixture is tests/python/sys_attr_reassign.py.  tearDown restores BOTH of
sys's stores directly, so a failing run leaves the session as it found it.
"
Class {
	#name : 'SysAttrReassignTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'sysInst',
		'saved'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SysAttrReassignTestCase >> call: aName with: args [
	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: args value: nil

]

{ #category : 'Grail-Private' }
SysAttrReassignTestCase >> restore: aSym [
	"Put the entry and the dynamic instVar back exactly as setUp found them,
	and clear any tombstone a ``del'' left."

	| rec |
	rec := saved at: aSym.
	(rec at: 1) == nil
		ifTrue: [sysInst removeKey: aSym ifAbsent: []]
		ifFalse: [sysInst at: aSym put: (rec at: 1)].
	(rec at: 2) == nil
		ifTrue: [(sysInst dynamicInstVarAt: aSym) == nil
			ifFalse: [sysInst removeDynamicInstVar: aSym]]
		ifFalse: [sysInst dynamicInstVarAt: aSym put: (rec at: 2)].
	sysInst @env1:___unmarkGlobalDeleted___: aSym

]

{ #category : 'Grail-Setup' }
SysAttrReassignTestCase >> setUp [
	| mods |
	sysInst := sys @env1:instance.
	saved := IdentityKeyValueDictionary new.
	#(#argv #executable) do: [:sym |
		saved at: sym put: {
			sysInst at: sym otherwise: nil.
			sysInst dynamicInstVarAt: sym}].
	mods := importlib @env1:modules.
	mods removeKey: #'sys_attr_reassign' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_attr_reassign.py')
		name: 'sys_attr_reassign'.

]

{ #category : 'Grail-Setup' }
SysAttrReassignTestCase >> tearDown [
	saved == nil ifFalse: [saved keysDo: [:sym | self restore: sym]].
	super tearDown

]

{ #category : 'Grail-Tests - Controls' }
SysAttrReassignTestCase >> testEveryCheckAgreesWithCPython [
	"The Python-visible half, which scripts/check_python_fixtures.sh checks
	against CPython.  It held before the fix too: Python always read back what
	it wrote."

	self
		assert: (testModule @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Smalltalk then Python' }
SysAttrReassignTestCase >> testPythonSeesArgv0SetFromSmalltalk [
	"___setArgv0___: (the ./grail -m launcher) patched the ENTRY's list in
	place, which is not the list Python reads once a program has assigned
	sys.argv."

	| new |
	new := self call: #reassign_argv with: {'program'. false}.
	sys @env1:___setArgv0___: 'resolved.py'.
	self assert: (self call: #read_argv with: #()) == new.
	self assert: (new @env1:__getitem__: 0) asString equals: 'resolved.py'

]

{ #category : 'Grail-Tests - Smalltalk then Python' }
SysAttrReassignTestCase >> testPythonSeesArgvSetFromSmalltalk [
	"importlib's runPath:arguments: installs a program's argv with
	___setArgv___:, which wrote the entry under a shadow a previous program's
	``sys.argv = ...'' had left -- so the next program read the OLD argv."

	| installed |
	self call: #reassign_argv with: {'previous program'. false}.
	installed := sys @env1:___setArgv___: #('next.py' 'one').
	self assert: (self call: #read_argv with: #()) == installed.
	self assert: (sysInst @env1:argv) == installed

]

{ #category : 'Grail-Tests - Python then Smalltalk' }
SysAttrReassignTestCase >> testSmalltalkSeesAnExecutablePythonAssigned [
	"Not only argv: every sys data accessor read the entry alone."

	| new |
	new := self call: #reassign_executable with: #('/opt/elsewhere').
	self assert: (sysInst @env1:executable) == new

]

{ #category : 'Grail-Tests - Python then Smalltalk' }
SysAttrReassignTestCase >> testSmalltalkSeesArgvPythonAssigned [
	"``sys.argv = new'' with no delete: the entry still held the OLD list, and
	the accessor answered it."

	| new |
	new := self call: #reassign_argv with: {'plain'. false}.
	self assert: (sysInst @env1:argv) == new

]

{ #category : 'Grail-Tests - Python then Smalltalk' }
SysAttrReassignTestCase >> testSmalltalkSeesArgvPythonAssignedAfterDeleting [
	"The issue as found: ``del sys.argv; sys.argv = new''.  The delete removed
	the entry, the assignment stored an instVar, and ``sys argv'' raised
	KeyNotFound -- SysTestCase>>testArgv failed in any later class of the same
	session."

	| new |
	new := self call: #reassign_argv with: {'after-delete'. true}.
	self assert: (sysInst @env1:argv) == new

]
