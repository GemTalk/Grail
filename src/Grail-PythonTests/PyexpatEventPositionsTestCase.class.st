Class {
	#name : 'PyexpatEventPositionsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PyexpatEventPositionsTestCase >> testEveryEventReportsWhereItStarts [
	"Every check in the fixture agrees with expat: tags, text pieces, comments,
	PIs, CDATA, entity expansions, UTF-8 / UTF-16 / Latin-1 byte indexes, a BOM,
	CRLF, the position after Parse, and the position an error pins."

	| mod results expected b keys |
	importlib @env1:modules removeKey: #'pyexpat_event_positions' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pyexpat_event_positions.py')
		name: 'pyexpat_event_positions'.
	 results := mod @env1:___pyAttrLoad___: #'r'.
	 expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	 keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	 b := builtins @env1:instance.
	 self assert: (keys @env1:__len__) equals: 12.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'pyexpat_event_positions' ifAbsent: []]

]
