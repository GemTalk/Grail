"ClassBuildTextEmitter writes the class build exactly as ClassDefAst wrote it
inline before the ClassBuildEmitter interface existed.  These pin each
operation's spelling; the whole-corpus proof is the trace diff the change was
made under (GRAIL_CODEGEN_TRACE_DIR before and after, zero bytes changed)."
Class {
	#name : 'ClassBuildTextEmitterTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBuildTextEmitterTestCase >> ___lf___ [

	^ String with: Character lf

]

{ #category : 'Grail-Helpers' }
ClassBuildTextEmitterTestCase >> ___pythonAstSendersOf___: aSelector [
	"``Class>>selector'' for every env-0 method of a class in the PythonAst
	dictionary, either side, whose literal selectors include aSelector."

	| dict found |
	dict := System myUserProfile symbolList detect: [:d | d name == #PythonAst].
	found := Set new.
	dict do: [:v |
		v isBehavior ifTrue: [
			{v. v class} do: [:b |
				(b methodDictForEnv: 0) ifNotNil: [:md |
					md do: [:m |
						(m _selectorPool includes: aSelector) ifTrue: [
							found add: b name asString , '>>' , m selector asString]]]]]].
	^ found

]

{ #category : 'Grail-Helpers' }
ClassBuildTextEmitterTestCase >> ___textOf___: aOneArgBlock [
	"What aOneArgBlock writes through a text emitter on a fresh codegen stream."

	| s |
	s := PrettyWriteStream on: Unicode7 new.
	aOneArgBlock value: (ClassBuildTextEmitter on: s).
	^ s contents

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testACloseOfTheWrongKindIsRefused [
	"The open/close pairs are a stack, and a close must match its open: an
	unbalanced build fails at the emit rather than as a compile error in the
	generated text."

	self should: [
		self ___textOf___: [:e |
			e openValueBlock: #('X').
			e closeIfTrue]]
		raise: Error.
	self should: [
		self ___textOf___: [:e |
			e openIfTrue: [e var: 'X'].
			e assertDepth: 0]]
		raise: Error.
	self assert: (self ___textOf___: [:e |
			e openIfTrue: [e var: 'c'].
			e assertDepth: 1.
			e closeIfTrue.
			e assertDepth: 0])
		equals: 'c ifTrue: [' , self ___lf___ , '].' , self ___lf___

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testBlocksAndConditionals [

	| lf |
	lf := self ___lf___.
	self assert: (self ___textOf___: [:e |
			e openValueBlock: #('X' '___t_1').
			e statementWithoutNewline: [e assign: 'X' from: [e integer: 1]].
			e closeValueBlock])
		equals: '[| X ___t_1 | X := 1.] @env0:value.' , lf.
	self assert: (self ___textOf___: [:e |
			e openValueBlockLine: #('X').
			e closeValueBlockLine])
		equals: '[ | X |' , lf , ' ] @env0:value.' , lf.
	self assert: (self ___textOf___: [:e |
			e
				ifTrue: [e paren: [e send: #isBehavior env: 0 to: [e var: 'X']]]
				inline: [e send: #'___grailBindClassCell___' env: 1 to: [e var: 'X']]])
		equals: '(X @env0:isBehavior) ifTrue: [X @env1:___grailBindClassCell___].' , lf

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testCascadeAndBraces [

	self assert: (self ___textOf___: [:e |
			e cascadeTo: [e paren: [e send: #new env: 0 to: [e var: 'PyDict']]]
				sends: {
					{#'at:put:'. {[e string: 'x']. [e string: 'int']}. 0}.
					{#yourself. #(). 0}}])
		equals: '(PyDict @env0:new) @env0:at: ''x'' put: ''int''; @env0:yourself'.
	self assert: (self ___textOf___: [:e |
			e braceArray: {[e symbol: 'a']. [e symbol: 'b']}])
		equals: '{ #''a''. #''b'' }'.
	self assert: (self ___textOf___: [:e | e braceArray: #()]) equals: '{  }'.
	self assert: (self ___textOf___: [:e |
			e compactBraceArray: {[e compactBraceArray: {[e string: 'p']. [e string: 'q']}]}])
		equals: '{{''p''. ''q''}}'

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testDecoratorCallSpelling [
	"A decorator call at its own line: the keywords and the argument each
	start a line, so the text's line scan finds the decorator's position store
	(FunctionDefAst >> printDecoratorCallOn:line:receiver:argument:)."

	| lf tab |
	lf := self ___lf___.
	tab := String with: Character tab.
	self assert: (self ___textOf___: [:e |
			e sendOnNextLine: #'___pyCallValue___:kw:' env: 1 to: [e var: 'r']
				with: {[e braceArrayOnNextLine: {[e var: 'a']}]. [e nilLiteral]}])
		equals: 'r' , lf , tab , '@env1:___pyCallValue___: {' , lf , tab , 'a } kw: nil'.
	self assert: (self ___textOf___: [:e |
			e send: #'->' env: 0 to: [e paren: [e assign: '___curPos___' from: [e integer: 3]]]
				with: {[e var: 'x']}])
		equals: '(___curPos___ := 3) @env0:-> x'

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testLiteralBlocksAndInlineConditionals [

	| lf |
	lf := self ___lf___.
	self assert: (self ___textOf___: [:e | e block: [e var: 'x']]) equals: '[x]'.
	self assert: (self ___textOf___: [:e |
			e blockWithArgs: #('v') temps: #() do: [e assign: 'x' from: [e var: 'v']]])
		equals: '[:v | x := v]'.
	self assert: (self ___textOf___: [:e |
			e blockWithArgs: #('a' 'k') temps: #('d') do: [
				e statementWithoutNewline: [e assign: 'd' from: [e integer: 1]].
				e space.
				e var: 'd']])
		equals: '[:a :k | | d | d := 1. d]'.
	self assert: (self ___textOf___: [:e |
			e statementWithoutNewline: [e ifTrue: [e var: 'c'] do: [e var: 'x']]])
		equals: 'c ifTrue: [x].'.
	self assert: (self ___textOf___: [:e |
			e ifFalse: [e var: 'c'] do: [e var: 'x']])
		equals: 'c ifFalse: [x]'.
	self assert: (self ___textOf___: [:e |
			e statement: [
				e ifTrue: [e var: 'c']
					do: [e newline. e statement: [e var: 'x']]
					ifFalse: [e newline]]])
		equals: 'c ifTrue: [' , lf , 'x.' , lf , '] ifFalse: [' , lf , '].' , lf.
	self assert: (self ___textOf___: [:e |
			e terminatedBraceArray: {[e var: 'a']. [e var: 'b']}])
		equals: '{ a. b. }'

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testLiteralSpellings [

	self assert: (self ___textOf___: [:e | e string: 'it''s']) equals: '''it''''s'''.
	self assert: (self ___textOf___: [:e | e symbol: '__doc__']) equals: '#''__doc__'''.
	self assert: (self ___textOf___: [:e | e plainSymbol: 'withAll:']) equals: '#withAll:'.
	self assert: (self ___textOf___: [:e | e symbolArray: #('a' '_' 'b')]) equals: '#( a #''_'' b )'.
	self assert: (self ___textOf___: [:e | e symbolArray: #()]) equals: '#( )'.
	self assert: (self ___textOf___: [:e | e emptyArray]) equals: '#()'.
	self assert: (self ___textOf___: [:e | e symbolPairArray: #(#('a' 'b'))]) equals: '#( #( a b ) )'.
	self assert: (self ___textOf___: [:e | e quotedSymbolArray: #('a' 'b')]) equals: '#( #''a'' #''b'' )'.
	self assert: (self ___textOf___: [:e | e stringArray: #('a' 'b')]) equals: '#( ''a'' ''b'' )'.
	self assert: (self ___textOf___: [:e | e compactStringArray: #('T' 'U')]) equals: '#(''T'' ''U'' )'.
	self assert: (self ___textOf___: [:e | e boolean: false]) equals: 'false'.
	self assert: (self ___textOf___: [:e | e nilLiteral]) equals: 'nil'.
	self assert: (self ___textOf___: [:e | e curPos: 12]) equals: '___curPos___ := 12.' , self ___lf___

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testSends [

	self assert: (self ___textOf___: [:e |
			e send: #'___grailCompileSlotIndexTable___' env: nil to: [e var: 'X']])
		equals: 'X ___grailCompileSlotIndexTable___'.
	self assert: (self ___textOf___: [:e |
			e send: #'==' env: nil to: [e var: 'X'] with: {[e nilLiteral]}])
		equals: 'X == nil'.
	self assert: (self ___textOf___: [:e |
			e statement: [
				e send: #'___compileMethod:category:' env: nil
					to: [e send: #class env: 0 to: [e var: 'X']]
					with: {[e string: 'm']. [e string: 'Grail-Slots']}]])
		equals: 'X @env0:class ___compileMethod: ''m'' category: ''Grail-Slots''.' , self ___lf___.
	self assert: (self ___textOf___: [:e |
			e send: #'___classHolderAttrStore___:put:' env: 1 to: [e var: 'X']
				with: {[e symbol: '__hash__']. [e var: 'None']}])
		equals: 'X @env1:___classHolderAttrStore___: #''__hash__'' put: None'.
	self should: [
		self ___textOf___: [:e | e send: #'a:b:' env: nil to: [e var: 'X'] with: {[e integer: 1]}]]
		raise: Error

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testStringIndentedByStreamKeepsTheOldSpelling [
	"stringIndentedByStream: is emitStringLiteral:on:'s spelling, kept for the
	generated text's sake: a newline inside it IS indented, unlike string:'s."

	| s lf tab |
	lf := self ___lf___.
	tab := String with: Character tab.
	s := PrettyWriteStream on: Unicode7 new.
	s increaseIndent.
	(ClassBuildTextEmitter on: s) stringIndentedByStream: 'a' , lf , 'b''c'.
	self assert: s contents equals: '''a' , lf , tab , 'b''''c'''

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testStringLiteralIsNotIndented [
	"A method source carries its own newlines, and a class built inside an
	indented statement must not have the stream's indentation spliced into
	them: the literal is written in ONE piece."

	| s lf |
	lf := self ___lf___.
	s := PrettyWriteStream on: Unicode7 new.
	s increaseIndent.
	s lf.
	(ClassBuildTextEmitter on: s) statement: [
		(ClassBuildTextEmitter on: s) string: 'a' , lf , 'b'].
	self assert: s contents equals: lf , (String with: Character tab) , '''a' , lf , 'b''.' , lf

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testTheClassBuildWritesOnlyThroughTheEmitter [
	"Every helper the class build calls writes through the ClassBuildEmitter,
	and the ``unrouted:'' escape that handed them the text stream is gone
	(P3.1's second PR) -- so an IR backend can follow the whole build.  Pinned
	both ways: the protocol does not have it, and no method in the PythonAst
	dictionary sends it.  The control proves the scan sees a real send."

	| control |
	self deny: (ClassBuildEmitter canUnderstand: #unrouted:).
	self deny: (ClassBuildTextEmitter canUnderstand: #unrouted:).
	self assert: (self ___pythonAstSendersOf___: #unrouted:) isEmpty
		description: (self ___pythonAstSendersOf___: #unrouted:) asArray printString.
	control := self ___pythonAstSendersOf___: #'openValueBlockLine:'.
	self assert: (control includes: 'ClassDefAst>>emitNestedClass:on:')
		description: control asArray printString

]
