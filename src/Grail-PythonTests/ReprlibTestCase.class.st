Class {
	#name : 'ReprlibTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ReprlibTestCase >> loadFixture: fixtureName [
	"Same caching pattern as FlaskScaffoldingTestCase >> loadFixture:."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.' , fixtureName.
	mods := importlib @env1:modules.
	cached := mods at: fullName asSymbol ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	(mods includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/' , fixtureName , '.py')
		name: fullName

]

{ #category : 'Grail-Tests - reprlib' }
ReprlibTestCase >> testListTruncation [
	"More than maxlist elements collapse to a trailing ellipsis."

	| result |
	result := self eval: 'import reprlib
reprlib.repr([1, 2, 3, 4, 5, 6, 7, 8]) == "[1, 2, 3, 4, 5, 6, ...]"'.
	self assert: result

]

{ #category : 'Grail-Tests - reprlib' }
ReprlibTestCase >> testNestingDepthLimit [
	| result |
	result := self eval: 'import reprlib
r = reprlib.Repr()
r.maxlevel = 2
r.repr([[["deep"]]]) == "[[[...]]]"'.
	self assert: result

]

{ #category : 'Grail-Tests - reprlib' }
ReprlibTestCase >> testRecursiveRepr [
	"recursive_repr short-circuits self-referential __repr__ calls."

	| mod |
	mod := self loadFixture: 'reprlib_recursive'.
	self assert: mod @env1:recursive_result equals: 'Node(...)'

]

{ #category : 'Grail-Tests - reprlib' }
ReprlibTestCase >> testShortValuesUntouched [
	| result |
	result := self eval: 'import reprlib
reprlib.repr([1, 2]) == "[1, 2]" and reprlib.repr((1,)) == "(1,)"'.
	self assert: result

]

{ #category : 'Grail-Tests - reprlib' }
ReprlibTestCase >> testStringTruncation [
	| result |
	result := self eval: 'import reprlib
r = reprlib.Repr()
r.maxstring = 10
out = r.repr("abcdefghijklmnop")
len(out) == 10 and "..." in out'.
	self assert: result

]
