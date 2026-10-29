"A subclass of float or int, and an enum mixed with either, keeps its class
when its module is rebuilt (#1863).

A module-level class statement keeps its class across a rebuild through
importlib class >> ___canonicalSubclassOf:..., which reuses the registered class
when it still descends from the parent the statement names.  A float or int
subclass does not descend from the kernel class the statement names: Float and
Integer are sealed, so Class >> ___subclass___: roots the class at a storage
class, AbstractPyFloat or AbstractPyInt.  The reuse test compared the
registered class's superclass with the NAMED parent, found them different on
every rebuild, and minted a new class -- leaving every stored instance, and
every stored member of a float- or int-mixin enum, on a class nothing named.

Each test loads tests/python/numeric_subclass_rebuild/v1.py, makes an instance
of each class, rewrites the module's file to v2.py and loads it again under the
same name: a rebuild, as an edit or an install makes one."
Class {
	#name : 'NumericSubclassRebuildTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'path',
		'snapshot',
		'before',
		'after',
		'stored'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
NumericSubclassRebuildTestCase >> assertKeeps: aName [
	"The class the module names after the rebuild is the one it named before,
	and the instance made before is an instance of it."

	| cls |
	cls := after @env1:___pyAttrLoad___: aName.
	self assert: (before @env1:___pyAttrLoad___: aName) == cls.
	self assert: (stored at: aName) class == cls

]

{ #category : 'Grail-Helpers' }
NumericSubclassRebuildTestCase >> assertKeepsMembers: aName [
	"The enum is the same class, and each member is the same object."

	| old new |
	old := before @env1:___pyAttrLoad___: aName.
	new := after @env1:___pyAttrLoad___: aName.
	self assert: old == new.
	(aName == #Size ifTrue: [#(#SMALL #LARGE)] ifFalse: [#(#LOW #HIGH)]) do: [:m |
		self assert: (stored at: aName , '.' , m) == (new @env1:___pyAttrLoad___: m)]

]

{ #category : 'Grail-Helpers' }
NumericSubclassRebuildTestCase >> call: aCallable [
	^ aCallable @env1:___pyCallValue___: #() kw: nil

]

{ #category : 'Grail-Helpers' }
NumericSubclassRebuildTestCase >> load: aRevision [
	"Write revision aRevision of the fixture to the module's file and load it."

	| f src |
	src := (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/numeric_subclass_rebuild/' , aRevision , '.py') contents.
	f := GsFile openWriteOnServer: path.
	f nextPutAll: src.
	f close.
	(importlib @env1:modules) removeKey: #'grail_numeric_subclass_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_numeric_subclass_rebuild'

]

{ #category : 'Grail-Setup' }
NumericSubclassRebuildTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp."
	path := '/tmp/grail_numeric_subclass_rebuild_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: 'grail_numeric_subclass_rebuild'.
	before := self load: 'v1'.
	"What an application would have stored before the rebuild."
	stored := Dictionary new.
	#(#(#PF 2.5) #(#PI 7) #(#BF 2.5) #(#BI 7) #(#PC 3) #(#PB 'b') #(#PT 'tu') #(#PFS 'fs') #(#PS 's')) do: [:pair | | arg |
		arg := pair last.
		(pair first == #PB) ifTrue: [arg := ByteArray withAll: #(98)].
		(pair first == #PT or: [pair first == #PFS]) ifTrue: [
			arg := (Python at: #tuple) withAll: #(1 2)].
		stored at: pair first
			put: ((before @env1:___pyAttrLoad___: pair first) @env1:___pyCallValue___: { arg } kw: nil)].
	#(#(#Size #SMALL) #(#Size #LARGE) #(#Rank #LOW) #(#Rank #HIGH)) do: [:pair |
		stored at: pair first , '.' , pair last
			put: ((before @env1:___pyAttrLoad___: pair first) @env1:___pyAttrLoad___: pair last)].
	after := self load: 'v2'

]

{ #category : 'Grail-Setup' }
NumericSubclassRebuildTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_numeric_subclass_rebuild' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_numeric_subclass_rebuild'.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil].
	before := after := stored := nil

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAClassBuiltByTypeOverFloatOrIntKeepsItsClass [
	"``BF = type('BF', (float,), ns)'': a built class's reuse (#1802) compares
	the superclass too, so it had the same gap."

	#(#BF #BI) do: [:n | self assertKeeps: n]

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAFloatMixinEnumKeepsItsClassAndMembers [
	"``class Size(float, Enum)'': the storage base is float's."

	self assertKeepsMembers: #Size

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAFloatSubclassKeepsItsClass [
	"``class PF(float)'', rooted at AbstractPyFloat."

	self assertKeeps: #PF

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAnIntMixinEnumKeepsItsClassAndMembers [
	"``class Rank(int, Enum)'': the storage base is int's."

	self assertKeepsMembers: #Rank

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAnIntSubclassKeepsItsClass [
	"``class PI(int)'', rooted at AbstractPyInt."

	self assertKeeps: #PI

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testARebuildRunsTheNewSource [
	"The control: the second load is a rebuild from v2, not a bind of v1."

	self assert: (after @env1:___pyAttrLoad___: #VERSION) equals: 2

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testAStoredInstanceRunsTheNewSource [
	"Keeping the class is what lets an instance made before the rebuild run the
	methods compiled by it."

	#(#PF #PI #BF #BI) do: [:n |
		self assert: (self call: ((stored at: n) @env1:___pyAttrLoad___: #version)) equals: 2]

]

{ #category : 'Grail-Tests' }
NumericSubclassRebuildTestCase >> testOtherImmutableBuiltinSubclassesKeepTheirClass [
	"The controls: complex, bytes, tuple, frozenset and str subclasses are rooted
	at the class the statement names, and kept their class before #1863 too."

	#(#PC #PB #PT #PFS #PS) do: [:n | self assertKeeps: n]

]
