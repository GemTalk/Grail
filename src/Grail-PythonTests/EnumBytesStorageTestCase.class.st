"A ``bytes'' or ``bytearray'' mixin enum's member IS its bytes (#2133).

Driven by tests/python/enum_bytes_storage.py, whose expectations were measured
against CPython 3.14.  Both builders -- the class statement and the functional
API -- made the member with basicNew, so its indexed content was empty: every
member was b'', ``Raw.A == b''a'''' was False and members of two different
bytes enums compared equal.  The functional builder also never stored _value_.

The rebuild tests load the same fixture twice under one name, as an install
does, and check that the members are still the objects stored before AND still
carry their bytes: Enum class >> ___grailKeepPreviousMember:named:in: hands a
byte-format member's content across, which an empty member never exercised."
Class {
	#name : 'EnumBytesStorageTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'path',
		'snapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumBytesStorageTestCase >> assert: key is: expected [
	self assert: (self resultAt: key) asString equals: expected

]

{ #category : 'Grail-Private' }
EnumBytesStorageTestCase >> loadRebuildModule [
	"The fixture, from a per-user copy: several worktrees share one stone and /tmp."

	| f |
	f := GsFile openWriteOnServer: path.
	f nextPutAll: (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/enum_bytes_storage.py') contents.
	f close.
	(importlib @env1:modules) removeKey: #'grail_enum_bytes_rebuild' ifAbsent: [].
	^ importlib loadModuleFromPath: path name: 'grail_enum_bytes_rebuild'

]

{ #category : 'Grail-Private' }
EnumBytesStorageTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumBytesStorageTestCase >> setUp [
	"Reload tests/python/enum_bytes_storage.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_bytes_storage' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_bytes_storage.py')
		name: 'enum_bytes_storage'.
	path := '/tmp/grail_enum_bytes_rebuild_' , System myUserProfile userId asString , '.py'

]

{ #category : 'Grail-Setup' }
EnumBytesStorageTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_enum_bytes_rebuild' ifAbsent: [].
	snapshot ifNotNil: [:snap |
		self ___forgetCanonicalModule___: 'grail_enum_bytes_rebuild'.
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil]

]

{ #category : 'Grail-Tests - bytes' }
EnumBytesStorageTestCase >> testABytearrayMemberIsItsBytes [
	"``class Buf(bytearray, Enum)''.  Its _value_ is member_type(*args), a
	bytearray -- not the bytes literal the body wrote."

	self assert: 'ba_content' is: 'b''aa'''.
	self assert: 'ba_value' is: 'bytearray(b''aa'')'.
	self assert: 'ba_eq' is: '(True, False)'.
	self assert: 'ba_len' is: '2'.
	self assert: 'ba_isinstance' is: 'True'

]

{ #category : 'Grail-Tests - bytes' }
EnumBytesStorageTestCase >> testABytesMemberComparesAndHashesByContent [
	"Empty members compared equal to each other -- across two different enums
	-- and unequal to their own value."

	self assert: 'eq_value' is: 'True'.
	self assert: 'other_enum' is: 'False'.
	self assert: 'siblings' is: 'False'.
	self assert: 'hash' is: 'True'.
	self assert: 'dict_key' is: '2'

]

{ #category : 'Grail-Tests - bytes' }
EnumBytesStorageTestCase >> testABytesMemberIsItsBytes [
	"``class Raw(bytes, Enum): A = b''a''''.  Every member was b'' -- len 0,
	indexing raised IndexError -- while _value_ held the right bytes."

	self assert: 'content' is: 'b''a'''.
	self assert: 'len' is: '2'.
	self assert: 'index' is: '98'.
	self assert: 'iterate' is: '[98, 99]'.
	self assert: 'decode' is: 'bc'.
	self assert: 'value' is: 'b''a''/b''bc'''.
	self assert: 'repr' is: '<Raw.A: b''a''>'.
	self assert: 'lookup' is: '<Raw.B: b''bc''>'.
	self assert: 'isinstance' is: '(True, True)'

]

{ #category : 'Grail-Tests - functional API' }
EnumBytesStorageTestCase >> testAFunctionalBytesMemberIsItsBytes [
	"``Enum('Octet', {...}, type=bytes)'': empty content, and _value_ answered
	a bound method because the functional builder never stored it."

	self assert: 'fn_content' is: '(b''p'', b''qr'')'.
	self assert: 'fn_value' is: 'b''p''/b''qr'''.
	self assert: 'fn_eq' is: '(True, False, False)'.
	self assert: 'fn_len' is: '2'.
	self assert: 'fn_lookup' is: '<Octet.Q: b''qr''>'.
	self assert: 'fn_ba' is: 'b''pp''/bytearray(b''pp'')/True'.
	"The missing _value_ was every data-mixed functional enum's, not only bytes'."
	self assert: 'fn_sunders' is: '''p''/3/''Q'''

]

{ #category : 'Grail-Tests - rebuild' }
EnumBytesStorageTestCase >> testARebuildKeepsTheMembersAndTheirBytes [
	"A rebuild keeps each member object (#1957), and the member it keeps still
	has its bytes: the previous member takes the new one's content."

	| before after stored |
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: 'grail_enum_bytes_rebuild'.
	before := self loadRebuildModule.
	stored := Dictionary new.
	#(#(#Raw #A) #(#Raw #B) #(#Buf #A) #(#Octet #P) #(#Block #Q)) do: [:pair |
		stored at: pair first , '.' , pair last put: ((before @env1:___pyAttrLoad___: pair first)
			@env1:___pyAttrLoad___: pair last)].
	after := self loadRebuildModule.
	stored keysAndValuesDo: [:key :member | | names cls |
		names := key subStrings: '.'.
		cls := after @env1:___pyAttrLoad___: names first asSymbol.
		self assert: (before @env1:___pyAttrLoad___: names first asSymbol) == cls.
		self assert: (cls @env1:___pyAttrLoad___: names last asSymbol) == member].
	self assert: ((stored at: 'Raw.B') @env1:__repr__) asString equals: '<Raw.B: b''bc''>'.
	self assert: (((stored at: 'Raw.B') @env1:__len__)) equals: 2.
	self assert: (((stored at: 'Buf.A') @env1:__len__)) equals: 2.
	self assert: (((stored at: 'Octet.P') @env1:__len__)) equals: 1.
	self assert: (((stored at: 'Block.Q') @env1:__len__)) equals: 2

]

{ #category : 'Grail-Tests - bytes' }
EnumBytesStorageTestCase >> testAValueIsSpreadIntoTheBytesConstructor [
	"bytes(2) is two zero bytes, and bytes('hi', 'ascii') is b'hi' -- the
	member's content and its _value_ alike."

	self assert: 'spread' is: 'b''\x00\x00''/b''\x00\x00'''.
	self assert: 'spread_text' is: 'b''hi''/b''hi'''

]
