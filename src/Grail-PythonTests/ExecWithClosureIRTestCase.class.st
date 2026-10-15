Class {
	#name : 'ExecWithClosureIRTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecWithClosureIRTestCase >> ___irModule___ [
	"Forced rather than inherited: the text path is correct, so a flag-off run
	compiles none of the emit under test."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ewc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ewc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/exec_with_closure.py'
		name: 'ewc_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
ExecWithClosureIRTestCase >> ___reprAt___: aKey from: aDictName [
	^ (builtins @env1:instance) @env1:repr:
		((self ___irModule___ @env1:___pyAttrLoad___: aDictName asSymbol)
			@env1:__getitem__: aKey)

]

{ #category : 'Grail-Setup' }
ExecWithClosureIRTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ewc_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ewc_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - the substitution under IR' }
ExecWithClosureIRTestCase >> testEveryCheckAgreesWithCPythonUnderIR [
	"All fifteen, through the fixture's own roll-up.  The refusal rows matter
	here too: carrying the body text must not turn a refusal CPython makes into
	an execution Grail allows."

	self
		assert: ((self ___irModule___ @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '15 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - the substitution under IR' }
ExecWithClosureIRTestCase >> testTheSubstitutedCellsAreUsedUnderIR [
	"The row that proves the cells are USED rather than the def being called:
	2*3 with its own cells, 35*72 with two replaced.  Before the fix both rows
	were the refusal TypeError."

	#('own_closure' 'substituted_closure') do: [:k |
		self
			assert: (self ___reprAt___: k from: 'r') asString
			equals: (self ___reprAt___: k from: 'EXPECTED') asString]

]
