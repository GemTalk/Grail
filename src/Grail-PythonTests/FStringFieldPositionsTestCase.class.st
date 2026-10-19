Class {
	#name : 'FStringFieldPositionsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FStringFieldPositionsTestCase >> resultAt: key [
	^ ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key) asString

]

{ #category : 'Grail-Setup' }
FStringFieldPositionsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'fstring_field_positions' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/fstring_field_positions.py')
		name: 'fstring_field_positions'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testADecodedEscapeBeforeTheFieldDoesNotShiftIt [
	"THE CASE THAT DECIDES THE DESIGN.  Between fields the tokenizer DECODES
	escapes, so ``a\tb\n'' is 4 characters of token value over 6 of source: a
	value index no longer tracks a source offset.  Deriving the field's base
	from its value index afterwards would land 2 characters short here.  The
	anchor is recorded during the scan instead, from the live source position,
	so this is unaffected."

	self assert: (self resultAt: 'escaped_before') equals: '[49, 24, 30]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testAFieldContainingQuotesIsBlamedCorrectly [
	"Nested quotes are why the field is re-parsed by a child parser at all
	(PEP 701), so they must survive the rebase."

	self assert: (self resultAt: 'nested_quotes') equals: '[56, 28, 34]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testAFormatSpecDoesNotMoveTheField [
	"A format spec is scanned after the expression and must not disturb the
	expression's own span -- plain spec, and a spec that is itself a nested
	field (whose subtree stays excluded, needing two anchors composed)."

	self assert: (self resultAt: 'with_format_spec') equals: '[70, 18, 24]'.
	self assert: (self resultAt: 'nested_field_in_spec') equals: '[78, 18, 24]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testASimpleFieldIsBlamedOnItsExpression [
	"The base case, and the one the whole exercise is for: the span is
	``boom()'', not ``f'value is {boom()} ok'''.  Before the rebase this read
	[33, 15, 37] -- the literal."

	self assert: (self resultAt: 'simple') equals: '[33, 27, 33]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testDebugEqualsAndRawPrefixKeepTheirSpans [
	"``f'{expr=}''' truncates the expression text after parsing, and an ``rf''
	prefix changes escape handling -- neither may move the field's base."

	self assert: (self resultAt: 'debug_equals') equals: '[85, 18, 24]'.
	self assert: (self resultAt: 'raw_fstring') equals: '[92, 22, 28]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testImplicitConcatenationKeepsEachTokensOwnFields [
	"``f'one {1}' f'two {boom()}''' is TWO tokens, each with its own anchors --
	a single shared base would blame the first literal."

	self assert: (self resultAt: 'adjacent_concat') equals: '[63, 33, 39]'.

]

{ #category : 'Grail-Tests' }
FStringFieldPositionsTestCase >> testTheRightFieldOfSeveralIsBlamed [
	"Three fields on one line, so only the columns can say which raised --
	exactly the case the literal-wide span could not express."

	self assert: (self resultAt: 'two_fields') equals: '[40, 26, 32]'.

]
