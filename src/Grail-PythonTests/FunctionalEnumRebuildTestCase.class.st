"An enum built with the FUNCTIONAL API -- ``Enum('Color', 'RED GREEN')'',
``IntEnum('Level', ...)'', with or without a mixin -- keeps its class and its
member objects when its module is rebuilt (#1950).

A class statement enum already did: importlib class >> ___canonicalSubclassOf:...
reuses its class, and Enum class >> ___grailKeepPreviousMember:named:in: its
members (c98331e8).  The functional builder, Enum class >> ___grailFunctional:...,
created its class with a bare ___subclass___:, so every rebuild -- and every
install is one -- minted a new class and new members, and left every stored
member on a class nothing named: ``stored is Color.GREEN'' false, and a dict
keyed by members no longer finding them.

Each test loads tests/python/functional_enum_rebuild/v1.py, keeps a member of
each enum, rewrites the module's file to v2.py and loads it again under the same
name: a rebuild, as an edit or an install makes one."
Class {
	#name : 'FunctionalEnumRebuildTestCase',
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
FunctionalEnumRebuildTestCase >> assertKeepsClass: aName [
	"The enum the module names after the rebuild is the one it named before, and
	each member kept before is an instance of it."

	| new |
	new := after @env1:___pyAttrLoad___: aName.
	self assert: (before @env1:___pyAttrLoad___: aName) == new.
	(self memberNamesOf: aName) do: [:m |
		self assert: (stored at: aName , '.' , m) class == new]

]

{ #category : 'Grail-Helpers' }
FunctionalEnumRebuildTestCase >> assertKeepsMembers: aName [
	"The enum is the same class, and each member is the same object."

	| new |
	self assertKeepsClass: aName.
	new := after @env1:___pyAttrLoad___: aName.
	(self memberNamesOf: aName) do: [:m |
		self assert: (stored at: aName , '.' , m) == (new @env1:___pyAttrLoad___: m)]

]

{ #category : 'Grail-Helpers' }
FunctionalEnumRebuildTestCase >> load: aRevision [
	"Write revision aRevision of the fixture to the module's file and load it."

	| f src |
	src := (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/functional_enum_rebuild/' , aRevision , '.py') contents.
	f := GsFile openWriteOnServer: path.
	f nextPutAll: src.
	f close.
	(importlib @env1:modules) removeKey: #'grail_functional_enum_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_functional_enum_rebuild'

]

{ #category : 'Grail-Helpers' }
FunctionalEnumRebuildTestCase >> memberNamesOf: aName [
	^ ((Dictionary new)
		at: #Color put: #(#RED #GREEN #BLUE);
		at: #Level put: #(#LOW #HIGH);
		at: #Perm put: #(#R #W #X);
		at: #Rank put: #(#LOW #HIGH);
		at: #Shade put: #(#DARK #LIGHT);
		at: #Grade put: #(#PASS #FAIL);
		at: #Tone put: #(#SOFT #LOUD);
		at: #Fruit put: #(#APPLE #PEAR);
		yourself) at: aName

]

{ #category : 'Grail-Setup' }
FunctionalEnumRebuildTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp."
	path := '/tmp/grail_functional_enum_rebuild_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: 'grail_functional_enum_rebuild'.
	before := self load: 'v1'.
	"What an application would have stored before the rebuild."
	stored := Dictionary new.
	#(#Color #Level #Perm #Rank #Shade #Grade #Tone #Fruit) do: [:e | | cls |
		cls := before @env1:___pyAttrLoad___: e.
		(self memberNamesOf: e) do: [:m |
			stored at: e , '.' , m put: (cls @env1:___pyAttrLoad___: m)]].
	after := self load: 'v2'

]

{ #category : 'Grail-Setup' }
FunctionalEnumRebuildTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_functional_enum_rebuild' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_functional_enum_rebuild'.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil].
	before := after := stored := nil

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAClassStatementEnumKeepsItsClassAndMembers [
	"The control: ``class Fruit(Enum)'' kept its class and members before #1950."

	self assertKeepsMembers: #Fruit

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAFlagKeepsItsClassAndMembers [
	"``Flag('Perm', 'R W X')''."

	self assertKeepsMembers: #Perm

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAFloatTypeMixinKeepsItsClassAndMembers [
	"``Enum('Shade', [...], type=float)'': rooted at float's storage class."

	self assertKeepsMembers: #Shade

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAnIntEnumKeepsItsClassAndMembers [
	"``IntEnum('Level', 'LOW HIGH')''."

	self assertKeepsMembers: #Level

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAnIntTypeMixinKeepsItsClassAndMembers [
	"``Enum('Rank', [...], type=int)'': rooted at int's storage class."

	self assertKeepsMembers: #Rank

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAPlainFunctionalEnumKeepsItsClassAndMembers [
	"``Enum('Color', 'RED GREEN BLUE')''."

	self assertKeepsMembers: #Color

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testARebuildRunsTheNewSource [
	"The rebuild is a rebuild from v2, not a bind of v1: Color, its class kept,
	has v2's new member as well as the old ones."

	| color |
	self assert: (after @env1:___pyAttrLoad___: #VERSION) equals: 2.
	color := after @env1:___pyAttrLoad___: #Color.
	self assert: ((color @env1:___pyAttrLoad___: #PURPLE) @env1:___pyAttrLoad___: #name)
		equals: 'PURPLE'.
	self assert: (color @env1:__len__) equals: 4

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAStoredMemberKeysADictTheRebuiltEnumFinds [
	"Members hash by identity, so a dict keyed by members made before the rebuild
	finds the members the module names after it only when they are the same."

	| d |
	d := (Python at: #PyDict) new.
	#(#Color #Level #Perm #Rank #Shade #Grade) do: [:e |
		d @env1:__setitem__: (stored at: e , '.' , (self memberNamesOf: e) first) _: e].
	#(#Color #Level #Perm #Rank #Shade #Grade) do: [:e |
		self assert: (d @env1:__contains__:
			((after @env1:___pyAttrLoad___: e) @env1:___pyAttrLoad___: (self memberNamesOf: e) first))]

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testAStrEnumKeepsItsClass [
	"``StrEnum('Tone', 'SOFT LOUD')''.  Its members are strings -- byte-format
	objects, which cannot take another member's state -- so, as for a class
	statement StrEnum (Enum class >> ___grailKeepPreviousMember:named:in:), the
	members are new; the class is kept."

	self assertKeepsClass: #Tone

]

{ #category : 'Grail-Tests' }
FunctionalEnumRebuildTestCase >> testCallingAMixinBaseKeepsItsClassAndMembers [
	"``IntBase('Grade', 'PASS FAIL')'', IntBase being ``class IntBase(int, Enum)''."

	self assertKeepsMembers: #Grade

]
