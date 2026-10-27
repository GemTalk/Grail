"A class built by CALLING something keeps its identity when its module is
rebuilt (#1802).

A module-level class statement keeps its class across a rebuild through
importlib class >> ___canonicalSubclassOf:..., keyed ``module.Class''.  A class
built by a call had no key: collections.namedtuple's class statement runs inside
the function, and type(name, bases, ns) -- also what a metaclass call and a
metaclass that rewrites a class statement's bases come down to -- builds one
directly.  So every rebuild of the module minted new classes, and since every
install rebuilds deployed modules, every stored instance was left on a class
nothing named: tests/scripts/run_grail_upgrade_test.sh measured
``isinstance(stored, Pair)'' false and pickle unable to find Pair.

Each test loads tests/python/built_class_rebuild/v1.py, rewrites the module's
file to v2.py and loads it again under the same name: a rebuild, as an edit or
an install makes one."
Class {
	#name : 'BuiltClassRebuildTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'path',
		'snapshot',
		'before',
		'after'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
BuiltClassRebuildTestCase >> call: aCallable [
	^ aCallable @env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Helpers' }
BuiltClassRebuildTestCase >> load: aRevision [
	"Write revision aRevision of the fixture to the module's file and load it."

	| f src |
	src := (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/built_class_rebuild/' , aRevision , '.py') contents.
	f := GsFile openWriteOnServer: path.
	f nextPutAll: src.
	f close.
	(importlib @env1:modules) removeKey: #'grail_built_class_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_built_class_rebuild'

]

{ #category : 'Grail-Helpers' }
BuiltClassRebuildTestCase >> repr: anObject [
	^ (builtins @env1:instance @env1:repr: anObject) asString

]

{ #category : 'Grail-Setup' }
BuiltClassRebuildTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp."
	path := '/tmp/grail_built_class_rebuild_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: 'grail_built_class_rebuild'.
	before := self load: 'v1'.
	after := self load: 'v2'

]

{ #category : 'Grail-Setup' }
BuiltClassRebuildTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_built_class_rebuild' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_built_class_rebuild'.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil].
	before := after := nil

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testAClassStatementOverANamedtupleKeepsItsClass [
	"``class Span(namedtuple('Span', 'lo hi'))'': its base is the same class
	again, so the class statement reuses its own as well -- and still runs its
	methods."

	| span |
	span := after @env1:___pyAttrLoad___: #Span.
	self assert: (before @env1:___pyAttrLoad___: #Span) == span.
	self assert: (self call: ((span @env1:___pyCallValue___: #(3 8) kw: nil) @env1:___pyAttrLoad___: #width))
		equals: 5

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testANamedtupleBuiltAtRunTimeIsNew [
	"A call after the import is not part of any module's build: each one is a
	new class, as in CPython."

	| later |
	later := after @env1:___pyAttrLoad___: #later.
	self deny: (self call: later) == (self call: later)

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testANamedtupleKeepsItsClass [
	"``Pair = namedtuple('Pair', ...)'' is the same class after the rebuild, and
	the class is v2's: the field v2 added is there, with its default."

	| pair |
	pair := after @env1:___pyAttrLoad___: #Pair.
	self assert: (before @env1:___pyAttrLoad___: #Pair) == pair.
	self assert: (self repr: (pair @env1:___pyAttrLoad___: #'_fields'))
		equals: '(''left'', ''right'', ''extra'')'.
	self assert: (self repr: (pair @env1:___pyCallValue___: #(1 2) kw: nil))
		equals: 'Pair(left=1, right=2, extra=None)'

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testARebuildRunsTheNewSource [
	"The control: the second load is a rebuild from v2, not a bind of v1."

	self assert: (after @env1:___pyAttrLoad___: #VERSION) equals: 2

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testASecondClassOfTheSameNameIsNew [
	"``Dup1 = namedtuple('Dup', 'a')'' and ``Dup2 = namedtuple('Dup', 'b')'' are
	two classes, as in CPython.  The first claim of the name keeps its identity;
	the second is not handed the first's class, and is new on every build."

	self assert: (before @env1:___pyAttrLoad___: #Dup1) == (after @env1:___pyAttrLoad___: #Dup1).
	self deny: (after @env1:___pyAttrLoad___: #Dup1) == (after @env1:___pyAttrLoad___: #Dup2).
	self deny: (before @env1:___pyAttrLoad___: #Dup2) == (after @env1:___pyAttrLoad___: #Dup2).
	self assert: (self repr: ((after @env1:___pyAttrLoad___: #Dup2) @env1:___pyAttrLoad___: #'_fields'))
		equals: '(''b'',)'

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testATypeCallKeepsItsClass [
	"``Built = type('Built', (object,), {...})'' at module scope."

	| built |
	built := after @env1:___pyAttrLoad___: #Built.
	self assert: (before @env1:___pyAttrLoad___: #Built) == built.
	self assert: (self call: ((self call: built) @env1:___pyAttrLoad___: #kind)) asString
		equals: 'k'

]

{ #category : 'Grail-Tests' }
BuiltClassRebuildTestCase >> testATypingNamedTupleKeepsItsClass [
	"``class TP(typing.NamedTuple)'': the class statement's name is bound to the
	namedtuple NamedTupleMeta builds, which now keeps its identity."

	| tp |
	tp := after @env1:___pyAttrLoad___: #TP.
	self assert: (before @env1:___pyAttrLoad___: #TP) == tp.
	self assert: (self repr: (tp @env1:___pyCallValue___: #(1) kw: nil))
		equals: 'TP(a=1, b=''x'')'

]
