Class {
	#name : 'ClassBodyImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyImportTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassBodyImportTestCase >> setUp [
	"Reload tests/python/class_body_import.py fresh each test; the classes
	are built once at import, so each assertion reads that construction."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_import.py')
		name: 'class_body_import'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests' }
ClassBodyImportTestCase >> testDottedImportBindings [
	"``import a.b as x'' binds the LEAF; ``import a.b'' binds the TOP-level
	package -- the same split the module-scope import already honours."

	self assert: (self at: 'dotted_alias') @env0:asString equals: 'a/b'.
	self assert: (self at: 'dotted_no_alias') @env0:asString equals: '/'.

]

{ #category : 'Grail-Tests - from import' }
ClassBodyImportTestCase >> testFromImportAliasBindsOnlyTheAlias [
	"``from math import floor as fl'' binds fl, NOT floor."

	self assert: (self at: 'from_aliased') equals: 2.
	self deny: (self at: 'from_alias_not_original').

]

{ #category : 'Grail-Tests - from import' }
ClassBodyImportTestCase >> testFromImportBindsAsClassAttribute [
	"``from os import sep'' binds sep in the class namespace, and a later
	body statement must see it -- the same contract as a plain import.
	ImportFromAst was the last binding form that did not announce itself,
	so the statement was dropped whole and ``sep'' raised NameError."

	self assert: (self at: 'from_combined') @env0:asString equals: 'x/'.
	self assert: (self at: 'from_on_class') @env0:asString equals: '/'.

]

{ #category : 'Grail-Tests - from import' }
ClassBodyImportTestCase >> testFromImportMultipleNames [
	"``from math import floor, ceil'' binds both."

	self assert: (self at: 'from_multi_floor') equals: 2.
	self assert: (self at: 'from_multi_ceil') equals: 3.

]

{ #category : 'Grail-Tests' }
ClassBodyImportTestCase >> testImportBindsAsClassAttribute [
	"``class C: import json'' leaves json on the class."

	self assert: (self at: 'on_class').
	self assert: (self at: 'plain_is_module').

]

{ #category : 'Grail-Tests' }
ClassBodyImportTestCase >> testImportedNameUsableLaterInTheBody [
	"The failing half: a later class-body statement must see the name.
	Before the fix this raised NameError."

	self assert: (self at: 'used_later') @env0:asString equals: '{"k": 2}'.

]

{ #category : 'Grail-Tests' }
ClassBodyImportTestCase >> testMultipleImportsOnOneStatement [
	"``import json, math'' binds both."

	self assert: (self at: 'multiple_json') @env0:asString equals: '[1]'.
	self assert: (self at: 'multiple_math') equals: 2.

]

{ #category : 'Grail-Tests' }
ClassBodyImportTestCase >> testWerkzeugEnvironBuilderIdiom [
	"The upstream shape that motivated the fix, verbatim: import, capture
	an attribute into a staticmethod, then del the module name."

	self assert: (self at: 'werkzeug_dumps') @env0:asString equals: '{"a": 1}'.

]
