"An enum whose members are strings or bytes -- a StrEnum, a ``str'' mixin, a
``bytes'' or ``bytearray'' mixin -- keeps its member objects when its module is
rebuilt, by a class statement or by the functional API (#1974).

A rebuild by a LOAD -- an edit picked up by the next import, and every install
-- already kept them: a StrEnum's members are pointer-format, a mixin's are
byte-format, and Enum class >> ___grailKeepPreviousMember:named:in: hands either
kind's previous member the new state.  A rebuild by ``importlib.reload'' did
not run the body as a module body (importlib >> reload: never pushed it as the
initializing module), so a call that builds a class -- the functional API,
like type() and namedtuple -- had no module to key its class by, and minted a
new class with new members: every functional enum, a StrEnum among them.

Each test loads tests/python/strenum_rebuild/v1.py, keeps a member of each enum,
rewrites the module's file to v2.py and rebuilds it, by loading it again under
the same name or by reloading it."
Class {
	#name : 'StrEnumRebuildTestCase',
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
StrEnumRebuildTestCase >> assertKeepsMembers: aName [
	"The enum the module names after the rebuild is the one it named before, and
	each member kept before is the member of that name now."

	| new |
	new := after @env1:___pyAttrLoad___: aName.
	self assert: (before @env1:___pyAttrLoad___: aName) == new.
	(self memberNamesOf: aName) do: [:m |
		self assert: (stored at: aName , '.' , m) == (new @env1:___pyAttrLoad___: m)]

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> enumNames [
	^ #(#Mode #Step #Tone #Hue #Mix #Letter #Raw #Octet #Buf #Shape #Color)

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> load: aRevision [
	"Write revision aRevision of the fixture to the module's file and load it."

	self write: aRevision.
	(importlib @env1:modules) removeKey: #'grail_strenum_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_strenum_rebuild'

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> memberNamesOf: aName [
	^ ((Dictionary new)
		at: #Mode put: #(#READ #WRITE);
		at: #Step put: #(#FIRST #SECOND);
		at: #Tone put: #(#SOFT #LOUD);
		at: #Hue put: #(#WARM #COOL);
		at: #Mix put: #(#A #B);
		at: #Letter put: #(#P #Q);
		at: #Raw put: #(#A #B);
		at: #Octet put: #(#P #Q);
		at: #Buf put: #(#A #B);
		at: #Shape put: #(#CIRCLE #SQUARE);
		at: #Color put: #(#RED #GREEN);
		yourself) at: aName

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> rebuildByLoad [
	"A rebuild as an install, or the next import after an edit, makes one."

	after := self load: 'v2'

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> rebuildByReload [
	"A rebuild by ``importlib.reload(module)'', called from Python: the same
	module object, its body run again over the new source."

	| driver |
	(importlib @env1:modules) removeKey: #'use_reload' ifAbsent: [].
	driver := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/use_reload.py'
		name: 'use_reload'.
	self write: 'v2'.
	after := driver @env1:reload_mod: before

]

{ #category : 'Grail-Setup' }
StrEnumRebuildTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp."
	path := '/tmp/grail_strenum_rebuild_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: 'grail_strenum_rebuild'.
	before := self load: 'v1'.
	"What an application would have stored before the rebuild."
	stored := Dictionary new.
	self enumNames do: [:e | | cls |
		cls := before @env1:___pyAttrLoad___: e.
		(self memberNamesOf: e) do: [:m |
			stored at: e , '.' , m put: (cls @env1:___pyAttrLoad___: m)]]

]

{ #category : 'Grail-Setup' }
StrEnumRebuildTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_strenum_rebuild' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'use_reload' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_strenum_rebuild'.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil].
	before := after := stored := nil

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testABytearrayMixinKeepsItsMembersOnALoad [
	"``class Buf(bytearray, Enum)''."

	self rebuildByLoad.
	self assertKeepsMembers: #Buf

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testABytearrayMixinKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Buf

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testABytesMixinKeepsItsMembersOnALoad [
	"``class Raw(bytes, Enum)'': its members are byte-format."

	self rebuildByLoad.
	self assertKeepsMembers: #Raw

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testABytesMixinKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Raw

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAClassStatementEnumKeepsItsMembersOnAReload [
	"The control: ``class Color(Enum)''."

	self rebuildByReload.
	self assertKeepsMembers: #Color

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAClassStatementStrEnumKeepsItsMembersOnALoad [
	"``class Mode(StrEnum)'', and ``class Step(StrEnum)'' with auto() values."

	self rebuildByLoad.
	self assertKeepsMembers: #Mode.
	self assertKeepsMembers: #Step

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAClassStatementStrEnumKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Mode.
	self assertKeepsMembers: #Step

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalBytesEnumKeepsItsMembersOnALoad [
	"``Enum('Octet', [...], type=bytes)''."

	self rebuildByLoad.
	self assertKeepsMembers: #Octet

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalBytesEnumKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Octet

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalEnumKeepsItsMembersOnAReload [
	"The control: ``Enum('Shape', 'CIRCLE SQUARE')'', no strings in it."

	self rebuildByReload.
	self assertKeepsMembers: #Shape

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalStrEnumKeepsItsMembersOnALoad [
	"``StrEnum('Tone', 'SOFT LOUD')'', and ``StrEnum('Hue', [...])'' with values."

	self rebuildByLoad.
	self assertKeepsMembers: #Tone.
	self assertKeepsMembers: #Hue

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalStrEnumKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Tone.
	self assertKeepsMembers: #Hue

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalStrTypeEnumKeepsItsMembersOnALoad [
	"``Enum('Letter', [...], type=str)''."

	self rebuildByLoad.
	self assertKeepsMembers: #Letter

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAFunctionalStrTypeEnumKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Letter

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testARebuildRunsTheNewSource [
	"Both rebuilds run v2: Mode, its class kept, has v2's new member."

	#(#rebuildByLoad #rebuildByReload) do: [:how | | mode |
		self tearDown; setUp.
		self perform: how.
		self assert: (after @env1:___pyAttrLoad___: #VERSION) equals: 2.
		mode := after @env1:___pyAttrLoad___: #Mode.
		self assert: ((mode @env1:___pyAttrLoad___: #APPEND) @env1:___pyAttrLoad___: #value)
			equals: 'a'.
		self assert: (mode @env1:__len__) equals: 3]

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAStoredStrEnumMemberIsTheCurrentOneInPython [
	"The issue's own words, in Python: ``stored is Tone.SOFT'' after a reload,
	and a dict keyed by the stored members finds the current ones."

	| d |
	self rebuildByReload.
	d := (Python at: #PyDict) new.
	#(#Mode #Tone #Hue #Mix #Letter) do: [:e |
		d @env1:__setitem__: (stored at: e , '.' , (self memberNamesOf: e) first) _: e].
	#(#Mode #Tone #Hue #Mix #Letter) do: [:e | | current |
		current := (after @env1:___pyAttrLoad___: e) @env1:___pyAttrLoad___: (self memberNamesOf: e) first.
		self assert: (d @env1:__getitem__: current) equals: e.
		self assert: ((d @env1:keys) @env1:__contains__: current)]

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAStrMixinKeepsItsMembersOnALoad [
	"``class Mix(str, Enum)'': its members are byte-format."

	self rebuildByLoad.
	self assertKeepsMembers: #Mix

]

{ #category : 'Grail-Tests' }
StrEnumRebuildTestCase >> testAStrMixinKeepsItsMembersOnAReload [
	self rebuildByReload.
	self assertKeepsMembers: #Mix

]

{ #category : 'Grail-Helpers' }
StrEnumRebuildTestCase >> write: aRevision [
	"Write revision aRevision of the fixture to the module's file."

	| f src |
	src := (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/strenum_rebuild/' , aRevision , '.py') contents.
	f := GsFile openWriteOnServer: path.
	f nextPutAll: src.
	f close

]
