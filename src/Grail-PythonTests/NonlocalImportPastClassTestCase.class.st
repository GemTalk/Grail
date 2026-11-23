"
#2233: ``nonlocal x; import os as x'' in a method of a class defined inside a
function binds the FUNCTION's x, through the class's setter cell -- the store
an assignment to the same name already took.  The import wrote a bare
``x := ...'' instead, which did not compile, so the method was a codegen-gap
stub on both paths, and the IR path refused it as `cm:shape:ImportAst'.

tests/python/nonlocal_import_past_class.py (self-running against CPython 3.14)
is loaded once per path; both must give CPython's answers, and the IR load
must build the methods through IR with no fallback and no import refusal.
"
Class {
	#name : 'NonlocalImportPastClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'textModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
NonlocalImportPastClassTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/nonlocal_import_past_class.py'

]

{ #category : 'Grail-Private' }
NonlocalImportPastClassTestCase >> ___irModule___ [
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'nipc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nipc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'nipc_ir']
		ensure: [importlib ___irCensusOn: false].
	^ irModule

]

{ #category : 'Grail-Private' }
NonlocalImportPastClassTestCase >> ___mismatchesIn___: aModule [
	^ (aModule @env1:___pyAttrLoad___: #'mismatches')
		@env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Private' }
NonlocalImportPastClassTestCase >> ___textModule___ [
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'nipc_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'nipc_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'nipc_text'.
	^ textModule

]

{ #category : 'Grail-Setup' }
NonlocalImportPastClassTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'nipc_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'nipc_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'nipc_ir'.
	self ___forgetCanonicalModule___: 'nipc_text'.
	irModule := nil.
	textModule := nil

]

{ #category : 'Grail-Tests - an import binding a nonlocal past a class' }
NonlocalImportPastClassTestCase >> testEveryShapeAgreesWithCPythonOnTheTextPath [
	| bad |
	bad := self ___mismatchesIn___: self ___textModule___.
	self assert: (bad @env1:__len__) = 0
		description: 'nonlocal_import_past_class disagrees with CPython on the text path: '
			, (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests - an import binding a nonlocal past a class' }
NonlocalImportPastClassTestCase >> testEveryShapeAgreesWithCPythonUnderIR [
	| bad |
	bad := self ___mismatchesIn___: self ___irModule___.
	self assert: (bad @env1:__len__) = 0
		description: 'nonlocal_import_past_class disagrees with CPython under IR: '
			, (builtins @env1:instance @env1:repr: bad) asString

]

{ #category : 'Grail-Tests - an import binding a nonlocal past a class' }
NonlocalImportPastClassTestCase >> testTheIRArmBuildsTheImportsThroughIR [
	"Correct answers prove nothing if the methods were built as text: the
	import refusal is gone from the census and nothing fell back."

	| stats counts |
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	self ___irModule___.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , stats printString.
	counts := importlib ___irCensus___ at: #counts.
	#(#'cm:shape:ImportAst' #'cm:shape:ImportFromAst' #'shape:ImportAst'
	  #'shape:ImportFromAst') do: [:row |
		self assert: (counts at: row otherwise: 0) = 0
			description: row , ' still refuses: ' , counts printString]

]
