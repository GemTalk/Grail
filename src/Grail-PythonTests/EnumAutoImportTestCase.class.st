Class {
	#name : 'EnumAutoImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
EnumAutoImportTestCase >> setUp [
	"Load tests/python/enum_auto_import.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_auto_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_auto_import.py')
		name: 'enum_auto_import'.

]

{ #category : 'Grail-Tests' }
EnumAutoImportTestCase >> testAutoCallableAfterImport [
	"auto() is callable after ``from enum import auto'' and returns a
	fresh marker each call.  Markers resolve to per-CLASS sequential
	values at member-build time (CPython semantics; the old behavior
	returned process-global integers directly, giving arbitrary values
	inside class bodies -- see DunderNewTestCase>>testEnumInternals for
	the value-resolution pins)."

	| result a b c |
	result := testModule @env1:imported_auto_is_callable.
	a := result at: 1.
	b := result at: 2.
	c := result at: 3.
	self assert: (a isKindOf: GrailEnumAuto).
	self assert: (b isKindOf: GrailEnumAuto).
	self assert: (c isKindOf: GrailEnumAuto).
	"Each call returns a distinct marker object."
	self deny: a == b.
	self deny: b == c.
	self deny: a == c

]
